"""Block checks shared by chat, socket, likes and matching."""
from app.models.user import User


def _blocked_list(user: User) -> list:
    if user and user.chat_settings and user.chat_settings.blocked_users:
        return user.chat_settings.blocked_users
    return []


def is_blocked_between(user_a: User, user_b: User) -> bool:
    """True when either side has blocked the other."""
    return (
        str(user_b.id) in _blocked_list(user_a)
        or str(user_a.id) in _blocked_list(user_b)
    )


async def blocked_ids_for(user: User) -> set:
    """Ids this user blocked plus ids of users who blocked them —
    both directions disappear from matching decks."""
    mine = set(_blocked_list(user))
    blockers = await User.find(
        {"chatSettings.blockedUsers": str(user.id)}
    ).to_list(length=500)
    return mine | {str(u.id) for u in blockers}
