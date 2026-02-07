"""
Pokojowo Advanced Matching Service

Comprehensive, deterministic, explainable matching algorithm for finding
the perfect flatmate. Uses multi-dimensional weighted scoring with
bidirectional deal-breaker filtering and granular compatibility analysis.

The algorithm evaluates 10+ compatibility dimensions including:
- Budget alignment
- Lifestyle habits (smoking, pets, cleanliness, cooking, guests, noise)
- Personality traits (introvert/extrovert, early bird/night owl)
- Schedule compatibility (wake/sleep times, work hours)
- Location preferences
- Language compatibility
- Age preferences
- Gender preferences
- Shared interests
- Lease duration alignment
- Shared spaces preferences
"""

from typing import List, Dict, Tuple, Optional, Set
from app.models.user import (
    User,
    CleanlinessEnum,
    SocialLevelEnum,
    GuestsFrequencyEnum,
    NoiseToleranceEnum,
    CookingFrequencyEnum,
    PersonalityEnum,
    GenderEnum,
)


# Enhanced weight configuration for comprehensive matching
# Total must equal 100 - distributed across major life compatibility factors
WEIGHTS = {
    "budget": 20,           # Financial alignment - critical for shared living
    "lifestyle": 25,        # Daily habits - smoking, pets, cleanliness, cooking
    "personality": 15,      # Social compatibility - intro/extro, social level
    "schedule": 12,         # Time compatibility - sleep, wake, work hours
    "location": 10,         # Geographic preference alignment
    "preferences": 10,      # Age, gender, lease duration preferences
    "interests": 8,         # Shared hobbies and activities
}

# Minimum score thresholds for match quality tiers
MATCH_TIERS = {
    "perfect": 85,      # Excellent compatibility across all dimensions
    "great": 70,        # Strong compatibility with minor differences
    "good": 55,         # Decent compatibility, some adjustments needed
    "fair": 40,         # Basic compatibility, significant differences
    "poor": 0,          # Low compatibility
}


