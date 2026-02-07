# Profile Completion Fields Documentation

## Overview
Profile completion is calculated based on required fields. A profile is considered complete when it reaches **80% completion** (at least 80% of required fields are filled).

---

## Common Fields (Required for Both Tenant & Landlord)

These fields are required for both tenant and landlord profiles:

### Basic Information
1. **username** ✅ (Already set during registration)
2. **email** ✅ (Already set during registration)
3. **firstname** - String
4. **lastname** - String
5. **photo** - File upload or URL
   - File: Upload via `multipart/form-data` with field name `photo`
   - URL: Send as `{ photo: { url: "https://..." } }`
   - Allowed formats: JPEG, PNG, GIF, WebP
   - Max size: 5MB

### Contact Information
6. **phone** - String (digits only, e.g., "1234567890")
7. **preferredContact** - Enum: `['email', 'phone', 'whatsapp', 'sms']`
8. **location** - String (city/area)

### Profile Information
9. **age** - Number (0-120)
10. **gender** - Enum: `['male', 'female', 'other']`
11. **bio** - String (max 1000 characters)

### Optional Common Fields (Not counted in completion)
- **address** - String
- **languages** - Array of strings
- **preferredLanguage** - String (default: 'pl')

---

## Tenant-Specific Fields

### Required Tenant Fields
1. **interests** - Array of strings
   - Example: `["reading", "traveling", "cooking"]`

2. **personality** - Array of strings (enum values)
   - Allowed values: `['introvert', 'extrovert', 'night_owl', 'early_bird', 'neat', 'messy', 'quiet', 'talkative']`
   - Example: `["introvert", "night_owl", "neat"]`

3. **preferences** - Object with the following structure:
   ```json
   {
     "location": "string",
     "gender": "male" | "female" | "other",
     "ageRange": [min, max],  // Array of 2 numbers
     "country": "string",
     "behavior": ["string"],  // Array of strings
     "lifestylePreferences": {
       "smokes": boolean,
       "hasPets": boolean,
       "okWithSmoking": boolean,
       "okWithPets": boolean
     },
     "budget": {
       "currency": "PLN",  // Default: "PLN"
       "min": number,
       "max": number
     },
     "leaseDurationMonths": number  // Default: 12
   }
   ```

### Optional Tenant Fields (Not counted in completion)
- **dailyRoutine** - Object:
  ```json
  {
    "wakeUp": "string",
    "sleepTime": "string",
    "workHours": {
      "from": "string",
      "to": "string"
    }
  }
  ```

---

## Landlord-Specific Fields

### Required Landlord Fields
1. **yearsOfExperience** - Number (0-50)

2. **propertyTypes** - Array of strings (enum values)
   - Allowed values: `['apartment', 'house', 'room', 'studio', 'commercial']`
   - Example: `["apartment", "room"]`

3. **servicesOffered** - Array of strings (enum values)
   - Allowed values: `['furnished', 'utilities_included', 'cleaning_service', 'maintenance', 'parking', 'gym', 'pool', 'garden']`
   - Example: `["furnished", "utilities_included", "parking"]`

4. **preferredTenantType** - Array of strings (enum values)
   - Allowed values: `['students', 'professionals', 'families', 'seniors', 'any']`
   - Example: `["students", "professionals"]`

5. **responseTime** - String (e.g., "within 24 hours", "same day")

6. **policies** - Object (can include various policy fields)

### Optional Landlord Fields (Not counted in completion)
- **companyName** - String
- **businessRegistration** - String (Tax ID or business registration number)
- **licenseNumber** - String

---

## Completion Calculation

### Tenant Profile Completion
- **Total Required Fields**: 13
  - 10 common fields
  - 3 tenant-specific fields (interests, personality, preferences)

- **Formula**: `(completedFields / 13) * 100`
- **Complete**: When `profileCompletionStep >= 80`

### Landlord Profile Completion
- **Total Required Fields**: 16
  - 10 common fields
  - 6 landlord-specific fields

- **Formula**: `(completedFields / 16) * 100`
- **Complete**: When `profileCompletionStep >= 80`

---

## API Endpoints

### Tenant Profile Completion
- **Endpoint**: `PUT /api/profile/complete-tenant`
- **Authentication**: Required (JWT token)
- **Content-Type**: `multipart/form-data` (for photo upload) or `application/json`
- **Request Body**:
  ```json
  {
    "firstname": "John",
    "lastname": "Doe",
    "photo": "file" or { "url": "https://..." },
    "phone": "1234567890",
    "preferredContact": "phone",
    "age": 25,
    "gender": "male",
    "bio": "I'm a software developer...",
    "location": "Warsaw",
    "interests": ["reading", "traveling"],
    "personality": ["introvert", "night_owl"],
    "preferences": {
      "location": "Warsaw",
      "gender": "male",
      "ageRange": [20, 30],
      "budget": {
        "currency": "PLN",
        "min": 2000,
        "max": 4000
      }
    }
  }
  ```

### Landlord Profile Completion
- **Endpoint**: `PUT /api/profile/complete-landlord`
- **Authentication**: Required (JWT token)
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "firstname": "Jane",
    "lastname": "Smith",
    "photo": { "url": "https://..." },
    "phone": "9876543210",
    "preferredContact": "email",
    "age": 35,
    "gender": "female",
    "bio": "Experienced landlord...",
    "location": "Krakow",
    "yearsOfExperience": 5,
    "propertyTypes": ["apartment", "room"],
    "servicesOffered": ["furnished", "utilities_included"],
    "preferredTenantType": ["students", "professionals"],
    "responseTime": "within 24 hours",
    "policies": {
      "deposit": "1 month",
      "notice": "30 days"
    }
  }
  ```

---

## Response Format

Both endpoints return:
```json
{
  "message": "Tenant/Landlord profile updated successfully",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "photo": { "url": "/uploads/photo/..." },
    "profileCompletionStep": 85,
    "isProfileComplete": true,
    "role": ["Tenant"],
    "tenantProfile": { ... } or "landlordProfile": { ... }
  },
  "profileCompletionStep": 85,
  "isProfileComplete": true
}
```

---

## Notes

1. **Photo Upload**: 
   - For tenant profile, photo can be uploaded as a file using `multipart/form-data`
   - Field name must be `photo`
   - File is saved to `src/uploads/photo/` directory
   - URL is automatically generated as `/uploads/photo/filename.jpg`

2. **Field Validation**:
   - All enum fields must match the allowed values
   - Phone must contain only digits
   - Age must be between 0-120
   - Bio max length is 1000 characters

3. **Partial Updates**:
   - You can update profile fields incrementally
   - Completion percentage is recalculated on each update
   - Profile is marked complete when `profileCompletionStep >= 80`

4. **Username and Email**:
   - These are set during registration and cannot be changed via profile completion
   - They are automatically counted as completed

