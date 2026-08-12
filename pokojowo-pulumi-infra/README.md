# pokojowo-pulumi-infra

Pulumi (Python) using a **self-managed S3 backend** — no Pulumi Cloud.

## State backend

- Bucket: `s3://pokojowo-pulumi-state-491919375429` (us-east-1)
- Versioning: enabled
- Encryption: SSE-S3 (AES256)
- Public access: fully blocked
- Locking: Pulumi's native S3 object locking (no DynamoDB needed)

## One-time setup on a new machine

```bash
# 1. AWS creds must resolve (env vars, profile, or SSO)
aws sts get-caller-identity

# 2. Point Pulumi at the S3 backend
pulumi login "s3://pokojowo-pulumi-state-491919375429?region=us-east-1"

# 3. Set the secrets passphrase used by the self-managed backend
export PULUMI_CONFIG_PASSPHRASE="<pick-and-remember-this>"

# 4. Create a venv and install deps
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Usage

```bash
# First time only — create the stack in the S3 backend
pulumi stack init dev

# Regular workflow
pulumi stack select dev
pulumi preview
pulumi up
```

## GitHub Actions deployment

`.github/workflows/production-deploy.yml` builds and deploys both the backend
and chat images after a successful `CI` run on `main`. It can also be started
manually from the `main` branch. The workflow uses the repository secrets
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, discovers the existing ECR,
EC2, S3, and CloudFront resources through AWS, and tags images with the tested
commit SHA. It does not require the Pulumi passphrase in GitHub Actions.

The SSM rollout pulls both immutable images, runs the versioned MongoDB
migration runner from the backend image, and only then replaces the live
containers. A failed migration or health gate restores the previous
Compose/image configuration. Migrations are recorded in the `_schema_migrations`
collection and guarded by a lease so retries are safe. A second health gate
verifies the backend through CloudFront. When production environment files are
not present in the checkout (the normal CI case), the deploy preserves the
environment files already on the EC2 host.

## Notes

- The passphrase (`PULUMI_CONFIG_PASSPHRASE`) is required for every command
  because the self-managed backend encrypts secrets locally. Store it in a
  password manager — losing it means losing access to encrypted stack config.
- To use a per-stack KMS key instead of a passphrase, run
  `pulumi stack init dev --secrets-provider="awskms://alias/<key>?region=us-east-1"`.
