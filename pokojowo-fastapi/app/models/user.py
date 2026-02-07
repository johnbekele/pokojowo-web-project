from beanie import Document, Indexed
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    USER = "User"
    ADMIN = "Admin"
    MODERATOR = "Moderator"
    LANDLORD = "Landlord"
    TENANT = "Tenant"
    AGENT = "Agent"


class IndustryEnum(str, Enum):
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    EDUCATION = "education"
    HOSPITALITY = "hospitality"
    MARKETING = "marketing"
    SALES = "sales"
    CUSTOMER_SUPPORT = "customer_support"
    CONSTRUCTION = "construction"
    RETAIL = "retail"
    REAL_ESTATE = "real_estate"
    LEGAL = "legal"
    ENGINEERING = "engineering"
    DESIGN = "design"
    CONSULTING = "consulting"
    RESEARCH = "research"
    TRANSPORTATION = "transportation"
    STUDENT = "student"
    OTHER = "other"


class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class PersonalityEnum(str, Enum):
    INTROVERT = "introvert"
    EXTROVERT = "extrovert"
    NIGHT_OWL = "night_owl"
    EARLY_BIRD = "early_bird"
    NEAT = "neat"
    MESSY = "messy"
    QUIET = "quiet"
    TALKATIVE = "talkative"


class CleanlinessEnum(str, Enum):
    VERY_CLEAN = "very_clean"
    CLEAN = "clean"
    MODERATE = "moderate"
    RELAXED = "relaxed"
    MESSY = "messy"


class SocialLevelEnum(str, Enum):
    VERY_SOCIAL = "very_social"
    SOCIAL = "social"
    MODERATE = "moderate"
    QUIET = "quiet"
    VERY_QUIET = "very_quiet"


class GuestsFrequencyEnum(str, Enum):
    OFTEN = "often"
    SOMETIMES = "sometimes"
    RARELY = "rarely"
    NEVER = "never"


class NoiseToleranceEnum(str, Enum):
    VERY_TOLERANT = "very_tolerant"
    TOLERANT = "tolerant"
    MODERATE = "moderate"
    SENSITIVE = "sensitive"
    VERY_SENSITIVE = "very_sensitive"


class CookingFrequencyEnum(str, Enum):
    DAILY = "daily"
    OFTEN = "often"
    SOMETIMES = "sometimes"
    RARELY = "rarely"
    NEVER = "never"


class PhotoModel(BaseModel):
    url: Optional[str] = None


class JobModel(BaseModel):
    industry: Optional[IndustryEnum] = None
    title: Optional[str] = None


class WorkHoursModel(BaseModel):
    from_time: Optional[str] = Field(None, alias="from")
    to: Optional[str] = None


class DailyRoutineModel(BaseModel):
    wake_up: Optional[str] = Field(None, alias="wakeUp")
    sleep_time: Optional[str] = Field(None, alias="sleepTime")
    work_hours: Optional[WorkHoursModel] = Field(None, alias="workHours")


class LifestylePreferencesModel(BaseModel):
    smokes: Optional[bool] = None
    has_pets: Optional[bool] = Field(None, alias="hasPets")
    ok_with_smoking: Optional[bool] = Field(None, alias="okWithSmoking")
    ok_with_pets: Optional[bool] = Field(None, alias="okWithPets")


class BudgetModel(BaseModel):
    currency: str = "PLN"
    min: Optional[float] = None
    max: Optional[float] = None


class PreferencesModel(BaseModel):
    location: Optional[str] = None
    gender: Optional[GenderEnum] = None
    age_range: Optional[List[int]] = Field(None, alias="ageRange")
    country: Optional[str] = None
    behavior: List[str] = []
    lifestyle_preferences: Optional[LifestylePreferencesModel] = Field(None, alias="lifestylePreferences")
    budget: Optional[BudgetModel] = None
    lease_duration_months: int = Field(12, alias="leaseDurationMonths")


