#!/usr/bin/env bash
# Build the FastAPI backend image, push it to ECR, and roll it out on EC2
# via AWS Systems Manager (no SSH needed).
#
# Prerequisites:
#   - AWS credentials configured (env vars, profile, or SSO)
#   - `pulumi login` pointed at the S3 backend and PULUMI_CONFIG_PASSPHRASE set
#     (unless RESOLVE_TARGET_FROM_AWS=1 is used by CI)
#   - Docker running locally (with buildx / linux/amd64 support)
#   - `pulumi up` has been applied so ECR + IAM changes exist
#
# Usage:
#   ./scripts/build-and-push.sh                # build + push + deploy
#   TAG=v1.2.3 ./scripts/build-and-push.sh     # override image tag
#   SKIP_DEPLOY=1 ./scripts/build-and-push.sh  # push only, no EC2 rollout
#   BACKEND_CONTEXT=/path/to/pokojowo-fastapi ./scripts/build-and-push.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${INFRA_DIR}/.." && pwd)"

BACKEND_CONTEXT="${BACKEND_CONTEXT:-${REPO_ROOT}/pokojowo-fastapi}"
BACKEND_DOCKERFILE="${BACKEND_DOCKERFILE:-${BACKEND_CONTEXT}/Dockerfile}"
CHAT_CONTEXT="${CHAT_CONTEXT:-${REPO_ROOT}/pokojowo-chat}"
CHAT_DOCKERFILE="${CHAT_DOCKERFILE:-${CHAT_CONTEXT}/Dockerfile}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-${BACKEND_CONTEXT}/.env.production}"
CHAT_ENV_FILE="${CHAT_ENV_FILE:-${CHAT_CONTEXT}/.env.production}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
PUSH_LATEST="${PUSH_LATEST:-1}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { printf '\033[1;36m[build-and-push]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[build-and-push]\033[0m %s\n' "$*" >&2; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require aws
require docker
require jq

AWS_REGION="${AWS_REGION:-us-east-1}"

resolve_unique() {
  local label="$1"
  shift
  local values=("$@")
  if [[ "${#values[@]}" -ne 1 || -z "${values[0]}" ]]; then
    die "expected exactly one ${label}; found ${#values[@]}. Set the corresponding target variable explicitly."
  fi
  printf '%s' "${values[0]}"
}

discover_aws_target() {
  log "resolving deployment target from AWS (Pulumi state is not required)..."

  local -a backend_repos chat_repos instances buckets distributions
  while IFS= read -r value; do [[ -n "${value}" ]] && backend_repos+=("${value}"); done < <(
    aws ecr describe-repositories --region "${AWS_REGION}" --output json \
      | jq -r '.repositories[] | select(.repositoryName | endswith("-backend")) | .repositoryUri'
  )
  while IFS= read -r value; do [[ -n "${value}" ]] && chat_repos+=("${value}"); done < <(
    aws ecr describe-repositories --region "${AWS_REGION}" --output json \
      | jq -r '.repositories[] | select(.repositoryName | endswith("-chat")) | .repositoryUri'
  )
  while IFS= read -r value; do [[ -n "${value}" ]] && instances+=("${value}"); done < <(
    aws ec2 describe-instances --region "${AWS_REGION}" \
      --filters 'Name=tag:Name,Values=*-app' 'Name=instance-state-name,Values=running' \
      --output json \
      | jq -r '.Reservations[].Instances[].InstanceId'
  )
  while IFS= read -r value; do [[ -n "${value}" ]] && buckets+=("${value}"); done < <(
    aws s3api list-buckets --output json \
      | jq -r '.Buckets[] | select(.Name | contains("-uploads-")) | .Name'
  )
  while IFS= read -r value; do [[ -n "${value}" ]] && distributions+=("${value}"); done < <(
    aws cloudfront list-distributions --output json \
      | jq -r '.DistributionList.Items[] | select(.Enabled == true) | .DomainName'
  )

  ECR_REPO_URL="${ECR_REPO_URL:-$(resolve_unique 'backend ECR repository' "${backend_repos[@]}")}"
  CHAT_ECR_REPO_URL="${CHAT_ECR_REPO_URL:-$(resolve_unique 'chat ECR repository' "${chat_repos[@]}")}"
  EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-$(resolve_unique 'running application EC2 instance' "${instances[@]}")}"
  UPLOADS_BUCKET="${UPLOADS_BUCKET:-$(resolve_unique 'uploads bucket' "${buckets[@]}")}"
  CLOUDFRONT_URL="${CLOUDFRONT_URL:-https://$(resolve_unique 'enabled CloudFront distribution' "${distributions[@]}")}"
}

