#!/usr/bin/env bash
# Build the FastAPI backend image, push it to ECR, and roll it out on EC2
# via AWS Systems Manager (no SSH needed).
#
# Prerequisites:
#   - AWS credentials configured (env vars, profile, or SSO)
#   - `pulumi login` pointed at the S3 backend and PULUMI_CONFIG_PASSPHRASE set
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
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-${BACKEND_CONTEXT}/.env.production}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"

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
require pulumi

# ---------------------------------------------------------------------------
# Read outputs from the Pulumi stack
# ---------------------------------------------------------------------------
log "reading pulumi stack outputs..."
pushd "${INFRA_DIR}" >/dev/null

ECR_REPO_URL="$(pulumi stack output backend_ecr_repo)"
EC2_INSTANCE_ID="$(pulumi stack output ec2_instance_id)"
CLOUDFRONT_URL="$(pulumi stack output cloudfront_url)"
UPLOADS_BUCKET="$(pulumi stack output uploads_bucket)"

popd >/dev/null

[[ -n "${ECR_REPO_URL}" ]] || die "backend_ecr_repo output is empty — run 'pulumi up' first"
[[ -n "${EC2_INSTANCE_ID}" ]] || die "ec2_instance_id output is empty"

AWS_REGION="${AWS_REGION:-us-east-1}"
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

IMAGE_URI="${ECR_REPO_URL}:${TAG}"
IMAGE_URI_LATEST="${ECR_REPO_URL}:latest"

log "target repo:    ${ECR_REPO_URL}"
log "target tag:     ${TAG}"
log "ec2 instance:   ${EC2_INSTANCE_ID}"
log "cloudfront:     ${CLOUDFRONT_URL}"

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
docker buildx build \
  --platform linux/amd64 \
  --file "${BACKEND_DOCKERFILE}" \
  --tag "${IMAGE_URI}" \
  --tag "${IMAGE_URI_LATEST}" \
  --push \
  "${BACKEND_CONTEXT}"

log "pushed:"
log "  - ${IMAGE_URI}"
log "  - ${IMAGE_URI_LATEST}"

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
S3_HOST_ENV="s3://${UPLOADS_BUCKET}/${STAGE_PREFIX}/.env"

log "staging deploy artifacts to s3://${UPLOADS_BUCKET}/${STAGE_PREFIX}/ ..."

aws s3 cp "${COMPOSE_FILE}" "${S3_COMPOSE}" --region "${AWS_REGION}" >/dev/null

if [[ -f "${BACKEND_ENV_FILE}" ]]; then
  aws s3 cp "${BACKEND_ENV_FILE}" "${S3_BACKEND_ENV}" --region "${AWS_REGION}" >/dev/null
  log "uploaded backend env from ${BACKEND_ENV_FILE}"
else
  log "no ${BACKEND_ENV_FILE} found — writing empty backend.env (create one for real secrets)"
  TMP_EMPTY_ENV="$(mktemp)"
  : > "${TMP_EMPTY_ENV}"
  aws s3 cp "${TMP_EMPTY_ENV}" "${S3_BACKEND_ENV}" --region "${AWS_REGION}" >/dev/null
  rm -f "${TMP_EMPTY_ENV}"
fi

# .env consumed by `docker compose` for ${BACKEND_IMAGE} substitution
TMP_HOST_ENV="$(mktemp)"
cat > "${TMP_HOST_ENV}" <<EOF
BACKEND_IMAGE=${IMAGE_URI}
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

aws s3 cp ${S3_COMPOSE} ./docker-compose.prod.yml
aws s3 cp ${S3_BACKEND_ENV} ./backend.env
aws s3 cp ${S3_HOST_ENV} ./.env

aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin ${ECR_REGISTRY}

docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --remove-orphans
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