class FlatmateTraitsModel(BaseModel):
    cleanliness: Optional[CleanlinessEnum] = None
    social_level: Optional[SocialLevelEnum] = Field(None, alias="socialLevel")
    study_work_habits: Optional[str] = Field(None, alias="studyWorkHabits")
    guests_frequency: Optional[GuestsFrequencyEnum] = Field(None, alias="guestsFrequency")
    cooking_frequency: Optional[CookingFrequencyEnum] = Field(None, alias="cookingFrequency")
    noise_tolerance: Optional[NoiseToleranceEnum] = Field(None, alias="noiseTolerance")
    shared_spaces: List[str] = Field([], alias="sharedSpaces")


class DealBreakersModel(BaseModel):
    """Hard constraints that result in immediate match rejection."""
    no_smokers: bool = Field(False, alias="noSmokers")
    no_pets: bool = Field(False, alias="noPets")
    no_parties: bool = Field(False, alias="noParties")
    same_gender_only: bool = Field(False, alias="sameGenderOnly")
    quiet_hours_required: bool = Field(False, alias="quietHoursRequired")
    min_age: Optional[int] = Field(None, alias="minAge")
    max_age: Optional[int] = Field(None, alias="maxAge")
    min_cleanliness: Optional[CleanlinessEnum] = Field(None, alias="minCleanliness")
    max_budget: Optional[float] = Field(None, alias="maxBudget")


class TenantProfileModel(BaseModel):
    interests: List[str] = []
    personality: List[PersonalityEnum] = []
    daily_routine: Optional[DailyRoutineModel] = Field(None, alias="dailyRoutine")
    preferences: Optional[PreferencesModel] = None
    flatmate_traits: Optional[FlatmateTraitsModel] = Field(None, alias="flatmateTraits")
    deal_breakers: Optional[DealBreakersModel] = Field(None, alias="dealBreakers")


class PoliciesModel(BaseModel):
    pets_allowed: bool = Field(False, alias="petsAllowed")
    smoking_allowed: bool = Field(False, alias="smokingAllowed")
    parties_allowed: bool = Field(False, alias="partiesAllowed")
    minimum_lease_term: int = Field(6, alias="minimumLeaseTerm")
    security_deposit: int = Field(1, alias="securityDeposit")


class VerificationDocumentModel(BaseModel):
    type: Optional[str] = None
    url: Optional[str] = None
    status: str = "pending"


class VerificationModel(BaseModel):
    is_verified_landlord: bool = Field(False, alias="isVerifiedLandlord")
    verification_documents: List[VerificationDocumentModel] = Field([], alias="verificationDocuments")
    license_number: Optional[str] = Field(None, alias="licenseNumber")


class StatisticsModel(BaseModel):
    total_properties: int = Field(0, alias="totalProperties")
    active_listings: int = Field(0, alias="activeListings")
    successful_rentals: int = Field(0, alias="successfulRentals")
    average_rating: float = Field(0.0, alias="averageRating")
    total_reviews: int = Field(0, alias="totalReviews")


class LandlordProfileModel(BaseModel):
    company_name: Optional[str] = Field(None, alias="companyName")
    business_registration: Optional[str] = Field(None, alias="businessRegistration")
    years_of_experience: Optional[int] = Field(None, alias="yearsOfExperience")
    property_types: List[str] = Field([], alias="propertyTypes")
    services_offered: List[str] = Field([], alias="servicesOffered")
    preferred_tenant_type: List[str] = Field(["any"], alias="preferredTenantType")
    response_time: str = Field("within_24h", alias="responseTime")
    policies: Optional[PoliciesModel] = None
    verification: Optional[VerificationModel] = None
    statistics: Optional[StatisticsModel] = None


class AutoReplyModel(BaseModel):
    enabled: bool = False
    message: Optional[str] = None


class ChatSettingsModel(BaseModel):
    allow_messages: bool = Field(True, alias="allowMessages")
    auto_reply: Optional[AutoReplyModel] = Field(None, alias="autoReply")
    blocked_users: List[str] = Field([], alias="blockedUsers")


class EmailNotificationsModel(BaseModel):
    new_messages: bool = Field(True, alias="newMessages")
    property_updates: bool = Field(True, alias="propertyUpdates")
    match_notifications: bool = Field(True, alias="matchNotifications")
    marketing_emails: bool = Field(False, alias="marketingEmails")


