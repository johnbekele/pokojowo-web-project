"""User reports for moderation."""
from datetime import datetime
from enum import Enum

import pymongo
from pymongo import IndexModel
from beanie import Document, Indexed
from pydantic import Field


class ReportReasonEnum(str, Enum):
    SPAM = "spam"
    SCAM = "scam"
    HARASSMENT = "harassment"
    FAKE_PROFILE = "fake_profile"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    OTHER = "other"


class ReportStatusEnum(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Report(Document):
    reporter_id: Indexed(str) = Field(..., alias="reporterId")
    reported_user_id: str = Field(..., alias="reportedUserId")
    reason: ReportReasonEnum
    details: str = ""
    status: ReportStatusEnum = ReportStatusEnum.OPEN
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    resolved_by: str = Field(None, alias="resolvedBy")
    resolved_at: datetime = Field(None, alias="resolvedAt")

    class Settings:
        name = "reports"
        indexes = [
            IndexModel([("reportedUserId", pymongo.ASCENDING), ("status", pymongo.ASCENDING)]),
            # One open report per reporter/reported pair
            IndexModel(
                [("reporterId", pymongo.ASCENDING), ("reportedUserId", pymongo.ASCENDING)],
                unique=True,
            ),
        ]

    class Config:
        populate_by_name = True
