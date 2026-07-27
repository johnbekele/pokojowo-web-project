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

## Notes

- The passphrase (`PULUMI_CONFIG_PASSPHRASE`) is required for every command
  because the self-managed backend encrypts secrets locally. Store it in a
  password manager — losing it means losing access to encrypted stack config.
- To use a per-stack KMS key instead of a passphrase, run
  `pulumi stack init dev --secrets-provider="awskms://alias/<key>?region=us-east-1"`.