class PushNotificationsModel(BaseModel):
    new_messages: bool = Field(True, alias="newMessages")
    property_updates: bool = Field(True, alias="propertyUpdates")
    match_notifications: bool = Field(True, alias="matchNotifications")


class NotificationPreferencesModel(BaseModel):
    email: Optional[EmailNotificationsModel] = None
    push: Optional[PushNotificationsModel] = None


class ViolationHistoryModel(BaseModel):
    reason: Optional[str] = None
    date: Optional[datetime] = None
    resolved: Optional[bool] = None


class FlaggedCommentsModel(BaseModel):
    amount: int = 0


class User(Document):
    # Basic Info
    alias: Optional[str] = None
    username: Indexed(str, unique=True)
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    email: Indexed(EmailStr, unique=True)
    password: Optional[str] = None

    # Profile completion
    is_profile_complete: bool = Field(False, alias="isProfileComplete")
    profile_completion_step: int = Field(0, alias="profileCompletionStep")

    # OAuth
    google_id: Optional[Indexed(str, unique=True, sparse=True)] = Field(None, alias="googleId")

    # Verification
    is_verified: bool = Field(False, alias="isVerified")
    verification_token: Optional[str] = Field(None, alias="verificationToken")
    verification_token_expires: Optional[datetime] = Field(None, alias="verificationTokenExpires")
    reset_password_token: Optional[str] = Field(None, alias="resetPasswordToken")
    reset_password_expires: Optional[datetime] = Field(None, alias="resetPasswordExpires")

    # Photo
    photo: Optional[PhotoModel] = None

    # Contact Info
    phone: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    preferred_contact: List[str] = Field([], alias="preferredContact")

    # Language
    languages: List[str] = []
    preferred_language: Optional[str] = Field(default="pl", alias="preferredLanguage")

    # Profile Info
    age: Optional[int] = None
    gender: Optional[GenderEnum] = None
    bio: Optional[str] = None
    job: Optional[JobModel] = None

    # Tenant/Landlord Profiles
    tenant_profile: Optional[TenantProfileModel] = Field(None, alias="tenantProfile")
    landlord_profile: Optional[LandlordProfileModel] = Field(None, alias="landlordProfile")

    # AI Matching
    match_score: Optional[float] = Field(None, alias="matchScore")
    embedding_vector: Optional[List[float]] = Field(None, alias="embeddingVector")

    # System & Security
    refresh_token: Optional[str] = Field(None, alias="refreshToken")
    role: List[RoleEnum] = [RoleEnum.USER]
    is_active: bool = Field(True, alias="isActive")
    freez: Optional[bool] = None

    # Moderation & Trust
    flagged_comments: Optional[FlaggedCommentsModel] = Field(None, alias="flaggedComments")
    trust_score: float = Field(0.0, alias="trustScore")
    violation_history: List[ViolationHistoryModel] = Field([], alias="violationHistory")

    # Activity Tracking
    last_login: Optional[datetime] = Field(None, alias="lastLogin")
    last_active: Optional[datetime] = Field(None, alias="lastActive")
    is_online: bool = Field(False, alias="isOnline")

    # Chat & Communication
    chat_settings: Optional[ChatSettingsModel] = Field(None, alias="chatSettings")

    # Notifications
    notification_preferences: Optional[NotificationPreferencesModel] = Field(None, alias="notificationPreferences")

    # Flexible fields
    other_details: Optional[dict] = Field(None, alias="otherDetails")

    # Timestamps
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Settings:
        name = "users"
        use_state_management = True

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "firstname": "John",
                "lastname": "Doe",
                "role": ["User"]
            }
        }

    # Helper methods
    def has_role(self, role: RoleEnum) -> bool:
        return role in self.role

    def add_role(self, role: RoleEnum):
        if role not in self.role:
            self.role.append(role)

    def remove_role(self, role: RoleEnum):
        if role in self.role:
            self.role.remove(role)

    @property
    def full_name(self) -> str:
        if self.firstname and self.lastname:
            return f"{self.firstname} {self.lastname}".strip()
        return ""

    @property
    def is_landlord(self) -> bool:
        return RoleEnum.LANDLORD in self.role

    @property
    def is_tenant(self) -> bool:
        return RoleEnum.TENANT in self.role
