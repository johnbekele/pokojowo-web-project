"""Central constants shared across endpoints and services."""

# Canonical language options offered in the profile UI. Users may also
# submit free-text languages ("Other" option); those are normalized on
# save (see normalize_languages) rather than validated against this list.
SUPPORTED_LANGUAGES = [
    "English",
    "Polish",
    "German",
    "French",
    "Spanish",
    "Ukrainian",
    "Russian",
    "Italian",
]


def normalize_languages(languages) -> list:
    """Trim, title-case and dedupe a client-provided language list so
    free-text entries match across users ('czech ' == 'Czech')."""
    if not languages:
        return []
    seen = set()
    result = []
    for lang in languages:
        if not isinstance(lang, str):
            continue
        cleaned = " ".join(lang.split()).title()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            result.append(cleaned)
    return result
