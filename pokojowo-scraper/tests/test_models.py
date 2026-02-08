"""Tests for data models."""

import pytest
from datetime import datetime

from src.models import ScrapedListing, ProcessedListing, BilingualText, ScrapeJob
from src.models.processed_listing import RoomType, BuildingType, RentFor


class TestScrapedListing:
    """Tests for ScrapedListing model."""

    def test_create_listing(self):
        """Test creating a scraped listing."""
        listing = ScrapedListing(
            source_site="olx",
            source_url="https://www.olx.pl/test/123",
            source_id="123",
            title="Test Listing",
            description="Test description",
            price=2500.0,
            address="Warsaw, Poland",
            city="Warsaw",
        )

        assert listing.source_site == "olx"
        assert listing.price == 2500.0
        assert listing.city == "Warsaw"

    def test_generate_hash(self):
        """Test deduplication hash generation."""
        listing1 = ScrapedListing(
            source_site="olx",
            source_url="https://www.olx.pl/test/123",
            source_id="123",
            title="Test Listing",
            description="Test",
            price=2500.0,
            address="Warsaw, Poland",
            city="Warsaw",
        )

        listing2 = ScrapedListing(
            source_site="olx",
            source_url="https://www.olx.pl/test/123",
            source_id="123",
            title="Different Title",  # Different title
            description="Different",
            price=2500.0,  # Same price
            address="Warsaw, Poland",  # Same address
            city="Warsaw",
        )

        # Same URL, address, price should generate same hash
        assert listing1.generate_hash() == listing2.generate_hash()

    def test_different_hash_for_different_price(self):
        """Test that different prices generate different hashes."""
        listing1 = ScrapedListing(
            source_site="olx",
            source_url="https://www.olx.pl/test/123",
            source_id="123",
            title="Test",
            description="Test",
            price=2500.0,
            address="Warsaw",
            city="Warsaw",
        )

        listing2 = ScrapedListing(
            source_site="olx",
            source_url="https://www.olx.pl/test/123",
            source_id="123",
            title="Test",
            description="Test",
            price=3000.0,  # Different price
            address="Warsaw",
            city="Warsaw",
        )

        assert listing1.generate_hash() != listing2.generate_hash()


class TestProcessedListing:
    """Tests for ProcessedListing model."""

    def test_create_processed_listing(self):
        """Test creating a processed listing."""
        listing = ProcessedListing(
            source_url="https://www.olx.pl/test",
            source_site="olx",
            source_id="123",
            dedup_hash="abc123",
            address="Warsaw, Poland",
            price=2500.0,
            size=45.0,
            maxTenants=2,
            images=["https://pokojowo.com/img/1.jpg"],
            description=BilingualText(
                en="Nice apartment",
                pl="Ładne mieszkanie",
            ),
            availableFrom=datetime.utcnow(),
            roomType=RoomType.DOUBLE,
            buildingType=BuildingType.APARTMENT,
            rentForOnly=[RentFor.OPEN_TO_ALL],
        )

        assert listing.price == 2500.0
        assert listing.room_type == RoomType.DOUBLE

    def test_to_pokojowo_payload(self):
        """Test converting to Pokojowo API payload."""
        listing = ProcessedListing(
            source_url="https://www.olx.pl/test",
            source_site="olx",
            source_id="123",
            dedup_hash="abc123",
            address="Warsaw, Poland",
            price=2500.0,
            size=45.0,
            maxTenants=2,
            images=["https://pokojowo.com/img/1.jpg"],
            description=BilingualText(
                en="Nice apartment",
                pl="Ładne mieszkanie",
            ),
            availableFrom=datetime(2024, 1, 1),
            roomType=RoomType.DOUBLE,
            buildingType=BuildingType.APARTMENT,
            rentForOnly=[RentFor.OPEN_TO_ALL],
        )

        payload = listing.to_pokojowo_payload()

        assert payload["address"] == "Warsaw, Poland"
        assert payload["price"] == 2500.0
        assert payload["size"] == 45.0
        assert payload["maxTenants"] == 2
        assert payload["roomType"] == "Double"
        assert payload["buildingType"] == "Apartment"
        assert "en" in payload["description"]
        assert "pl" in payload["description"]
        # Check source attribution
        assert "olx" in payload["description"]["en"]


class TestScrapeJob:
    """Tests for ScrapeJob model."""

    def test_create_job(self):
        """Test creating a scrape job."""
        job = ScrapeJob(
            job_id="test-job-1",
            site="olx",
            city="warszawa",
            max_listings=50,
        )

        assert job.job_id == "test-job-1"
        assert job.site == "olx"
        assert job.status.value == "pending"

    def test_mark_started(self):
        """Test marking job as started."""
        job = ScrapeJob(
            job_id="test-job-1",
            site="olx",
            city="warszawa",
        )

        job.mark_started()

        assert job.status.value == "running"
        assert job.started_at is not None

    def test_mark_completed(self):
        """Test marking job as completed."""
        job = ScrapeJob(
            job_id="test-job-1",
            site="olx",
            city="warszawa",
        )

        job.mark_started()
        job.mark_completed()

        assert job.status.value == "completed"
        assert job.completed_at is not None

    def test_mark_failed(self):
        """Test marking job as failed."""
        job = ScrapeJob(
            job_id="test-job-1",
            site="olx",
            city="warszawa",
        )

        job.mark_started()
        job.mark_failed("Test error")

        assert job.status.value == "failed"
        assert job.error_message == "Test error"

    def test_duration(self):
        """Test duration calculation."""
        job = ScrapeJob(
            job_id="test-job-1",
            site="olx",
            city="warszawa",
        )

        assert job.duration_seconds is None

        job.mark_started()
        job.mark_completed()

        assert job.duration_seconds is not None
        assert job.duration_seconds >= 0
