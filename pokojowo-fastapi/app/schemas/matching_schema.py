"""
Pydantic schemas for the matching algorithm API responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class ImpactEnum(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class MatchScoreBreakdown(BaseModel):
    """Breakdown of compatibility scores by category."""
    budget_score: float = Field(..., alias="budgetScore", description="Budget compatibility (0-100)")
    lifestyle_score: float = Field(..., alias="lifestyleScore", description="Lifestyle compatibility (0-100)")
    personality_score: float = Field(..., alias="personalityScore", description="Personality alignment (0-100)")
    schedule_score: float = Field(..., alias="scheduleScore", description="Schedule compatibility (0-100)")
    interests_score: float = Field(..., alias="interestsScore", description="Shared interests score (0-100)")
    total_score: float = Field(..., alias="totalScore", description="Weighted total score (0-100)")

    class Config:
        populate_by_name = True


class MatchExplanation(BaseModel):
    """Explanation for a specific aspect of the match."""
    category: str = Field(..., description="Category (budget, lifestyle, personality, schedule, interests)")
    reason: str = Field(..., description="Human-readable explanation")
    impact: ImpactEnum = Field(..., description="Impact type (positive, neutral, negative)")
    score: float = Field(..., description="Score for this specific factor")


class MatchResult(BaseModel):
    """A single match result with compatibility details."""
    user_id: str = Field(..., alias="userId", description="Matched user's ID")
    username: str = Field(..., description="Username")
    firstname: Optional[str] = Field(None, description="First name")
    lastname: Optional[str] = Field(None, description="Last name")
    photo: Optional[str] = Field(None, description="Profile photo URL")
    age: Optional[int] = Field(None, description="Age")
    gender: Optional[str] = Field(None, description="Gender")
    bio: Optional[str] = Field(None, description="Bio/description")
    location: Optional[str] = Field(None, description="Location")
    compatibility_score: float = Field(..., alias="compatibilityScore", description="Overall compatibility (0-100)")
    score_breakdown: MatchScoreBreakdown = Field(..., alias="scoreBreakdown", description="Score breakdown by category")
    explanations: List[MatchExplanation] = Field(..., description="List of match explanations")
    shared_interests: List[str] = Field(..., alias="sharedInterests", description="List of shared interests")

    class Config:
        populate_by_name = True


class MatchResponse(BaseModel):
    """Response containing match results and metadata."""
    matches: List[MatchResult] = Field(..., description="List of compatible matches")
    total_candidates: int = Field(..., alias="totalCandidates", description="Total users considered")
    filtered_by_deal_breakers: int = Field(..., alias="filteredByDealBreakers", description="Users filtered out by deal-breakers")

    class Config:
        populate_by_name = True


class MatchFiltersRequest(BaseModel):
    """Request parameters for filtering matches."""
    location: Optional[str] = Field(None, description="Filter by location (partial match)")
    min_score: Optional[float] = Field(None, alias="minScore", ge=0, le=100, description="Minimum compatibility score")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of results")

    class Config:
        populate_by_name = True
