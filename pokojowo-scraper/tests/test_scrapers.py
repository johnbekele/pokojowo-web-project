"""Tests for site scrapers."""

import pytest

from src.scrapers import get_scraper, OLXScraper, OtodomScraper, GumtreeScraper
from src.scrapers.base_scraper import BaseScraper


class TestGetScraper:
    """Tests for scraper factory."""

    def test_get_olx_scraper(self):
        """Test getting OLX scraper."""
        scraper = get_scraper("olx")
        assert isinstance(scraper, OLXScraper)

    def test_get_otodom_scraper(self):
        """Test getting Otodom scraper."""
        scraper = get_scraper("otodom")
        assert isinstance(scraper, OtodomScraper)

    def test_get_gumtree_scraper(self):
        """Test getting Gumtree scraper."""
        scraper = get_scraper("gumtree")
        assert isinstance(scraper, GumtreeScraper)

    def test_invalid_site_raises(self):
        """Test that invalid site raises ValueError."""
        with pytest.raises(ValueError):
            get_scraper("invalid")


class TestBaseScraper:
    """Tests for base scraper functionality."""

    def test_extract_price(self):
        """Test price extraction from text."""
        scraper = OLXScraper()

        assert scraper._extract_price("2 500 zł/miesiąc") == 2500.0
        assert scraper._extract_price("3000 PLN") == 3000.0
        assert scraper._extract_price("1,500.00 zł") == 1500.0
        assert scraper._extract_price("") is None

    def test_extract_size(self):
        """Test size extraction from text."""
        scraper = OLXScraper()

        assert scraper._extract_size("45 m²") == 45.0
        assert scraper._extract_size("50m2") == 50.0
        assert scraper._extract_size("35.5 mkw") == 35.5
        assert scraper._extract_size("") is None

    def test_extract_rooms(self):
        """Test rooms extraction from text."""
        scraper = OLXScraper()

        assert scraper._extract_rooms("3 pokoje") == 3
        assert scraper._extract_rooms("kawalerka") == 1
        assert scraper._extract_rooms("2") == 2
        assert scraper._extract_rooms("") is None

    def test_clean_text(self):
        """Test text cleaning."""
        scraper = OLXScraper()

        assert scraper._clean_text("  hello   world  ") == "hello world"
        assert scraper._clean_text("multiple\n\nspaces") == "multiple spaces"
        assert scraper._clean_text("") == ""


class TestOLXScraper:
    """Tests for OLX scraper."""

    def test_search_url_generation(self):
        """Test search URL generation."""
        scraper = OLXScraper()

        url = scraper.get_search_url("warszawa", page=1)
        assert "olx.pl" in url
        assert "warszawa" in url
        assert "wynajem" in url

    def test_search_url_pagination(self):
        """Test search URL with pagination."""
        scraper = OLXScraper()

        url = scraper.get_search_url("krakow", page=2)
        assert "page=2" in url

    def test_city_slug_mapping(self):
        """Test city slug mapping."""
        scraper = OLXScraper()

        # Test known cities
        assert "warszawa" in scraper.get_search_url("Warszawa")
        assert "krakow" in scraper.get_search_url("Krakow")


class TestOtodomScraper:
    """Tests for Otodom scraper."""

    def test_search_url_generation(self):
        """Test search URL generation."""
        scraper = OtodomScraper()

        url = scraper.get_search_url("warszawa", page=1)
        assert "otodom.pl" in url
        assert "warszawa" in url
        assert "wynajem" in url

    def test_city_voivodeship_mapping(self):
        """Test city to voivodeship mapping."""
        scraper = OtodomScraper()

        # Warsaw is in mazowieckie
        url = scraper.get_search_url("warszawa")
        assert "mazowieckie" in url

        # Krakow is in malopolskie
        url = scraper.get_search_url("krakow")
        assert "malopolskie" in url


class TestGumtreeScraper:
    """Tests for Gumtree scraper."""

    def test_search_url_generation(self):
        """Test search URL generation."""
        scraper = GumtreeScraper()

        url = scraper.get_search_url("warszawa", page=1)
        assert "gumtree.pl" in url
        assert "mieszkania" in url

    def test_search_url_pagination(self):
        """Test search URL with pagination."""
        scraper = GumtreeScraper()

        url = scraper.get_search_url("warszawa", page=3)
        assert "page=3" in url
