"""Tests for extraction and classification tools."""

import pytest

from src.agents.tools.extraction_tools import ExtractionTools
from src.models.processed_listing import RoomType, BuildingType, RentFor


class TestExtractionTools:
    """Tests for extraction tools."""

    @pytest.fixture
    def tools(self):
        """Create extraction tools instance."""
        return ExtractionTools()

    @pytest.mark.asyncio
    async def test_classify_room_type_single(self, tools):
        """Test single room classification."""
        result = await tools.classify_room_type(rooms=1, size=30)
        assert result["room_type"] == RoomType.SINGLE.value

    @pytest.mark.asyncio
    async def test_classify_room_type_double(self, tools):
        """Test double room classification."""
        result = await tools.classify_room_type(rooms=2, size=50)
        assert result["room_type"] == RoomType.DOUBLE.value

    @pytest.mark.asyncio
    async def test_classify_room_type_suite(self, tools):
        """Test suite classification."""
        result = await tools.classify_room_type(rooms=4, size=80)
        assert result["room_type"] == RoomType.SUITE.value

    @pytest.mark.asyncio
    async def test_classify_room_type_by_size(self, tools):
        """Test room classification by size when rooms not provided."""
        # Small apartment should be Single
        result = await tools.classify_room_type(rooms=None, size=25)
        assert result["room_type"] == RoomType.SINGLE.value

        # Large apartment should be Suite
        result = await tools.classify_room_type(rooms=None, size=85)
        assert result["room_type"] == RoomType.SUITE.value

    @pytest.mark.asyncio
    async def test_classify_room_type_default(self, tools):
        """Test default room classification."""
        result = await tools.classify_room_type(rooms=None, size=None)
        assert result["room_type"] == RoomType.DOUBLE.value
        assert result["confidence"] == "low"

    @pytest.mark.asyncio
    async def test_classify_building_type_apartment(self, tools):
        """Test apartment building classification."""
        result = await tools.classify_building_type(
            text="Piękne mieszkanie w kamienicy",
            attributes={},
        )
        assert result["building_type"] == BuildingType.APARTMENT.value

    @pytest.mark.asyncio
    async def test_classify_building_type_loft(self, tools):
        """Test loft building classification."""
        result = await tools.classify_building_type(
            text="Loft w centrum miasta",
            attributes={},
        )
        assert result["building_type"] == BuildingType.LOFT.value

    @pytest.mark.asyncio
    async def test_classify_building_type_block(self, tools):
        """Test block building classification."""
        result = await tools.classify_building_type(
            text="Mieszkanie w bloku z wielkiej płyty",
            attributes={},
        )
        assert result["building_type"] == BuildingType.BLOCK.value

    @pytest.mark.asyncio
    async def test_classify_building_type_house(self, tools):
        """Test detached house classification."""
        result = await tools.classify_building_type(
            text="Dom wolnostojący do wynajęcia",
            attributes={},
        )
        assert result["building_type"] == BuildingType.DETACHED_HOUSE.value

    @pytest.mark.asyncio
    async def test_classify_building_type_from_attrs(self, tools):
        """Test building classification from attributes."""
        result = await tools.classify_building_type(
            text="",
            attributes={"rodzaj zabudowy": "blok"},
        )
        assert result["building_type"] == BuildingType.BLOCK.value

    @pytest.mark.asyncio
    async def test_determine_rent_for_students(self, tools):
        """Test student tenant detection."""
        result = await tools.determine_rent_for(
            "Idealne dla studentów, blisko uczelni"
        )
        assert RentFor.STUDENT.value in result["rent_for_only"]

    @pytest.mark.asyncio
    async def test_determine_rent_for_couples(self, tools):
        """Test couple tenant detection."""
        result = await tools.determine_rent_for(
            "Mieszkanie dla pary, romantyczne wnętrze"
        )
        assert RentFor.COUPLE.value in result["rent_for_only"]

    @pytest.mark.asyncio
    async def test_determine_rent_for_families(self, tools):
        """Test family tenant detection."""
        result = await tools.determine_rent_for(
            "Duże mieszkanie dla rodziny z dziećmi"
        )
        assert RentFor.FAMILY.value in result["rent_for_only"]

    @pytest.mark.asyncio
    async def test_determine_rent_for_default(self, tools):
        """Test default rent_for when no specific preference."""
        result = await tools.determine_rent_for(
            "Ładne mieszkanie w centrum"
        )
        assert result["rent_for_only"] == [RentFor.OPEN_TO_ALL.value]