class MatchingService:
    """
    Advanced deterministic matching algorithm with multi-dimensional scoring
    and bidirectional deal-breaker filtering.

    The algorithm works in three phases:
    1. Bidirectional deal-breaker filtering: Reject if either party has deal-breakers
    2. Multi-dimensional scoring: Calculate compatibility across 7 categories
    3. Explanation generation: Provide detailed reasons for each score

    Returns ranked matches with comprehensive explanations and match tier labels.
    """

    def __init__(self, weights: Optional[Dict[str, int]] = None):
        """Initialize with optional custom weights."""
        self.weights = weights or WEIGHTS

        # Validate weights sum to 100
        total = sum(self.weights.values())
        if total != 100:
            raise ValueError(f"Weights must sum to 100, got {total}")

    async def find_matches(
        self,
        user: User,
        candidates: List[User],
        limit: int = 20,
        min_score: float = 0
    ) -> Dict:
        """
        Find compatible flatmate matches for a user.

        Args:
            user: The user seeking matches
            candidates: List of potential matches
            limit: Maximum number of matches to return
            min_score: Minimum compatibility score (0-100)

        Returns:
            Dictionary containing matches, stats, and metadata
        """
        results = []
        filtered_count = 0
        deal_breaker_reasons = {}

        for candidate in candidates:
            # Skip self-matching
            if str(candidate.id) == str(user.id):
                continue

            # Phase 1: Bidirectional deal-breaker check
            user_rejection = self._check_deal_breakers(user, candidate)
            if user_rejection:
                filtered_count += 1
                deal_breaker_reasons[str(candidate.id)] = user_rejection
                continue

            # Also check if candidate would reject user (bidirectional)
            candidate_rejection = self._check_deal_breakers(candidate, user)
            if candidate_rejection:
                filtered_count += 1
                deal_breaker_reasons[str(candidate.id)] = f"Mutual: {candidate_rejection}"
                continue

            # Phase 2: Calculate comprehensive compatibility score
            score, breakdown, explanations = self._calculate_compatibility(user, candidate)

            # Apply minimum score filter
            if score < min_score:
                continue

            # Determine match tier
            match_tier = self._get_match_tier(score)

            # Build match result
            results.append({
                "user_id": str(candidate.id),
                "username": candidate.username,
                "firstname": candidate.firstname,
                "lastname": candidate.lastname,
                "photo": candidate.photo.url if candidate.photo else None,
                "age": candidate.age,
                "gender": candidate.gender.value if candidate.gender else None,
                "bio": candidate.bio,
                "location": candidate.location,
                "languages": candidate.languages,
                "job": {
                    "industry": candidate.job.industry.value if candidate.job and candidate.job.industry else None,
                    "title": candidate.job.title if candidate.job else None,
                } if candidate.job else None,
                "compatibility_score": round(score, 1),
                "match_tier": match_tier,
                "score_breakdown": breakdown,
                "explanations": explanations,
                "shared_interests": self._get_shared_interests(user, candidate),
                "shared_languages": self._get_shared_languages(user, candidate),
                "compatible": True,
            })

        # Sort by compatibility score (descending)
        results.sort(key=lambda x: x["compatibility_score"], reverse=True)

        # Calculate match statistics
        stats = self._calculate_match_stats(results)

        return {
            "matches": results[:limit],
            "total_candidates": len(candidates) - 1,  # Exclude self
            "filtered_by_deal_breakers": filtered_count,
            "stats": stats,
        }

    def _get_match_tier(self, score: float) -> str:
        """Determine match quality tier based on score."""
        if score >= MATCH_TIERS["perfect"]:
            return "perfect"
        elif score >= MATCH_TIERS["great"]:
            return "great"
        elif score >= MATCH_TIERS["good"]:
            return "good"
        elif score >= MATCH_TIERS["fair"]:
            return "fair"
        return "poor"

    def _calculate_match_stats(self, results: List[Dict]) -> Dict:
        """Calculate statistics about the matches found."""
        if not results:
            return {
                "average_score": 0,
                "perfect_matches": 0,
                "great_matches": 0,
                "good_matches": 0,
            }

        scores = [r["compatibility_score"] for r in results]
        tiers = [r["match_tier"] for r in results]

        return {
            "average_score": round(sum(scores) / len(scores), 1),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "perfect_matches": tiers.count("perfect"),
            "great_matches": tiers.count("great"),
            "good_matches": tiers.count("good"),
        }

    def _check_deal_breakers(self, user: User, candidate: User) -> Optional[str]:
        """
        Check if any deal-breakers exist between user and candidate.
        This is a one-way check (user's deal-breakers against candidate).

        Returns:
            None if no deal-breakers, otherwise a reason string
        """
        user_db = None
        if user.tenant_profile and user.tenant_profile.deal_breakers:
            user_db = user.tenant_profile.deal_breakers

        candidate_prefs = None
        if candidate.tenant_profile and candidate.tenant_profile.preferences:
            if candidate.tenant_profile.preferences.lifestyle_preferences:
                candidate_prefs = candidate.tenant_profile.preferences.lifestyle_preferences

        candidate_traits = None
        if candidate.tenant_profile and candidate.tenant_profile.flatmate_traits:
            candidate_traits = candidate.tenant_profile.flatmate_traits

        if not user_db:
            return None

        # Smoking deal-breaker
        if user_db.no_smokers:
            if candidate_prefs and candidate_prefs.smokes:
                return "Candidate smokes (deal-breaker)"

        # Pets deal-breaker
        if user_db.no_pets:
            if candidate_prefs and candidate_prefs.has_pets:
                return "Candidate has pets (deal-breaker)"

        # Same gender only
        if user_db.same_gender_only:
            if user.gender and candidate.gender:
                if user.gender != candidate.gender:
                    return f"Gender mismatch (same gender required)"

        # Age restrictions
        if candidate.age:
            if user_db.min_age and candidate.age < user_db.min_age:
                return f"Candidate age {candidate.age} below minimum {user_db.min_age}"
            if user_db.max_age and candidate.age > user_db.max_age:
                return f"Candidate age {candidate.age} above maximum {user_db.max_age}"

        # Cleanliness minimum
        if user_db.min_cleanliness and candidate_traits:
            if candidate_traits.cleanliness:
                cleanliness_order = [
                    CleanlinessEnum.VERY_CLEAN,
                    CleanlinessEnum.CLEAN,
                    CleanlinessEnum.MODERATE,
                    CleanlinessEnum.RELAXED,
                    CleanlinessEnum.MESSY,
                ]
                try:
                    user_min_idx = cleanliness_order.index(user_db.min_cleanliness)
                    candidate_idx = cleanliness_order.index(candidate_traits.cleanliness)
                    if candidate_idx > user_min_idx:
                        return f"Cleanliness {candidate_traits.cleanliness.value} below minimum {user_db.min_cleanliness.value}"
                except ValueError:
                    pass

        # Budget compatibility (hard constraint)
        if user_db.max_budget:
            candidate_budget = None
            if candidate.tenant_profile and candidate.tenant_profile.preferences:
                candidate_budget = candidate.tenant_profile.preferences.budget
            if candidate_budget and candidate_budget.min:
                if candidate_budget.min > user_db.max_budget:
                    return f"Budget incompatible (candidate min {candidate_budget.min} > your max {user_db.max_budget})"

        # Quiet hours requirement
        if user_db.quiet_hours_required:
            # Check if candidate is a night owl who might be noisy
            candidate_personality = self._get_personality(candidate)
            candidate_noise = candidate_traits.noise_tolerance if candidate_traits else None
            if "night_owl" in candidate_personality and candidate_noise in [
                NoiseToleranceEnum.VERY_TOLERANT,
                NoiseToleranceEnum.TOLERANT
            ]:
                return "Candidate may not respect quiet hours (night owl, noise tolerant)"

        # No parties requirement
        if user_db.no_parties:
            if candidate_traits and candidate_traits.guests_frequency == GuestsFrequencyEnum.OFTEN:
                # High guest frequency may indicate party tendencies
                candidate_social = candidate_traits.social_level
                if candidate_social in [SocialLevelEnum.VERY_SOCIAL, SocialLevelEnum.SOCIAL]:
                    return "Candidate likely hosts parties (very social, frequent guests)"

        return None

    def _calculate_compatibility(
        self,
        user: User,
        candidate: User
    ) -> Tuple[float, Dict, List[Dict]]:
        """
        Calculate comprehensive weighted compatibility score with detailed breakdown.

        Returns:
            Tuple of (total_score, breakdown_dict, explanations_list)
        """
        scores = {}
        explanations = []

        # Calculate each category score
        budget_score, budget_exp = self._score_budget(user, candidate)
        scores["budget"] = budget_score
        explanations.extend(budget_exp)

        lifestyle_score, lifestyle_exp = self._score_lifestyle(user, candidate)
        scores["lifestyle"] = lifestyle_score
        explanations.extend(lifestyle_exp)

        personality_score, personality_exp = self._score_personality(user, candidate)
        scores["personality"] = personality_score
        explanations.extend(personality_exp)

        schedule_score, schedule_exp = self._score_schedule(user, candidate)
        scores["schedule"] = schedule_score
        explanations.extend(schedule_exp)

        location_score, location_exp = self._score_location(user, candidate)
        scores["location"] = location_score
        explanations.extend(location_exp)

        preferences_score, preferences_exp = self._score_preferences(user, candidate)
        scores["preferences"] = preferences_score
        explanations.extend(preferences_exp)

        interests_score, interests_exp = self._score_interests(user, candidate)
        scores["interests"] = interests_score
        explanations.extend(interests_exp)

        # Calculate weighted total (0-100)
        total = sum(
            scores[cat] * (self.weights[cat] / 100)
            for cat in scores
        )

        # Sort explanations by impact (positive first, then neutral, then negative)
        impact_order = {"positive": 0, "neutral": 1, "negative": 2}
        explanations.sort(key=lambda x: (impact_order.get(x.get("impact", "neutral"), 1), -x.get("score", 0)))

        breakdown = {
            "budgetScore": round(scores["budget"], 1),
            "lifestyleScore": round(scores["lifestyle"], 1),
            "personalityScore": round(scores["personality"], 1),
            "scheduleScore": round(scores["schedule"], 1),
            "locationScore": round(scores["location"], 1),
            "preferencesScore": round(scores["preferences"], 1),
            "interestsScore": round(scores["interests"], 1),
            "totalScore": round(total, 1),
        }

        return total, breakdown, explanations

    def _score_budget(self, user: User, candidate: User) -> Tuple[float, List[Dict]]:
        """
        Score budget compatibility (0-100).

        Considers:
        - Range overlap between budget preferences
        - Currency alignment
        - Flexibility (wider ranges are more compatible)
        """
        explanations = []

        user_budget = self._get_budget(user)
        candidate_budget = self._get_budget(candidate)

        if not user_budget or not candidate_budget:
            return 50.0, [{
                "category": "Budget",
                "reason": "Budget information incomplete - cannot fully assess",
                "impact": "neutral",
                "score": 50
            }]

        # Check currency match
        if user_budget.get("currency") != candidate_budget.get("currency"):
            return 30.0, [{
                "category": "Budget",
                "reason": f"Different currencies ({user_budget.get('currency')} vs {candidate_budget.get('currency')})",
                "impact": "negative",
                "score": 30
            }]

        # Calculate range overlap percentage
        overlap = self._calculate_range_overlap(
            user_budget["min"], user_budget["max"],
            candidate_budget["min"], candidate_budget["max"]
        )

        # Calculate midpoint alignment (how close are their ideal budgets?)
        user_mid = (user_budget["min"] + user_budget["max"]) / 2
        candidate_mid = (candidate_budget["min"] + candidate_budget["max"]) / 2
        max_budget = max(user_budget["max"], candidate_budget["max"])
        midpoint_diff = abs(user_mid - candidate_mid) / max_budget if max_budget > 0 else 0
        midpoint_score = max(0, 100 * (1 - midpoint_diff * 2))

        # Combined score (70% overlap, 30% midpoint alignment)
        score = overlap * 70 + midpoint_score * 0.3

        # Generate explanation
        currency = user_budget.get("currency", "PLN")
        if score >= 85:
            explanations.append({
                "category": "Budget",
                "reason": f"Excellent budget match ({user_budget['min']}-{user_budget['max']} {currency} overlaps well)",
                "impact": "positive",
                "score": round(score, 1)
            })
        elif score >= 60:
            explanations.append({
                "category": "Budget",
                "reason": f"Good budget overlap with some flexibility needed",
                "impact": "neutral",
                "score": round(score, 1)
            })
        elif score >= 40:
            explanations.append({
                "category": "Budget",
                "reason": f"Limited budget overlap - may need to negotiate",
                "impact": "neutral",
                "score": round(score, 1)
            })
        else:
            explanations.append({
                "category": "Budget",
                "reason": f"Significant budget mismatch (your {user_budget['min']}-{user_budget['max']} vs their {candidate_budget['min']}-{candidate_budget['max']} {currency})",
                "impact": "negative",
                "score": round(score, 1)
            })

        return score, explanations

    def _score_lifestyle(self, user: User, candidate: User) -> Tuple[float, List[Dict]]:
        """
        Score lifestyle compatibility (0-100).

        Evaluates:
        - Smoking preferences
        - Pet preferences
        - Cleanliness standards
        - Guest frequency
        - Noise tolerance
        - Cooking habits
        - Social level
        """
        explanations = []
        scores = []
        weights = []

        user_prefs = self._get_lifestyle_prefs(user)
        candidate_prefs = self._get_lifestyle_prefs(candidate)
        user_traits = self._get_flatmate_traits(user)
        candidate_traits = self._get_flatmate_traits(candidate)

        # 1. Smoking compatibility (high weight - major lifestyle factor)
        smoking_score = self._score_smoking_compatibility(user_prefs, candidate_prefs)
        scores.append(smoking_score)
        weights.append(20)
        if smoking_score < 50:
            explanations.append({
                "category": "Lifestyle",
                "reason": "Smoking preference conflict",
                "impact": "negative",
                "score": smoking_score
            })
        elif smoking_score >= 90:
            # Only add positive if both non-smokers and not ok with smoking
            if not candidate_prefs.get("smokes") and not user_prefs.get("smokes"):
                explanations.append({
                    "category": "Lifestyle",
                    "reason": "Both non-smokers - clean air environment",
                    "impact": "positive",
                    "score": smoking_score
                })

        # 2. Pets compatibility (medium weight)
        pets_score = self._score_pets_compatibility(user_prefs, candidate_prefs)
        scores.append(pets_score)
        weights.append(15)
        if pets_score < 50:
            explanations.append({
                "category": "Lifestyle",
                "reason": "Pet preference mismatch - needs discussion",
                "impact": "negative",
                "score": pets_score
            })
        elif candidate_prefs.get("hasPets") and user_prefs.get("okWithPets"):
            explanations.append({
                "category": "Lifestyle",
                "reason": "You're open to pets - candidate has pets",
                "impact": "positive",
                "score": pets_score
            })

        # 3. Cleanliness compatibility (high weight - daily impact)
        cleanliness_score = self._score_enum_distance(
            user_traits.get("cleanliness"),
            candidate_traits.get("cleanliness"),
            [e.value for e in CleanlinessEnum]
        )
        scores.append(cleanliness_score)
        weights.append(25)
        if cleanliness_score >= 85:
            cleanliness_val = candidate_traits.get("cleanliness", "moderate")
            explanations.append({
                "category": "Lifestyle",
                "reason": f"Similar cleanliness standards ({cleanliness_val})",
                "impact": "positive",
                "score": cleanliness_score
            })
        elif cleanliness_score < 50:
            explanations.append({
                "category": "Lifestyle",
                "reason": "Different cleanliness expectations - potential friction",
                "impact": "negative",
                "score": cleanliness_score
            })

        # 4. Social level compatibility (medium weight)
        social_score = self._score_enum_distance(
            user_traits.get("socialLevel"),
            candidate_traits.get("socialLevel"),
            [e.value for e in SocialLevelEnum]
        )
        scores.append(social_score)
        weights.append(15)
        if social_score >= 80 and user_traits.get("socialLevel"):
            explanations.append({
                "category": "Lifestyle",
                "reason": f"Compatible social levels",
                "impact": "positive",
                "score": social_score
            })

        # 5. Guests frequency compatibility (medium weight)
        guests_score = self._score_enum_distance(
            user_traits.get("guestsFrequency"),
            candidate_traits.get("guestsFrequency"),
            [e.value for e in GuestsFrequencyEnum]
        )
        scores.append(guests_score)
        weights.append(10)
        if guests_score < 50:
            explanations.append({
                "category": "Lifestyle",
                "reason": "Different guest frequency preferences",
                "impact": "negative",
                "score": guests_score
            })

        # 6. Noise tolerance compatibility (medium weight)
        noise_score = self._score_enum_distance(
            user_traits.get("noiseTolerance"),
            candidate_traits.get("noiseTolerance"),
            [e.value for e in NoiseToleranceEnum]
        )
        scores.append(noise_score)
        weights.append(10)
        if noise_score < 40:
            explanations.append({
                "category": "Lifestyle",
                "reason": "Very different noise tolerance - may cause conflicts",
                "impact": "negative",
                "score": noise_score
            })

        # 7. Cooking frequency compatibility (low weight)
        cooking_score = self._score_enum_distance(
            user_traits.get("cookingFrequency"),
            candidate_traits.get("cookingFrequency"),
            [e.value for e in CookingFrequencyEnum]
        )
        scores.append(cooking_score)
        weights.append(5)
        if cooking_score >= 80 and user_traits.get("cookingFrequency"):
            user_cooking = user_traits.get("cookingFrequency")
            if user_cooking in ["daily", "often"]:
                explanations.append({
                    "category": "Lifestyle",
                    "reason": "Both enjoy cooking - can share kitchen time",
                    "impact": "positive",
                    "score": cooking_score
                })

        # Calculate weighted average
        if scores and weights:
            weighted_sum = sum(s * w for s, w in zip(scores, weights))
            total_weight = sum(weights)
            final_score = weighted_sum / total_weight if total_weight > 0 else 50.0
        else:
            final_score = 50.0

        return final_score, explanations

    def _score_smoking_compatibility(self, user_prefs: Dict, candidate_prefs: Dict) -> float:
        """Calculate detailed smoking compatibility score."""
        user_smokes = user_prefs.get("smokes", False)
        user_ok = user_prefs.get("okWithSmoking", True)
        candidate_smokes = candidate_prefs.get("smokes", False)
        candidate_ok = candidate_prefs.get("okWithSmoking", True)

        # Both non-smokers
        if not user_smokes and not candidate_smokes:
            return 100.0

        # Non-smoker with smoker
        if not user_smokes and candidate_smokes:
            if user_ok:
                return 70.0  # User tolerates smoking
            return 15.0  # User doesn't want smokers

        # Smoker with non-smoker
        if user_smokes and not candidate_smokes:
            if candidate_ok:
                return 70.0  # Candidate tolerates smoking
            return 15.0  # Candidate doesn't want smokers

        # Both smokers
        if user_smokes and candidate_smokes:
            return 95.0  # Natural compatibility

        return 60.0

    def _score_pets_compatibility(self, user_prefs: Dict, candidate_prefs: Dict) -> float:
        """Calculate detailed pets compatibility score."""
        user_has_pets = user_prefs.get("hasPets", False)
        user_ok = user_prefs.get("okWithPets", True)
        candidate_has_pets = candidate_prefs.get("hasPets", False)
        candidate_ok = candidate_prefs.get("okWithPets", True)

        # Neither has pets
        if not user_has_pets and not candidate_has_pets:
            return 100.0

        # User has pets, candidate doesn't
        if user_has_pets and not candidate_has_pets:
            if candidate_ok:
                return 85.0
            return 20.0

        # Candidate has pets, user doesn't
        if not user_has_pets and candidate_has_pets:
            if user_ok:
                return 85.0
            return 20.0

        # Both have pets
        if user_has_pets and candidate_has_pets:
            return 90.0  # May need to discuss pet compatibility

        return 70.0

    def _score_personality(self, user: User, candidate: User) -> Tuple[float, List[Dict]]:
        """
        Score personality alignment (0-100).

        Evaluates:
        - Introvert/Extrovert compatibility
        - Early bird/Night owl alignment
        - Neat/Messy compatibility
        - Quiet/Talkative balance
        """
        explanations = []
        user_personality = self._get_personality(user)
        candidate_personality = self._get_personality(candidate)

        if not user_personality and not candidate_personality:
            return 60.0, [{
                "category": "Personality",
                "reason": "Personality traits not specified",
                "impact": "neutral",
                "score": 60
            }]

        scores = []
        weights = []

        # 1. Introvert/Extrovert compatibility (high weight)
        user_intro = "introvert" in user_personality
        user_extro = "extrovert" in user_personality
        cand_intro = "introvert" in candidate_personality
        cand_extro = "extrovert" in candidate_personality

        if user_intro or user_extro or cand_intro or cand_extro:
            if (user_intro and cand_intro):
                scores.append(95)
                explanations.append({
                    "category": "Personality",
                    "reason": "Both introverts - will respect each other's space",
                    "impact": "positive",
                    "score": 95
                })
            elif (user_extro and cand_extro):
                scores.append(90)
                explanations.append({
                    "category": "Personality",
                    "reason": "Both extroverts - great for socializing together",
                    "impact": "positive",
                    "score": 90
                })
            elif (user_intro and cand_extro) or (user_extro and cand_intro):
                scores.append(55)
                explanations.append({
                    "category": "Personality",
                    "reason": "Introvert-extrovert mix may require adjustment",
                    "impact": "neutral",
                    "score": 55
                })
            else:
                scores.append(70)
            weights.append(30)

        # 2. Early bird/Night owl compatibility (high weight - affects daily life)
        user_early = "early_bird" in user_personality
        user_night = "night_owl" in user_personality
        cand_early = "early_bird" in candidate_personality
        cand_night = "night_owl" in candidate_personality

        if user_early or user_night or cand_early or cand_night:
            if (user_early and cand_early):
                scores.append(100)
                explanations.append({
                    "category": "Personality",
                    "reason": "Both early birds - synchronized morning routines",
                    "impact": "positive",
                    "score": 100
                })
            elif (user_night and cand_night):
                scores.append(100)
                explanations.append({
                    "category": "Personality",
                    "reason": "Both night owls - late night compatibility",
                    "impact": "positive",
                    "score": 100
                })
            elif (user_early and cand_night) or (user_night and cand_early):
                scores.append(35)
                explanations.append({
                    "category": "Personality",
                    "reason": "Opposite sleep schedules - potential noise conflicts",
                    "impact": "negative",
                    "score": 35
                })
            else:
                scores.append(70)
            weights.append(35)

        # 3. Neat/Messy compatibility (medium weight)
        user_neat = "neat" in user_personality
        user_messy = "messy" in user_personality
        cand_neat = "neat" in candidate_personality
        cand_messy = "messy" in candidate_personality

        if user_neat or user_messy or cand_neat or cand_messy:
            if (user_neat and cand_neat):
                scores.append(100)
                explanations.append({
                    "category": "Personality",
                    "reason": "Both value tidiness - clean shared spaces",
                    "impact": "positive",
                    "score": 100
                })
            elif (user_messy and cand_messy):
                scores.append(85)
            elif (user_neat and cand_messy) or (user_messy and cand_neat):
                scores.append(40)
                explanations.append({
                    "category": "Personality",
                    "reason": "Different tidiness standards - may cause tension",
                    "impact": "negative",
                    "score": 40
                })
            else:
                scores.append(70)
            weights.append(25)

        # 4. Quiet/Talkative balance (lower weight)
        user_quiet = "quiet" in user_personality
        user_talk = "talkative" in user_personality
        cand_quiet = "quiet" in candidate_personality
        cand_talk = "talkative" in candidate_personality

        if user_quiet or user_talk or cand_quiet or cand_talk:
            if (user_quiet and cand_quiet):
                scores.append(90)
            elif (user_talk and cand_talk):
                scores.append(85)
            elif (user_quiet and cand_talk):
                scores.append(50)
                explanations.append({
                    "category": "Personality",
                    "reason": "Quiet-talkative mix - balance your communication styles",
                    "impact": "neutral",
                    "score": 50
                })
            elif (user_talk and cand_quiet):
                scores.append(50)
            else:
                scores.append(70)
            weights.append(10)

        # Calculate weighted average
        if scores and weights:
            weighted_sum = sum(s * w for s, w in zip(scores, weights))
            total_weight = sum(weights)
            return weighted_sum / total_weight if total_weight > 0 else 60.0, explanations

        return 60.0, explanations

    def _score_schedule(self, user: User, candidate: User) -> Tuple[float, List[Dict]]:
        """
        Score schedule compatibility (0-100).

        Evaluates:
        - Wake up time alignment
        - Sleep time alignment
        - Work hours overlap (for bathroom/kitchen coordination)
        """
        explanations = []
        scores = []
        weights = []

        user_routine = self._get_daily_routine(user)
        candidate_routine = self._get_daily_routine(candidate)

        if not user_routine and not candidate_routine:
            return 65.0, [{
                "category": "Schedule",
                "reason": "Schedule information not available",
                "impact": "neutral",
                "score": 65
            }]

        # 1. Compare wake up times (high weight)
        if user_routine.get("wakeUp") and candidate_routine.get("wakeUp"):
            time_diff = self._time_difference_hours(
                user_routine["wakeUp"],
                candidate_routine["wakeUp"]
            )
            if time_diff is not None:
                if time_diff <= 0.5:
                    scores.append(100)
                    explanations.append({
                        "category": "Schedule",
                        "reason": f"Wake up times nearly identical ({user_routine['wakeUp']})",
                        "impact": "positive",
                        "score": 100
                    })
                elif time_diff <= 1:
                    scores.append(90)
                elif time_diff <= 1.5:
                    scores.append(80)
                elif time_diff <= 2:
                    scores.append(65)
                elif time_diff <= 3:
                    scores.append(50)
                else:
                    scores.append(30)
                    explanations.append({
                        "category": "Schedule",
                        "reason": f"Very different wake times ({user_routine['wakeUp']} vs {candidate_routine['wakeUp']})",
                        "impact": "negative",
                        "score": 30
                    })
                weights.append(40)

        # 2. Compare sleep times (high weight)
        if user_routine.get("sleepTime") and candidate_routine.get("sleepTime"):
            time_diff = self._time_difference_hours(
                user_routine["sleepTime"],
                candidate_routine["sleepTime"]
            )
            if time_diff is not None:
                if time_diff <= 0.5:
                    scores.append(100)
                    explanations.append({
                        "category": "Schedule",
                        "reason": f"Sleep times align perfectly",
                        "impact": "positive",
                        "score": 100
                    })
                elif time_diff <= 1:
                    scores.append(90)
                elif time_diff <= 1.5:
                    scores.append(75)
                elif time_diff <= 2:
                    scores.append(60)
                elif time_diff <= 3:
                    scores.append(45)
                else:
                    scores.append(25)
                    explanations.append({
                        "category": "Schedule",
                        "reason": f"Very different sleep times - noise consideration needed",
                        "impact": "negative",
                        "score": 25
                    })
                weights.append(40)

        # 3. Compare work hours (medium weight - for resource sharing)
        user_work = user_routine.get("workHours") if user_routine else None
        candidate_work = candidate_routine.get("workHours") if candidate_routine else None

        if user_work and candidate_work:
            if user_work.get("from") and candidate_work.get("from"):
                work_diff = self._time_difference_hours(
                    user_work["from"],
                    candidate_work["from"]
                )
                if work_diff is not None:
                    if work_diff <= 1:
                        scores.append(70)  # Similar means morning rush together
                    elif work_diff >= 2:
                        scores.append(90)  # Staggered is better for bathroom/kitchen
                        explanations.append({
                            "category": "Schedule",
                            "reason": "Staggered work times - less morning rush",
                            "impact": "positive",
                            "score": 90
                        })
                    else:
                        scores.append(80)
                    weights.append(20)

        # Calculate weighted average
        if scores and weights:
            weighted_sum = sum(s * w for s, w in zip(scores, weights))
            total_weight = sum(weights)
            return weighted_sum / total_weight if total_weight > 0 else 65.0, explanations

        return 65.0, explanations

    def _score_location(self, user: User, candidate: User) -> Tuple[float, List[Dict]]:
        """
        Score location compatibility (0-100).

        Evaluates:
        - Preferred location/city match
        - Country preference alignment
        """
        explanations = []
        scores = []

        user_location = user.location.lower().strip() if user.location else None
        candidate_location = candidate.location.lower().strip() if candidate.location else None

        user_pref_location = None
        candidate_pref_location = None
        user_country = None
        candidate_country = None

        if user.tenant_profile and user.tenant_profile.preferences:
            user_pref_location = user.tenant_profile.preferences.location
            user_country = user.tenant_profile.preferences.country

        if candidate.tenant_profile and candidate.tenant_profile.preferences:
            candidate_pref_location = candidate.tenant_profile.preferences.location
            candidate_country = candidate.tenant_profile.preferences.country

        # Check location match
        if user_pref_location and candidate_location:
            user_pref_lower = user_pref_location.lower().strip()
            if user_pref_lower in candidate_location or candidate_location in user_pref_lower:
                scores.append(100)
                explanations.append({
                    "category": "Location",
                    "reason": f"Both interested in {candidate_location.title()}",
                    "impact": "positive",
                    "score": 100
                })
            elif self._locations_in_same_region(user_pref_lower, candidate_location):
                scores.append(75)
                explanations.append({
                    "category": "Location",
                    "reason": "Looking in similar regions",
                    "impact": "neutral",
                    "score": 75
                })
            else:
                scores.append(40)
                explanations.append({
                    "category": "Location",
                    "reason": f"Different locations ({user_pref_location} vs {candidate_location})",
                    "impact": "negative",
                    "score": 40
                })
        elif user_location and candidate_location:
            if user_location == candidate_location:
                scores.append(95)
            elif self._locations_in_same_region(user_location, candidate_location):
                scores.append(70)
            else:
                scores.append(50)

        # Check country match
        if user_country and candidate_country:
            if user_country.lower() == candidate_country.lower():
                scores.append(100)
            else:
                scores.append(30)
                explanations.append({
                    "category": "Location",
                    "reason": f"Different country preferences ({user_country} vs {candidate_country})",
                    "impact": "negative",
                    "score": 30
                })

        if not scores:
            return 60.0, [{
                "category": "Location",
                "reason": "Location preferences not specified",
                "impact": "neutral",
                "score": 60
            }]

        return sum(scores) / len(scores), explanations

    def _locations_in_same_region(self, loc1: str, loc2: str) -> bool:
        """Check if two locations are in the same region (Poland-specific)."""
        # Define regions with cities
        regions = {
            "mazowieckie": ["warsaw", "warszawa", "radom", "płock"],
            "malopolskie": ["krakow", "kraków", "tarnow", "tarnów"],
            "wielkopolskie": ["poznan", "poznań", "kalisz", "konin"],
            "pomorskie": ["gdansk", "gdańsk", "gdynia", "sopot"],
            "dolnoslaskie": ["wroclaw", "wrocław", "legnica", "wałbrzych"],
            "slaskie": ["katowice", "gliwice", "zabrze", "bielsko-biała"],
        }

        loc1_region = None
        loc2_region = None

        for region, cities in regions.items():
            if any(city in loc1 for city in cities):
                loc1_region = region
            if any(city in loc2 for city in cities):
                loc2_region = region

        return loc1_region and loc2_region and loc1_region == loc2_region

    def _score_preferences(self, user: User, candidate: User) -> Tuple[float, List[Dict]]:
        """
        Score preference compatibility (0-100).

        Evaluates:
        - Age preference alignment
        - Gender preference alignment
        - Lease duration compatibility
        - Language compatibility
        """
        explanations = []
        scores = []
        weights = []

        user_prefs = None
        candidate_prefs = None

        if user.tenant_profile and user.tenant_profile.preferences:
            user_prefs = user.tenant_profile.preferences
        if candidate.tenant_profile and candidate.tenant_profile.preferences:
            candidate_prefs = candidate.tenant_profile.preferences

        # 1. Age preference scoring
        if user_prefs and user_prefs.age_range and candidate.age:
            min_age, max_age = user_prefs.age_range[0], user_prefs.age_range[1] if len(user_prefs.age_range) > 1 else 100
            if min_age <= candidate.age <= max_age:
                scores.append(100)
                explanations.append({
                    "category": "Preferences",
                    "reason": f"Candidate age {candidate.age} within your preferred range",
                    "impact": "positive",
                    "score": 100
                })
            else:
                # Calculate how far outside the range
                if candidate.age < min_age:
                    diff = min_age - candidate.age
                else:
                    diff = candidate.age - max_age
                score = max(20, 100 - diff * 10)
                scores.append(score)
                if score < 60:
                    explanations.append({
                        "category": "Preferences",
                        "reason": f"Candidate age {candidate.age} outside your preferred {min_age}-{max_age} range",
                        "impact": "negative",
                        "score": score
                    })
            weights.append(30)

        # 2. Gender preference scoring
        if user_prefs and user_prefs.gender and candidate.gender:
            if user_prefs.gender == candidate.gender:
                scores.append(100)
            else:
                scores.append(50)  # Not preferred but not a deal-breaker
            weights.append(20)

        # 3. Lease duration compatibility
        if user_prefs and candidate_prefs:
            user_lease = user_prefs.lease_duration_months
            candidate_lease = candidate_prefs.lease_duration_months

            lease_diff = abs(user_lease - candidate_lease)
            if lease_diff == 0:
                scores.append(100)
                explanations.append({
                    "category": "Preferences",
                    "reason": f"Same lease duration preference ({user_lease} months)",
                    "impact": "positive",
                    "score": 100
                })
            elif lease_diff <= 3:
                scores.append(80)
            elif lease_diff <= 6:
                scores.append(60)
            else:
                scores.append(40)
                explanations.append({
                    "category": "Preferences",
                    "reason": f"Different lease preferences ({user_lease} vs {candidate_lease} months)",
                    "impact": "negative",
                    "score": 40
                })
            weights.append(25)

        # 4. Language compatibility
        shared_languages = self._get_shared_languages(user, candidate)
        if shared_languages:
            lang_score = min(100, 60 + len(shared_languages) * 20)
            scores.append(lang_score)
            if len(shared_languages) >= 2:
                explanations.append({
                    "category": "Preferences",
                    "reason": f"Share {len(shared_languages)} languages: {', '.join(shared_languages[:3])}",
                    "impact": "positive",
                    "score": lang_score
                })
        else:
            if user.languages and candidate.languages:
                scores.append(30)
                explanations.append({
                    "category": "Preferences",
                    "reason": "No common languages - communication may be difficult",
                    "impact": "negative",
                    "score": 30
                })
        weights.append(25)

        if not scores:
            return 60.0, [{
                "category": "Preferences",
                "reason": "Preference information incomplete",
                "impact": "neutral",
                "score": 60
            }]

        # Calculate weighted average
        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        total_weight = sum(weights)
        return weighted_sum / total_weight if total_weight > 0 else 60.0, explanations

    def _score_interests(self, user: User, candidate: User) -> Tuple[float, List[Dict]]:
        """
        Score shared interests (0-100).

        Considers:
        - Number of shared interests
        - Overlap ratio
        """
        explanations = []
        shared = self._get_shared_interests(user, candidate)
        user_interests = self._get_interests(user)
        candidate_interests = self._get_interests(candidate)

        if not user_interests:
            return 50.0, [{
                "category": "Interests",
                "reason": "No interests specified in your profile",
                "impact": "neutral",
                "score": 50
            }]

        if not candidate_interests:
            return 50.0, [{
                "category": "Interests",
                "reason": "Candidate has no interests listed",
                "impact": "neutral",
                "score": 50
            }]

        # Calculate overlap ratio with bonus for more shared interests
        total_unique = len(set(user_interests) | set(candidate_interests))
        overlap_ratio = len(shared) / total_unique if total_unique > 0 else 0

        # Base score from ratio, bonus for absolute count
        base_score = overlap_ratio * 70
        count_bonus = min(30, len(shared) * 6)  # Up to 30 points for 5+ shared
        score = min(100, base_score + count_bonus)

        if len(shared) >= 4:
            display = ", ".join(shared[:4])
            if len(shared) > 4:
                display += f" +{len(shared) - 4} more"
            explanations.append({
                "category": "Interests",
                "reason": f"Strong interest overlap: {display}",
                "impact": "positive",
                "score": round(score, 1)
            })
        elif len(shared) >= 2:
            display = ", ".join(shared)
            explanations.append({
                "category": "Interests",
                "reason": f"Share {len(shared)} interests: {display}",
                "impact": "positive",
                "score": round(score, 1)
            })
        elif len(shared) == 1:
            explanations.append({
                "category": "Interests",
                "reason": f"One shared interest: {shared[0]}",
                "impact": "neutral",
                "score": round(score, 1)
            })
        else:
            explanations.append({
                "category": "Interests",
                "reason": "No overlapping interests - different hobbies",
                "impact": "neutral",
                "score": round(score, 1)
            })

        return score, explanations

    # ==================== Helper Methods ====================

    def _get_budget(self, user: User) -> Optional[Dict]:
        """Extract budget information from user profile."""
        if user.tenant_profile and user.tenant_profile.preferences:
            budget = user.tenant_profile.preferences.budget
            if budget:
                return {
                    "min": budget.min or 0,
                    "max": budget.max or 10000,
                    "currency": budget.currency
                }
        return None

    def _get_lifestyle_prefs(self, user: User) -> Dict:
        """Extract lifestyle preferences from user profile."""
        if user.tenant_profile and user.tenant_profile.preferences:
            lp = user.tenant_profile.preferences.lifestyle_preferences
            if lp:
                return {
                    "smokes": lp.smokes,
                    "hasPets": lp.has_pets,
                    "okWithSmoking": lp.ok_with_smoking,
                    "okWithPets": lp.ok_with_pets,
                }
        return {}

    def _get_flatmate_traits(self, user: User) -> Dict:
        """Extract flatmate traits from user profile."""
        if user.tenant_profile and user.tenant_profile.flatmate_traits:
            ft = user.tenant_profile.flatmate_traits
            return {
                "cleanliness": ft.cleanliness.value if ft.cleanliness else None,
                "socialLevel": ft.social_level.value if ft.social_level else None,
                "guestsFrequency": ft.guests_frequency.value if ft.guests_frequency else None,
                "noiseTolerance": ft.noise_tolerance.value if ft.noise_tolerance else None,
                "cookingFrequency": ft.cooking_frequency.value if ft.cooking_frequency else None,
                "sharedSpaces": ft.shared_spaces or [],
            }
        return {}

    def _get_personality(self, user: User) -> List[str]:
        """Extract personality traits from user profile."""
        if user.tenant_profile and user.tenant_profile.personality:
            return [p.value for p in user.tenant_profile.personality]
        return []

    def _get_interests(self, user: User) -> List[str]:
        """Extract interests from user profile."""
        if user.tenant_profile:
            return user.tenant_profile.interests or []
        return []

    def _get_shared_interests(self, user: User, candidate: User) -> List[str]:
        """Find shared interests between two users."""
        user_interests = set(i.lower() for i in self._get_interests(user))
        candidate_interests = set(i.lower() for i in self._get_interests(candidate))
        shared = user_interests & candidate_interests
        return list(shared)

    def _get_shared_languages(self, user: User, candidate: User) -> List[str]:
        """Find shared languages between two users."""
        user_langs = set(l.lower() for l in (user.languages or []))
        candidate_langs = set(l.lower() for l in (candidate.languages or []))
        return list(user_langs & candidate_langs)

    def _get_daily_routine(self, user: User) -> Optional[Dict]:
        """Extract daily routine from user profile."""
        if user.tenant_profile and user.tenant_profile.daily_routine:
            dr = user.tenant_profile.daily_routine
            return {
                "wakeUp": dr.wake_up,
                "sleepTime": dr.sleep_time,
                "workHours": {
                    "from": dr.work_hours.from_time if dr.work_hours else None,
                    "to": dr.work_hours.to if dr.work_hours else None,
                } if dr.work_hours else None
            }
        return None

    def _calculate_range_overlap(
        self,
        min1: Optional[float],
        max1: Optional[float],
        min2: Optional[float],
        max2: Optional[float]
    ) -> float:
        """Calculate overlap ratio between two ranges (0.0 to 1.0)."""
        min1 = min1 or 0
        max1 = max1 or 100000
        min2 = min2 or 0
        max2 = max2 or 100000

        overlap_start = max(min1, min2)
        overlap_end = min(max1, max2)

        if overlap_start >= overlap_end:
            return 0.0

        overlap = overlap_end - overlap_start
        smaller_range = min(max1 - min1, max2 - min2)

        if smaller_range <= 0:
            return 1.0  # Both are point values that match

        return min(1.0, overlap / smaller_range)

    def _score_enum_distance(
        self,
        val1: Optional[str],
        val2: Optional[str],
        enum_values: List[str]
    ) -> float:
        """Score based on distance between enum values (closer = higher score)."""
        if not val1 or not val2:
            return 50.0  # Neutral if data missing

        try:
            idx1 = enum_values.index(val1)
            idx2 = enum_values.index(val2)
            distance = abs(idx1 - idx2)
            max_distance = len(enum_values) - 1

            if max_distance == 0:
                return 100.0

            # Non-linear scoring - exact match is much better than 1 step away
            if distance == 0:
                return 100.0
            elif distance == 1:
                return 80.0
            else:
                return max(20, 100 - distance * 25)
        except ValueError:
            return 50.0

    def _time_difference_hours(self, time1: str, time2: str) -> Optional[float]:
        """Calculate absolute hour difference between two time strings (HH:MM format)."""
        try:
            h1, m1 = map(int, time1.split(":"))
            h2, m2 = map(int, time2.split(":"))

            minutes1 = h1 * 60 + m1
            minutes2 = h2 * 60 + m2

            diff = abs(minutes1 - minutes2)
            # Handle wrap-around (e.g., 23:00 vs 01:00)
            diff = min(diff, 1440 - diff)

            return diff / 60
        except (ValueError, AttributeError):
            return None


# Singleton instance for easy import
matching_service = MatchingService()
