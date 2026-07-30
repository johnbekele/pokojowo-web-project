"""Pokojowo infrastructure — Option A (Vercel rewrites → CloudFront → EC2).

- 1x EC2 t3.micro in default VPC, no SSH (SSM Session Manager only)
- Elastic IP attached
- CloudFront distribution using the free *.cloudfront.net cert
- Security group restricts inbound to CloudFront's origin-facing IPs only
- S3 bucket for uploads (block-public-access on)
- IAM role granting the instance SSM + CloudWatch Logs
"""

import json
import pulumi
import pulumi_aws as aws

# ---------------------------------------------------------------------------
# Naming
# ---------------------------------------------------------------------------
project = pulumi.get_project()
stack = pulumi.get_stack()
name = f"{project}-{stack}"

# ---------------------------------------------------------------------------
# Networking: use the default VPC / subnets to avoid NAT Gateway costs
# ---------------------------------------------------------------------------
default_vpc = aws.ec2.get_vpc(default=True)
default_subnets = aws.ec2.get_subnets(
    filters=[{"name": "vpc-id", "values": [default_vpc.id]}]
)

# CloudFront's managed prefix list of origin-facing IPs — restrict SG ingress
cloudfront_pl = aws.ec2.get_managed_prefix_list(
    name="com.amazonaws.global.cloudfront.origin-facing"
)

# ---------------------------------------------------------------------------
# Security group: only CloudFront can reach port 80 on the instance
# ---------------------------------------------------------------------------
sg = aws.ec2.SecurityGroup(
    f"{name}-sg",
    description="Allow HTTP from CloudFront only",
    vpc_id=default_vpc.id,
    ingress=[
        {
            "description": "HTTP from CloudFront origin-facing prefix list",
            "from_port": 80,
            "to_port": 80,
            "protocol": "tcp",
            "prefix_list_ids": [cloudfront_pl.id],
        },
        {
            "description": "Chat service HTTP from CloudFront origin-facing prefix list",
            "from_port": 81,
            "to_port": 81,
            "protocol": "tcp",
            "prefix_list_ids": [cloudfront_pl.id],
        },
    ],
    egress=[
        {
            "description": "All egress",
            "from_port": 0,
            "to_port": 0,
            "protocol": "-1",
            "cidr_blocks": ["0.0.0.0/0"],
        },
    ],
    tags={"Name": f"{name}-sg"},
)

# ---------------------------------------------------------------------------
# IAM: instance role for SSM Session Manager + CloudWatch Logs
# ---------------------------------------------------------------------------
ec2_assume_role = json.dumps(
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "ec2.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
)

ec2_role = aws.iam.Role(
    f"{name}-ec2-role",
    assume_role_policy=ec2_assume_role,
    tags={"Name": f"{name}-ec2-role"},
)

aws.iam.RolePolicyAttachment(
    f"{name}-ssm-core",
    role=ec2_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
)

aws.iam.RolePolicyAttachment(
    f"{name}-cw-agent",
    role=ec2_role.name,
    policy_arn="arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
)

# Allow the instance to pull images from ECR
aws.iam.RolePolicyAttachment(
    f"{name}-ecr-read",
    role=ec2_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
)

ec2_profile = aws.iam.InstanceProfile(
    f"{name}-ec2-profile",
    role=ec2_role.name,
)

# ---------------------------------------------------------------------------
# ECR: private repository for the backend image
# ---------------------------------------------------------------------------
backend_repo = aws.ecr.Repository(
    f"{name}-backend",
    name=f"{name}-backend",
    image_tag_mutability="MUTABLE",
    image_scanning_configuration={"scan_on_push": True},
    force_delete=True,
    tags={"Name": f"{name}-backend"},
)

chat_repo = aws.ecr.Repository(
    f"{name}-chat",
    name=f"{name}-chat",
    image_tag_mutability="MUTABLE",
    image_scanning_configuration={"scan_on_push": True},
    force_delete=True,
    tags={"Name": f"{name}-chat"},
)

