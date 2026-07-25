"""Quality scoring: weighted per-field completeness, discounted by each
field's provenance confidence, plus hard gates for auto-publish."""

from pokojowo_scraper.schemas import ExtractedListing, GeoPrecision, QualityScore

# field name -> weight in the completeness score (sums to 1.0)
WEIGHTS: dict[str, float] = {
    "price": 0.15,
    "coordinates": 0.12,
    "size": 0.10,
    "description_pl": 0.10,
    "images": 0.10,
    "rooms": 0.08,
    "district": 0.08,
    "city": 0.05,
    "available_from": 0.05,
    "deposit": 0.05,
    "phone": 0.04,
    "offered_by": 0.04,
    "close_to": 0.04,
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9

MIN_DESCRIPTION_CHARS = 300
MIN_IMAGES = 3

# per-city monthly price sanity bands (PLN) — rooms & whole flats combined
PRICE_BANDS: dict[str, tuple[float, float]] = {
    "warszawa": (600, 25_000),
    "krakow": (500, 20_000),
    "wroclaw": (500, 18_000),
    "poznan": (450, 15_000),
    "gdansk": (500, 18_000),
    "lodz": (400, 12_000),
    "_default": (400, 30_000),
}


def _field_credit(listing: ExtractedListing, name: str) -> float:
    """0..1 credit for one field: presence (with per-field quality bars)
    times provenance confidence."""
    field = getattr(listing, name)
    if field is None:
        return 0.0
    value, confidence = field.value, field.confidence

    if name == "description_pl" and len(value) < MIN_DESCRIPTION_CHARS:
        return 0.5 * confidence
    if name == "images":
        if not value:
            return 0.0
        if len(value) < MIN_IMAGES:
            return 0.6 * confidence
    if name == "coordinates":
        # a city-centroid pin is nearly worthless on a map
        precision_credit = {
            GeoPrecision.EXACT: 1.0,
            GeoPrecision.STREET: 0.9,
            GeoPrecision.DISTRICT: 0.5,
            GeoPrecision.CITY: 0.15,
        }.get(listing.geo_precision, 0.0)
        return precision_credit * confidence

    return confidence


def score(listing: ExtractedListing) -> QualityScore:
    completeness = 0.0
    confidence = 0.0
    for name, weight in WEIGHTS.items():
        field = getattr(listing, name)
        if field is not None:
            completeness += weight
        confidence += weight * _field_credit(listing, name)

    return QualityScore(
        completeness=round(completeness, 4),
        confidence=round(confidence, 4),
        gates_failed=check_gates(listing),
    )


def check_gates(listing: ExtractedListing) -> list[str]:
    """Hard requirements for auto-publish, regardless of score."""
    failed: list[str] = []

    # backend /import requires these
    if listing.price is None:
        failed.append("missing_price")
    if listing.size is None:
        failed.append("missing_size")
    if listing.address is None:
        failed.append("missing_address")
    if listing.description_pl is None:
        failed.append("missing_description")
    if listing.description_en is None:
        failed.append("missing_translation")

    if listing.translation_suspect:
        failed.append("translation_suspect")

    if listing.geo_precision not in (GeoPrecision.EXACT, GeoPrecision.STREET):
        failed.append("geo_imprecise")

    if listing.price is not None:
        city = (listing.city.value.lower() if listing.city else "_default")
        low, high = PRICE_BANDS.get(city, PRICE_BANDS["_default"])
        if not low <= listing.price.value <= high:
            failed.append("price_out_of_band")

    if listing.images is None or not listing.images.value:
        failed.append("no_images")

    return failed