# ---------------------------------------------------------------------------
# Read outputs from the Pulumi stack
# ---------------------------------------------------------------------------
if [[ "${RESOLVE_TARGET_FROM_AWS:-0}" == "1" ]]; then
  discover_aws_target
else
  require pulumi
  log "reading pulumi stack outputs..."
  pushd "${INFRA_DIR}" >/dev/null

  ECR_REPO_URL="${ECR_REPO_URL:-$(pulumi stack output backend_ecr_repo)}"
  CHAT_ECR_REPO_URL="${CHAT_ECR_REPO_URL:-$(pulumi stack output chat_ecr_repo)}"
  EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-$(pulumi stack output ec2_instance_id)}"
  CLOUDFRONT_URL="${CLOUDFRONT_URL:-$(pulumi stack output cloudfront_url)}"
  UPLOADS_BUCKET="${UPLOADS_BUCKET:-$(pulumi stack output uploads_bucket)}"

  popd >/dev/null
fi

[[ -n "${ECR_REPO_URL}" ]] || die "backend_ecr_repo output is empty — run 'pulumi up' first"
[[ -n "${CHAT_ECR_REPO_URL}" ]] || die "chat_ecr_repo output is empty — run 'pulumi up' first"
[[ -n "${EC2_INSTANCE_ID}" ]] || die "ec2_instance_id output is empty"

AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# ---------------------------------------------------------------------------
# Image tag: use git SHA if in a git repo, else timestamp
# ---------------------------------------------------------------------------
if [[ -z "${TAG:-}" ]]; then
  if git -C "${BACKEND_CONTEXT}" rev-parse --short HEAD >/dev/null 2>&1; then
    TAG="$(git -C "${BACKEND_CONTEXT}" rev-parse --short HEAD)"
    if ! git -C "${BACKEND_CONTEXT}" diff --quiet 2>/dev/null; then
      TAG="${TAG}-dirty"
    fi
  else
    TAG="$(date -u +%Y%m%d%H%M%S)"
  fi
fi