# Keep only the 10 newest images to avoid unbounded storage cost
aws.ecr.LifecyclePolicy(
    f"{name}-backend-lifecycle",
    repository=backend_repo.name,
    policy=json.dumps(
        {
            "rules": [
                {
                    "rulePriority": 1,
                    "description": "Retain the 10 most recent images",
                    "selection": {
                        "tagStatus": "any",
                        "countType": "imageCountMoreThan",
                        "countNumber": 10,
                    },
                    "action": {"type": "expire"},
                }
            ]
        }
    ),
)

aws.ecr.LifecyclePolicy(
    f"{name}-chat-lifecycle",
    repository=chat_repo.name,
    policy=json.dumps(
        {
            "rules": [
                {
                    "rulePriority": 1,
                    "description": "Retain the 10 most recent images",
                    "selection": {
                        "tagStatus": "any",
                        "countType": "imageCountMoreThan",
                        "countNumber": 10,
                    },
                    "action": {"type": "expire"},
                }
            ]
        }
    ),
)

# ---------------------------------------------------------------------------
# S3 bucket for uploads / static assets
#
# Layout inside the bucket:
#   uploads/photo/*, uploads/listing/*  — publicly served through CloudFront
#                                        via OAC (the /uploads/* cache behavior
#                                        added further below).
#   private_uploads/verification/*      — never served by CloudFront; the backend
#                                        hands out short-lived presigned GETs.
# ---------------------------------------------------------------------------
uploads = aws.s3.BucketV2(f"{name}-uploads")

aws.s3.BucketPublicAccessBlock(
    f"{name}-uploads-pab",
    bucket=uploads.id,
    block_public_acls=True,
    block_public_policy=True,
    ignore_public_acls=True,
    restrict_public_buckets=True,
)

aws.s3.BucketServerSideEncryptionConfigurationV2(
    f"{name}-uploads-sse",
    bucket=uploads.id,
    rules=[
        {
            "apply_server_side_encryption_by_default": {"sse_algorithm": "AES256"},
        }
    ],
)

# Allow the EC2 instance role to read/write the uploads bucket (used for both
# deploy artifact staging and application uploads).
uploads_arn = uploads.arn
uploads_objects_arn = uploads.arn.apply(lambda a: f"{a}/*")

aws.iam.RolePolicy(
    f"{name}-ec2-uploads-access",
    role=ec2_role.id,
    policy=pulumi.Output.all(uploads_arn, uploads_objects_arn).apply(
        lambda args: json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "ListUploadsBucket",
                        "Effect": "Allow",
                        "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
                        "Resource": args[0],
                    },
                    {
                        "Sid": "RWUploadsObjects",
                        "Effect": "Allow",
                        "Action": [
                            "s3:GetObject",
                            "s3:PutObject",
                            "s3:DeleteObject",
                        ],
                        "Resource": args[1],
                    },
                ],
            }
        )
    ),
)

# ---------------------------------------------------------------------------
# EC2 instance
# ---------------------------------------------------------------------------
ami = aws.ec2.get_ami(
    most_recent=True,
    owners=["amazon"],
    filters=[
        {"name": "name", "values": ["al2023-ami-*-x86_64"]},
        {"name": "state", "values": ["available"]},
    ],
)

user_data = r"""#!/bin/bash
set -euxo pipefail
dnf update -y

# SSM Session Manager / RunCommand — required by the deploy script.
# AL2023 ships the agent preinstalled, but a `dnf update` can leave it
# stopped; install-or-noop and force enable+start so the instance always
# registers with SSM.
dnf install -y amazon-ssm-agent || true
systemctl enable --now amazon-ssm-agent

# Docker + compose
dnf install -y docker
systemctl enable --now docker
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL \
  https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# App workspace — your deploy pipeline drops compose.yaml + envs here
mkdir -p /opt/pokojowo
"""

