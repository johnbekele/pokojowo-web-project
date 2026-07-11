"""Stable i18n keys for match explanations.

The scorer emits human-readable English `reason` strings. This module
maps each known template to a stable `reason_key` (+ extracted params)
so clients can translate via i18next; the English string stays in the
payload as a fallback for older clients.

Order matters: first match wins.
"""
import re
from typing import Dict, Optional, Tuple

# (compiled pattern, key) — named groups become i18n params
_PATTERNS = [
    # Budget
    (re.compile(r"^Budget information incomplete"), "budget.incomplete"),
    (re.compile(r"^Different currencies \((?P<a>[^ ]+) vs (?P<b>[^)]+)\)"), "budget.currencyMismatch"),
    (re.compile(r"^Excellent budget match \((?P<range>[^)]+) overlaps well\)"), "budget.excellent"),
    (re.compile(r"^Good budget overlap"), "budget.good"),
    (re.compile(r"^Limited budget overlap"), "budget.limited"),
    (re.compile(r"^Significant budget mismatch \(your (?P<yours>[^ ]+) vs their (?P<theirs>[^ )]+)"), "budget.mismatch"),
    # Lifestyle
    (re.compile(r"^Smoking preference conflict"), "lifestyle.smokingConflict"),
    (re.compile(r"^Both non-smokers"), "lifestyle.bothNonSmokers"),
    (re.compile(r"^Pet preference mismatch"), "lifestyle.petMismatch"),
    (re.compile(r"^You're open to pets"), "lifestyle.openToPets"),
    (re.compile(r"^Similar cleanliness standards \((?P<level>[^)]+)\)"), "lifestyle.similarCleanliness"),
    (re.compile(r"^Different cleanliness expectations"), "lifestyle.differentCleanliness"),
    (re.compile(r"^Compatible social levels"), "lifestyle.compatibleSocial"),
    (re.compile(r"^Different guest frequency"), "lifestyle.differentGuests"),
    (re.compile(r"^Very different noise tolerance"), "lifestyle.differentNoise"),
    (re.compile(r"^Both enjoy cooking"), "lifestyle.bothCook"),
    # Personality
    (re.compile(r"^Personality traits not specified"), "personality.notSpecified"),
    (re.compile(r"^Both introverts"), "personality.bothIntroverts"),
    (re.compile(r"^Both extroverts"), "personality.bothExtroverts"),
    (re.compile(r"^Introvert-extrovert mix"), "personality.introExtroMix"),
    (re.compile(r"^Both early birds"), "personality.bothEarlyBirds"),
    (re.compile(r"^Both night owls"), "personality.bothNightOwls"),
    (re.compile(r"^Opposite sleep schedules"), "personality.oppositeSleep"),
    (re.compile(r"^Both value tidiness"), "personality.bothTidy"),
    (re.compile(r"^Different tidiness standards"), "personality.differentTidiness"),
    (re.compile(r"^Quiet-talkative mix"), "personality.quietTalkativeMix"),
    # Schedule
    (re.compile(r"^Schedule information not available"), "schedule.notAvailable"),
    (re.compile(r"^Wake up times nearly identical \((?P<time>[^)]+)\)"), "schedule.wakeIdentical"),
    (re.compile(r"^Very different wake times \((?P<a>[^ ]+) vs (?P<b>[^)]+)\)"), "schedule.wakeDifferent"),
    (re.compile(r"^Sleep times align perfectly"), "schedule.sleepAligned"),
    (re.compile(r"^Very different sleep times"), "schedule.sleepDifferent"),
    (re.compile(r"^Staggered work times"), "schedule.staggeredWork"),
    # Location
    (re.compile(r"^Both interested in (?P<location>.+)$"), "location.bothInterested"),
    (re.compile(r"^Looking in similar regions"), "location.similarRegions"),
    (re.compile(r"^Different locations \((?P<a>[^)]+) vs (?P<b>[^)]+)\)"), "location.different"),
    (re.compile(r"^Different country preferences"), "location.differentCountry"),
    (re.compile(r"^Location preferences not specified"), "location.notSpecified"),
    # Preferences
    (re.compile(r"^Candidate age (?P<age>\d+) within your preferred range"), "preferences.ageInRange"),
    (re.compile(r"^Candidate age (?P<age>\d+) outside your preferred (?P<range>[\d-]+) range"), "preferences.ageOutOfRange"),
    (re.compile(r"^Same lease duration preference \((?P<months>\d+) months\)"), "preferences.sameLease"),
    (re.compile(r"^Different lease preferences \((?P<a>\d+) vs (?P<b>\d+) months\)"), "preferences.differentLease"),
    (re.compile(r"^Share (?P<count>\d+) languages: (?P<languages>.+)$"), "preferences.sharedLanguages"),
    (re.compile(r"^No common languages"), "preferences.noCommonLanguages"),
    (re.compile(r"^Preference information incomplete"), "preferences.incomplete"),
    # Interests
    (re.compile(r"^Strong interest overlap: (?P<interests>.+)$"), "interests.strongOverlap"),
    (re.compile(r"^Share (?P<count>\d+) interests: (?P<interests>.+)$"), "interests.shared"),
    (re.compile(r"^One shared interest: (?P<interest>.+)$"), "interests.one"),
    (re.compile(r"^No overlapping interests"), "interests.none"),
    (re.compile(r"^No interests specified in your profile"), "interests.noneYours"),
    (re.compile(r"^Candidate has no interests listed"), "interests.noneTheirs"),
]


def key_for_reason(reason: str) -> Tuple[Optional[str], Optional[Dict]]:
    """Return (reason_key, params) for a known reason string, or
    (None, None) for unmapped strings."""
    for pattern, key in _PATTERNS:
        m = pattern.match(reason)
        if m:
            params = {k: v for k, v in m.groupdict().items() if v is not None}
            return key, params or None
    return None, None


def annotate(explanations: list) -> list:
    """Add reason_key/params to each explanation in place."""
    for exp in explanations:
        key, params = key_for_reason(exp.get("reason", ""))
        if key:
            exp["reason_key"] = key
            if params:
                exp["params"] = params
    return explanations