[[ "${TAG}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] \
  || die "TAG must contain only letters, numbers, '.', '_' or '-' and be at most 128 characters"

IMAGE_URI="${ECR_REPO_URL}:${TAG}"
IMAGE_URI_LATEST="${ECR_REPO_URL}:latest"
CHAT_IMAGE_URI="${CHAT_ECR_REPO_URL}:${TAG}"
CHAT_IMAGE_URI_LATEST="${CHAT_ECR_REPO_URL}:latest"

write_target_file() {
  if [[ -n "${TARGET_OUTPUT_FILE:-}" ]]; then
    umask 077
    {
      printf 'ECR_REPO_URL=%q\n' "${ECR_REPO_URL}"
      printf 'CHAT_ECR_REPO_URL=%q\n' "${CHAT_ECR_REPO_URL}"
      printf 'EC2_INSTANCE_ID=%q\n' "${EC2_INSTANCE_ID}"
      printf 'CLOUDFRONT_URL=%q\n' "${CLOUDFRONT_URL}"
      printf 'UPLOADS_BUCKET=%q\n' "${UPLOADS_BUCKET}"
      printf 'IMAGE_URI=%q\n' "${IMAGE_URI}"
      printf 'CHAT_IMAGE_URI=%q\n' "${CHAT_IMAGE_URI}"
    } > "${TARGET_OUTPUT_FILE}"
  fi
}

log "target repo:    ${ECR_REPO_URL}"
log "chat repo:      ${CHAT_ECR_REPO_URL}"
log "target tag:     ${TAG}"
log "ec2 instance:   ${EC2_INSTANCE_ID}"
log "cloudfront:     ${CLOUDFRONT_URL}"
write_target_file

if [[ "${TARGET_ONLY:-0}" == "1" ]]; then
  log "TARGET_ONLY=1 — stopping after target resolution"
  exit 0
fi

# ---------------------------------------------------------------------------
# Docker login to ECR
# ---------------------------------------------------------------------------
log "authenticating docker with ECR (${ECR_REGISTRY})..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}" >/dev/null

# ---------------------------------------------------------------------------
# Build & push (linux/amd64 to match the t3.micro on x86_64)
# ---------------------------------------------------------------------------
[[ -f "${BACKEND_DOCKERFILE}" ]] || die "missing Dockerfile at ${BACKEND_DOCKERFILE}"

log "building image (linux/amd64) from ${BACKEND_CONTEXT}..."
BACKEND_TAG_ARGS=(--tag "${IMAGE_URI}")
if [[ "${PUSH_LATEST}" == "1" ]]; then
  BACKEND_TAG_ARGS+=(--tag "${IMAGE_URI_LATEST}")
fi
docker buildx build \
  --platform linux/amd64 \
  --file "${BACKEND_DOCKERFILE}" \
  "${BACKEND_TAG_ARGS[@]}" \
  --push \
  "${BACKEND_CONTEXT}"

log "pushed:"
log "  - ${IMAGE_URI}"
if [[ "${PUSH_LATEST}" == "1" ]]; then
  log "  - ${IMAGE_URI_LATEST}"
fi

[[ -f "${CHAT_DOCKERFILE}" ]] || die "missing Dockerfile at ${CHAT_DOCKERFILE}"

log "building chat image (linux/amd64) from ${CHAT_CONTEXT}..."
CHAT_TAG_ARGS=(--tag "${CHAT_IMAGE_URI}")
if [[ "${PUSH_LATEST}" == "1" ]]; then
  CHAT_TAG_ARGS+=(--tag "${CHAT_IMAGE_URI_LATEST}")
fi
docker buildx build \
  --platform linux/amd64 \
  --file "${CHAT_DOCKERFILE}" \
  "${CHAT_TAG_ARGS[@]}" \
  --push \
  "${CHAT_CONTEXT}"

log "pushed:"
log "  - ${CHAT_IMAGE_URI}"
if [[ "${PUSH_LATEST}" == "1" ]]; then
  log "  - ${CHAT_IMAGE_URI_LATEST}"
fi

if [[ "${SKIP_DEPLOY:-0}" == "1" ]]; then
  log "SKIP_DEPLOY=1 — stopping before EC2 rollout"
  log ""
  log "vercel env variable value:"
  log "  ${CLOUDFRONT_URL}"
  exit 0
fi

# ---------------------------------------------------------------------------
# Stage compose file + backend env on S3 (uploads bucket) so the EC2 host can
# fetch them via its instance-profile creds (no SSH, no scp).
# ---------------------------------------------------------------------------
[[ -f "${COMPOSE_FILE}" ]] || die "missing compose file at ${COMPOSE_FILE}"

STAGE_PREFIX="deploy/$(date -u +%Y%m%dT%H%M%SZ)-${TAG}"
S3_COMPOSE="s3://${UPLOADS_BUCKET}/${STAGE_PREFIX}/docker-compose.prod.yml"
S3_BACKEND_ENV="s3://${UPLOADS_BUCKET}/${STAGE_PREFIX}/backend.env"
S3_CHAT_ENV="s3://${UPLOADS_BUCKET}/${STAGE_PREFIX}/chat.env"
S3_HOST_ENV="s3://${UPLOADS_BUCKET}/${STAGE_PREFIX}/.env"

log "staging deploy artifacts to s3://${UPLOADS_BUCKET}/${STAGE_PREFIX}/ ..."

aws s3 cp "${COMPOSE_FILE}" "${S3_COMPOSE}" --region "${AWS_REGION}" >/dev/null

HAS_BACKEND_ENV=0
if [[ -f "${BACKEND_ENV_FILE}" ]]; then
  HAS_BACKEND_ENV=1
  aws s3 cp "${BACKEND_ENV_FILE}" "${S3_BACKEND_ENV}" --region "${AWS_REGION}" >/dev/null
  log "uploaded backend env from ${BACKEND_ENV_FILE}"
else
  log "no ${BACKEND_ENV_FILE} found — preserving the existing remote backend.env"
fi

HAS_CHAT_ENV=0
if [[ -f "${CHAT_ENV_FILE}" ]]; then
  HAS_CHAT_ENV=1
  aws s3 cp "${CHAT_ENV_FILE}" "${S3_CHAT_ENV}" --region "${AWS_REGION}" >/dev/null
  log "uploaded chat env from ${CHAT_ENV_FILE}"
else
  log "no ${CHAT_ENV_FILE} found — preserving the existing remote chat.env"
fi

# .env consumed by `docker compose` for ${BACKEND_IMAGE} substitution
TMP_HOST_ENV="$(mktemp)"
cat > "${TMP_HOST_ENV}" <<EOF
BACKEND_IMAGE=${IMAGE_URI}
CHAT_IMAGE=${CHAT_IMAGE_URI}
EOF
aws s3 cp "${TMP_HOST_ENV}" "${S3_HOST_ENV}" --region "${AWS_REGION}" >/dev/null
rm -f "${TMP_HOST_ENV}"

# ---------------------------------------------------------------------------
# Trigger the deploy on EC2 via SSM RunCommand
# ---------------------------------------------------------------------------
log "sending SSM deploy command to ${EC2_INSTANCE_ID}..."

REMOTE_SCRIPT=$(cat <<REMOTE
set -euxo pipefail
cd /opt/pokojowo

# Keep the last known-good deployment so a failed health gate can roll back.
BACKUP_DIR=".deploy-backup-${TAG}"
mkdir -p "\${BACKUP_DIR}"
for file in docker-compose.prod.yml .env backend.env chat.env; do
  if [[ -f "\${file}" ]]; then cp -p "\${file}" "\${BACKUP_DIR}/\${file}"; fi
done

aws s3 cp ${S3_COMPOSE} ./docker-compose.prod.yml
if [[ "${HAS_BACKEND_ENV}" == "1" ]]; then aws s3 cp ${S3_BACKEND_ENV} ./backend.env; fi
if [[ "${HAS_CHAT_ENV}" == "1" ]]; then aws s3 cp ${S3_CHAT_ENV} ./chat.env; fi
aws s3 cp ${S3_HOST_ENV} ./.env

aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin ${ECR_REGISTRY}

rollback() {
  echo "restoring the previous deployment" >&2
  if [[ -f "\${BACKUP_DIR}/docker-compose.prod.yml" && -f "\${BACKUP_DIR}/.env" ]]; then
    cp -p "\${BACKUP_DIR}/docker-compose.prod.yml" ./docker-compose.prod.yml
    cp -p "\${BACKUP_DIR}/.env" ./.env
    if [[ -f "\${BACKUP_DIR}/backend.env" ]]; then cp -p "\${BACKUP_DIR}/backend.env" ./backend.env; fi
    if [[ -f "\${BACKUP_DIR}/chat.env" ]]; then cp -p "\${BACKUP_DIR}/chat.env" ./chat.env; fi
    docker compose -f docker-compose.prod.yml --env-file .env up -d --remove-orphans || true
  else
    echo "no complete previous deployment found; leaving the failed rollout stopped" >&2
  fi
}

if ! docker compose -f docker-compose.prod.yml --env-file .env pull \
  || ! docker compose -f docker-compose.prod.yml --env-file .env up -d --remove-orphans; then
  rollback
  exit 1
fi

wait_for_health() {
  local url="\$1"
  local attempts=0
  until curl --fail --silent --show-error "\${url}" >/dev/null; do
    attempts=\$((attempts + 1))
    # Chat waits for its MongoDB connection during startup; allow up to
    # three minutes while keeping the rollout bounded and cancellable.
    if [[ "\${attempts}" -ge 90 ]]; then return 1; fi
    sleep 2
  done
}

# Compose publishes the container ports on the host as 80 (backend) and
# 8081 (chat); the container-only healthcheck ports are 10000/10002.
if ! wait_for_health http://127.0.0.1:80/health || ! wait_for_health http://127.0.0.1:8081/health; then
  echo "deployment health check failed; restoring the previous deployment" >&2
  docker compose -f docker-compose.prod.yml --env-file .env ps -a || true
  rollback
  exit 1
fi

docker image prune -f
REMOTE
)

# Build a proper JSON parameters payload and pass via file so multi-line
# script newlines are preserved (using `commands=[...]` shorthand collapses
# the script into one line where \n escapes are not expanded on the host).
TMP_SSM_PARAMS="$(mktemp)"
trap 'rm -f "${TMP_SSM_PARAMS}"' EXIT
jq -n --arg script "${REMOTE_SCRIPT}" '{commands: [$script]}' > "${TMP_SSM_PARAMS}"

CMD_ID="$(aws ssm send-command \
  --region "${AWS_REGION}" \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --comment "pokojowo deploy ${TAG}" \
  --parameters "file://${TMP_SSM_PARAMS}" \
  --query 'Command.CommandId' \
  --output text)"

log "ssm command id: ${CMD_ID}"
log "waiting for command to finish..."

# Poll until the invocation reaches a terminal state
while true; do
  STATUS="$(aws ssm get-command-invocation \
    --region "${AWS_REGION}" \
    --command-id "${CMD_ID}" \
    --instance-id "${EC2_INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo Pending)"
  case "${STATUS}" in
    Success)  log "deploy succeeded"; break ;;
    Cancelled|TimedOut|Failed|Cancelling)
      aws ssm get-command-invocation \
        --region "${AWS_REGION}" \
        --command-id "${CMD_ID}" \
        --instance-id "${EC2_INSTANCE_ID}" \
        --output json || true
      die "deploy ended with status ${STATUS}"
      ;;
  esac
  sleep 5
done

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
log ""
log "==============================================="
log "  Vercel env variable value:"
log "    ${CLOUDFRONT_URL}"
log "==============================================="