instance = aws.ec2.Instance(
    f"{name}-app",
    ami=ami.id,
    instance_type="t3.micro",
    iam_instance_profile=ec2_profile.name,
    vpc_security_group_ids=[sg.id],
    subnet_id=default_subnets.ids[0],
    associate_public_ip_address=True,
    user_data=user_data,
    user_data_replace_on_change=True,
    root_block_device={
        "volume_size": 30,
        "volume_type": "gp3",
        "delete_on_termination": True,
        "encrypted": True,
    },
    metadata_options={
        "http_tokens": "required",  # IMDSv2 only
        "http_endpoint": "enabled",
    },
    tags={"Name": f"{name}-app"},
)

eip = aws.ec2.Eip(
    f"{name}-eip",
    domain="vpc",
    instance=instance.id,
    tags={"Name": f"{name}-eip"},
)

# ---------------------------------------------------------------------------
# CloudFront distribution — uses the free *.cloudfront.net cert
# ---------------------------------------------------------------------------
# AWS-managed policies:
#   CachingDisabled     4135ea2d-6df8-44a3-9df3-4b5a84be39ad
#   CachingOptimized    658327ea-f89d-4fab-a63d-7e88639e58f6
#   AllViewer           216adef6-5c7f-47e4-b989-5492eafa07d3
CACHE_POLICY_DISABLED = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
CACHE_POLICY_OPTIMIZED = "658327ea-f89d-4fab-a63d-7e88639e58f6"
ORIGIN_REQ_POLICY_ALL_VIEWER = "216adef6-5c7f-47e4-b989-5492eafa07d3"

# Origin Access Control lets CloudFront sign SigV4 requests to a private S3
# bucket. Replaces the legacy Origin Access Identity.
uploads_oac = aws.cloudfront.OriginAccessControl(
    f"{name}-uploads-oac",
    description=f"OAC for {name}-uploads",
    origin_access_control_origin_type="s3",
    signing_behavior="always",
    signing_protocol="sigv4",
)

