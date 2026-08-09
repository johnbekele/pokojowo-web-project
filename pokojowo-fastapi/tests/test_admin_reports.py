"""Admin reports should enrich users with one batched lookup."""

from datetime import datetime
from types import SimpleNamespace

from bson import ObjectId

from app.api.v1.endpoints import admin
from app.models.report import ReportReasonEnum, ReportStatusEnum


class _ReportQuery:
    def __init__(self, reports):
        self.reports = reports

    def sort(self, _key):
        return self

    async def to_list(self, length=None):
        return self.reports[:length] if length else list(self.reports)


class _UserQuery:
    def __init__(self, users):
        self.users = users

    async def to_list(self):
        return self.users


def test_reports_fetch_all_report_users_in_one_query(monkeypatch):
    reporter_id = ObjectId()
    reported_id = ObjectId()
    reports = [
        SimpleNamespace(
            id=ObjectId(),
            reporter_id=str(reporter_id),
            reported_user_id=str(reported_id),
            reason=ReportReasonEnum.SPAM,
            details="duplicate",
            status=ReportStatusEnum.OPEN,
            created_at=datetime(2026, 1, 1),
        ),
        SimpleNamespace(
            id=ObjectId(),
            reporter_id=str(reporter_id),
            reported_user_id="missing-user",
            reason=ReportReasonEnum.OTHER,
            details="unknown",
            status=ReportStatusEnum.OPEN,
            created_at=datetime(2026, 1, 2),
        ),
    ]
    users = [
        SimpleNamespace(id=reporter_id, username="reporter", is_active=True),
        SimpleNamespace(id=reported_id, username="reported", is_active=False),
    ]
    user_queries = []

    monkeypatch.setattr(admin.Report, "find", lambda query: _ReportQuery(reports))

    def find_users(query):
        user_queries.append(query)
        return _UserQuery(users)

    monkeypatch.setattr(admin.User, "find", find_users)
    monkeypatch.setattr(
        admin.User,
        "get",
        lambda _user_id: (_ for _ in ()).throw(AssertionError("N+1 lookup")),
    )

    import asyncio

    result = asyncio.run(admin.list_reports(status_filter="all", current_user=object()))

    assert len(user_queries) == 1
    queried_ids = {str(value) for value in user_queries[0]["_id"]["$in"]}
    assert queried_ids == {str(reporter_id), str(reported_id), "missing-user"}
    assert result["reports"][0]["reporter"]["username"] == "reporter"
    assert result["reports"][0]["reported"]["username"] == "reported"
    assert result["reports"][1]["reported"]["username"] is None
