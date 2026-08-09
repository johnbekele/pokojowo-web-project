import pytest

from app.models.user import User


pytestmark = pytest.mark.integration


PASSWORD = "Correct Horse Battery Staple!"
NEW_PASSWORD = "Even Better Battery Staple!"


async def test_register_login_refresh_and_logout(client):
    payload = {
        "username": "lifecycle-user",
        "email": "lifecycle@example.com",
        "password": PASSWORD,
        "role": ["Tenant"],
    }

    registered = await client.post("/api/auth/register", json=payload)
    assert registered.status_code == 201
    user = await User.get(registered.json()["user_id"])
    assert user is not None
    assert user.is_verified is False

    duplicate = await client.post("/api/auth/register", json=payload)
    assert duplicate.status_code == 400

    bad_login = await client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": "wrong password"},
    )
    assert bad_login.status_code == 401

    logged_in = await client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": PASSWORD},
    )
    assert logged_in.status_code == 200
    tokens = logged_in.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    me = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == payload["email"]

    refreshed = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]

    logged_out = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert logged_out.status_code == 200

    rejected_refresh = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert rejected_refresh.status_code == 401


async def test_verification_and_password_reset_happy_and_failure_paths(client):
    registered = await client.post(
        "/api/auth/register",
        json={
            "username": "reset-user",
            "email": "reset@example.com",
            "password": PASSWORD,
        },
    )
    assert registered.status_code == 201
    user = await User.get(registered.json()["user_id"])
    assert user is not None and user.verification_token

    invalid_verification = await client.get("/api/auth/verify-email?token=not-a-token")
    assert invalid_verification.status_code == 400

    verified = await client.get(f"/api/auth/verify-email?token={user.verification_token}")
    assert verified.status_code == 200
    assert (await User.get(user.id)).is_verified is True

    already_verified = await client.get(f"/api/auth/verify-email?token={user.verification_token}")
    assert already_verified.status_code == 200
    assert already_verified.json()["message"] == "Email already verified"

    unknown_reset = await client.post(
        "/api/auth/forgot-password",
        json={"email": "missing@example.com"},
    )
    assert unknown_reset.status_code == 200

    requested_reset = await client.post(
        "/api/auth/forgot-password",
        json={"email": "reset@example.com"},
    )
    assert requested_reset.status_code == 200
    user = await User.get(user.id)
    assert user.reset_password_token

    invalid_reset = await client.get("/api/auth/verify-reset-token?token=not-a-token")
    assert invalid_reset.status_code == 400
    valid_reset = await client.get(
        f"/api/auth/verify-reset-token?token={user.reset_password_token}"
    )
    assert valid_reset.status_code == 200

    weak_password = await client.post(
        "/api/auth/reset-password",
        json={"token": user.reset_password_token, "password": "short"},
    )
    assert weak_password.status_code == 422

    reset = await client.post(
        "/api/auth/reset-password",
        json={"token": user.reset_password_token, "password": NEW_PASSWORD},
    )
    assert reset.status_code == 200

    old_login = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": PASSWORD},
    )
    assert old_login.status_code == 401
    new_login = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": NEW_PASSWORD},
    )
    assert new_login.status_code == 200


async def test_resend_verification_rate_limit_boundary(client):
    registered = await client.post(
        "/api/auth/register",
        json={
            "username": "rate-limited-user",
            "email": "rate-limited@example.com",
            "password": PASSWORD,
        },
    )
    assert registered.status_code == 201

    responses = [
        await client.post(
            "/api/auth/resend-verification-email",
            json={"email": "rate-limited@example.com"},
        )
        for _ in range(4)
    ]
    assert [response.status_code for response in responses] == [200, 200, 200, 429]