distribution = aws.cloudfront.Distribution(
    f"{name}-cf",
    enabled=True,
    is_ipv6_enabled=True,
    comment=f"{name} backend",
    http_version="http2and3",
    price_class="PriceClass_100",  # NA + EU edges only — cheaper, still fast
    origins=[
        {
            "origin_id": "ec2-origin",
            # EIP.public_dns resolves to a stable AWS DNS name for the EIP
            "domain_name": eip.public_dns,
            "custom_origin_config": {
                "http_port": 80,
                "https_port": 443,
                "origin_protocol_policy": "http-only",
                "origin_ssl_protocols": ["TLSv1.2"],
                "origin_read_timeout": 60,
                "origin_keepalive_timeout": 30,
            },
        },
        {
            "origin_id": "ec2-chat-origin",
            "domain_name": eip.public_dns,
            "custom_origin_config": {
                "http_port": 81,
                "https_port": 443,
                "origin_protocol_policy": "http-only",
                "origin_ssl_protocols": ["TLSv1.2"],
                "origin_read_timeout": 60,
                "origin_keepalive_timeout": 30,
            },
        },
        {
            # S3 uploads bucket — only /uploads/* is routed here (see the
            # ordered_cache_behaviors below). Never exposes the
            # private_uploads/ prefix because the bucket policy scopes
            # GetObject to uploads/*.
            "origin_id": "s3-uploads",
            "domain_name": uploads.bucket_regional_domain_name,
            "origin_access_control_id": uploads_oac.id,
            # Empty custom_origin_config means CloudFront treats this as an
            # S3 origin. OAC replaces the deprecated s3_origin_config /
            # origin_access_identity flow.
        },
    ],
    default_cache_behavior={
        "target_origin_id": "ec2-origin",
        "viewer_protocol_policy": "redirect-to-https",
        "allowed_methods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
        "cached_methods": ["GET", "HEAD"],
        "compress": True,
        "cache_policy_id": CACHE_POLICY_DISABLED,
        "origin_request_policy_id": ORIGIN_REQ_POLICY_ALL_VIEWER,
    },
    ordered_cache_behaviors=[
        {
            "path_pattern": "/api/chat/*",
            "target_origin_id": "ec2-chat-origin",
            "viewer_protocol_policy": "redirect-to-https",
            "allowed_methods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "cached_methods": ["GET", "HEAD"],
            "compress": True,
            "cache_policy_id": CACHE_POLICY_DISABLED,
            "origin_request_policy_id": ORIGIN_REQ_POLICY_ALL_VIEWER,
        },
        {
            "path_pattern": "/api/messages/*",
            "target_origin_id": "ec2-chat-origin",
            "viewer_protocol_policy": "redirect-to-https",
            "allowed_methods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "cached_methods": ["GET", "HEAD"],
            "compress": True,
            "cache_policy_id": CACHE_POLICY_DISABLED,
            "origin_request_policy_id": ORIGIN_REQ_POLICY_ALL_VIEWER,
        },
        {
            "path_pattern": "/chat-socket.io/*",
            "target_origin_id": "ec2-chat-origin",
            "viewer_protocol_policy": "redirect-to-https",
            "allowed_methods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "cached_methods": ["GET", "HEAD"],
            "compress": True,
            "cache_policy_id": CACHE_POLICY_DISABLED,
            "origin_request_policy_id": ORIGIN_REQ_POLICY_ALL_VIEWER,
        },
        {
            # Public uploads (user photos, listing photos, scraper re-hosts)
            # are served straight from S3. UUID filenames + immutable
            # Cache-Control set by the backend mean CachingOptimized is safe.
            "path_pattern": "/uploads/*",
            "target_origin_id": "s3-uploads",
            "viewer_protocol_policy": "redirect-to-https",
            "allowed_methods": ["GET", "HEAD", "OPTIONS"],
            "cached_methods": ["GET", "HEAD"],
            "compress": True,
            "cache_policy_id": CACHE_POLICY_OPTIMIZED,
        },
    ],
    restrictions={
        "geo_restriction": {"restriction_type": "none"},
    },
    viewer_certificate={
        "cloudfront_default_certificate": True,
    },
    tags={"Name": f"{name}-cf"},
)

# Grant CloudFront (this distribution only) read on uploads/* — the
# private_uploads/ prefix is deliberately excluded so the backend remains
# the only way to reach verification documents (via presigned GETs).
aws.s3.BucketPolicy(
    f"{name}-uploads-cf-policy",
    bucket=uploads.id,
    policy=pulumi.Output.all(uploads.arn, distribution.arn).apply(
        lambda args: json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "AllowCloudFrontServicePrincipalReadPublicUploads",
                        "Effect": "Allow",
                        "Principal": {"Service": "cloudfront.amazonaws.com"},
                        "Action": "s3:GetObject",
                        "Resource": f"{args[0]}/uploads/*",
                        "Condition": {
                            "StringEquals": {"AWS:SourceArn": args[1]},
                        },
                    }
                ],
            }
        )
    ),
)

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
pulumi.export("ec2_public_ip", eip.public_ip)
pulumi.export("ec2_public_dns", eip.public_dns)
pulumi.export("ec2_instance_id", instance.id)
pulumi.export("cloudfront_domain", distribution.domain_name)
pulumi.export("cloudfront_url", distribution.domain_name.apply(lambda d: f"https://{d}"))
pulumi.export("cloudfront_distribution_arn", distribution.arn)
pulumi.export("uploads_bucket", uploads.bucket)
pulumi.export("uploads_bucket_arn", uploads.arn)
pulumi.export("backend_ecr_repo", backend_repo.repository_url)
pulumi.export("backend_ecr_name", backend_repo.name)
pulumi.export("chat_ecr_repo", chat_repo.repository_url)
pulumi.export("chat_ecr_name", chat_repo.name)
