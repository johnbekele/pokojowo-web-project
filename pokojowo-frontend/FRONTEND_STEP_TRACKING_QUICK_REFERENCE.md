# Profile Completion Step Tracking - Quick Reference

## Key Points

1. **Backend returns percentage (0-100)**, NOT step numbers
2. **Frontend must map percentage to step numbers** (10, 30, 50, 70, 90, 100)
3. **Always show NEXT incomplete step** after successful update
4. **Update URL parameter** when step changes

## Step Mapping

```javascript
// Copy this utility function to your frontend
export const mapPercentageToStep = (percentage) => {
  if (percentage >= 100) return 100;
  if (percentage >= 90) return 90;   // Languages
  if (percentage >= 70) return 70;   // Daily Routine
  if (percentage >= 50) return 50;   // Tenant Preferences
  if (percentage >= 25) return 30;   // Contact Information
  return 10;                          // Basic Information
};

export const getNextIncompleteStep = (percentage) => {
  if (percentage >= 100) return 100;
  if (percentage >= 90) return 100;
  if (percentage >= 70) return 90;
  if (percentage >= 50) return 70;
  if (percentage >= 25) return 50;
  return 30;
};
```

## Response Structure

```javascript
// Backend response structure
{
  success: true,
  message: "Tenant profile updated successfully",
  user: {
    profileCompletionStep: 57,  // ← This is a PERCENTAGE (0-100)
    isProfileComplete: false,
    ...
  },
  profileCompletionStep: 57,  // ← Also at root level
  isProfileComplete: false
}
```

## Usage Example

```javascript
// In your handleUpdateSuccess function
const handleUpdateSuccess = (response) => {
  // Extract percentage from response
  const percentage = response.user?.profileCompletionStep || response.profileCompletionStep || 0;
  
  // Map to step number
  const nextStep = getNextIncompleteStep(percentage);
  
  // Update step and URL
  setCurrentStep(nextStep);
  window.history.replaceState(
    {},
    '',
    `/profile-completion/tenant?step=${nextStep}`
  );
};
```

## Step Ranges

| Step | Percentage Range | Fields |
|------|------------------|--------|
| **10** | 0-23% | firstname, lastname, photo |
| **30** | 24-46% | phone, preferredContact, location |
| **50** | 47-69% | interests, personality, preferences |
| **70** | 70-92% | dailyRoutine (optional) |
| **90** | 90-100% | languages (optional) |
| **100** | 100% | Complete → Navigate to dashboard |

## Quick Checklist

- [ ] Extract `profileCompletionStep` from response (it's a percentage)
- [ ] Map percentage to step number using `mapPercentageToStep()`
- [ ] Get next step using `getNextIncompleteStep()`
- [ ] Update `currentStep` state with next step
- [ ] Update URL: `/profile-completion/tenant?step={nextStep}`
- [ ] Navigate to dashboard when `percentage >= 100`

## Common Mistakes

❌ **Wrong**: Using `profileCompletionStep` directly as step number
```javascript
setCurrentStep(response.profileCompletionStep); // ❌ This is a percentage!
```

✅ **Correct**: Map percentage to step number
```javascript
const nextStep = getNextIncompleteStep(response.profileCompletionStep);
setCurrentStep(nextStep); // ✅ This is a step number!
```

## Files to Copy

1. Copy `frontend-utils/profileCompletion.js` to your frontend project
2. Import utilities in your component:
   ```javascript
   import { mapPercentageToStep, getNextIncompleteStep } from './utils/profileCompletion';
   ```

## Full Guide

See `FRONTEND_PROFILE_COMPLETION_GUIDE.md` for complete implementation details.

