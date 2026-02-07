# Frontend Profile Completion Step Tracking Guide

## Overview

The backend returns a **percentage (0-100)** in `profileCompletionStep`, which the frontend needs to map to **step numbers** (10, 30, 50, 70, 90, 100) for navigation.

## Backend Response Structure

When updating profile, the backend returns:

```json
{
  "success": true,
  "message": "Tenant profile updated successfully",
  "data": {
    "user": {
      "id": "...",
      "profileCompletionStep": 57,  // Percentage: 0-100
      "isProfileComplete": false,
      ...
    },
    "profileCompletionStep": 57,  // Also at root level
    "isProfileComplete": false
  }
}
```

## Step Mapping Logic

The backend calculates completion as a **percentage (0-100)** based on 12 fields:

### Field Groups:
1. **Basic Information (3 fields)** - 0-25% (3/12 = 25%)
   - firstname
   - lastname
   - photo

2. **Contact Information (3 fields)** - 25-50% (6/12 = 50%)
   - phone
   - preferredContact (array)
   - location

3. **Profile Information (3 fields)** - 50-75% (9/12 = 75%)
   - age
   - gender
   - bio

4. **Tenant-Specific (3 fields)** - 75-100% (12/12 = 100%)
   - interests (array)
   - personality (array)
   - preferences (object)

### Frontend Step Numbers:
- **Step 10-29**: Basic Information (0-23%)
- **Step 30-49**: Contact Information (24-46%)
- **Step 50-69**: Tenant Preferences (47-69%)
- **Step 70-89**: Daily Routine (70-92%)
- **Step 90-100**: Languages (90-100%)

## Implementation Guide

### 1. Map Percentage to Step Number

Create a utility function to map backend percentage to frontend step:

```javascript
// utils/profileCompletion.js

/**
 * Map backend completion percentage to frontend step number
 * @param {number} percentage - Completion percentage (0-100)
 * @returns {number} - Step number (10, 30, 50, 70, 90, 100)
 */
export const mapPercentageToStep = (percentage) => {
  if (percentage >= 100) return 100;
  if (percentage >= 90) return 90;   // Languages
  if (percentage >= 70) return 70;   // Daily Routine
  if (percentage >= 50) return 50;   // Tenant Preferences
  if (percentage >= 25) return 30;   // Contact Information
  return 10;                         // Basic Information
};

/**
 * Get the next incomplete step based on completion percentage
 * @param {number} percentage - Current completion percentage
 * @returns {number} - Next step to show
 */
export const getNextIncompleteStep = (percentage) => {
  if (percentage >= 100) return 100;
  if (percentage >= 90) return 100;  // All done
  if (percentage >= 70) return 90;    // Show Languages
  if (percentage >= 50) return 70;    // Show Daily Routine
  if (percentage >= 25) return 50;   // Show Tenant Preferences
  if (percentage >= 0) return 30;    // Show Contact Information
  return 10;                         // Show Basic Information
};
```

### 2. Update Profile Completion Hook

Update your `useProfile` hook to handle the backend response:

```javascript
// hooks/useProfile.js

import { mapPercentageToStep, getNextIncompleteStep } from '../utils/profileCompletion';

export const useUpdateTenantProfile = () => {
  const updateProfileAsync = async (data, callbacks) => {
    try {
      const formData = new FormData();
      
      // Add profile data
      Object.keys(data.profileData).forEach(key => {
        const value = data.profileData[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (Array.isArray(value)) {
            value.forEach(item => formData.append(key, item));
          } else {
            formData.append(key, value);
          }
        }
      });
      
      // Add photo file if present
      if (data.photoFile) {
        formData.append('photo', data.photoFile);
      }
      
      const response = await api.put('/profile/complete-tenant', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Backend returns: { success, message, user: {...}, profileCompletionStep, isProfileComplete }
      const responseData = response.data;
      const user = responseData.user || responseData.data?.user;
      const completionPercentage = user?.profileCompletionStep || responseData.profileCompletionStep || 0;
      
      // Map percentage to step number for frontend navigation
      const stepNumber = mapPercentageToStep(completionPercentage);
      const nextStep = getNextIncompleteStep(completionPercentage);
      
      // Call success callback with mapped data
      if (callbacks?.onSuccess) {
        callbacks.onSuccess({
          ...responseData,
          user: {
            ...user,
            profileCompletionStep: completionPercentage, // Keep percentage
            mappedStep: stepNumber,                      // Add mapped step
            nextStep: nextStep,                          // Add next step
          },
          profileCompletionStep: completionPercentage,
          mappedStep: stepNumber,
          nextStep: nextStep,
        });
      }
      
      return responseData;
    } catch (error) {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  };
  
  return { updateProfileAsync };
};
```

### 3. Update Profile Completion Component

Update your `ProfileCompletionTenant` component to use the mapped step:

```javascript
// ProfileCompletionTenant.jsx

import { mapPercentageToStep, getNextIncompleteStep } from '../utils/profileCompletion';

const handleUpdateSuccess = (response) => {
  console.log('Profile update response:', response);
  
  // Extract completion data
  const user = response.user || response;
  const completionPercentage = user.profileCompletionStep || response.profileCompletionStep || 0;
  
  // Map percentage to step number
  const currentStep = mapPercentageToStep(completionPercentage);
  const nextStep = getNextIncompleteStep(completionPercentage);
  
  console.log(`Completion: ${completionPercentage}% → Step: ${currentStep}, Next: ${nextStep}`);
  
  // Update form data from response
  // ... (your existing form data update logic)
  
  // Navigate to next step
  if (completionPercentage >= 100 || response.isProfileComplete) {
    // Profile complete - navigate to dashboard
    navigate(`/tenant/${user.username}`);
  } else {
    // Update step and URL
    setCurrentStep(nextStep);
    window.history.replaceState(
      {},
      '',
      `/profile-completion/tenant?step=${nextStep}`
    );
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
```

### 4. Handle Initial Step on Component Mount

```javascript
// ProfileCompletionTenant.jsx

useEffect(() => {
  // Get completion status from backend
  const fetchCompletionStatus = async () => {
    try {
      const response = await api.get('/profile/completion-status');
      const completionPercentage = response.data.profileCompletionStep || 0;
      
      // Map percentage to step number
      const stepNumber = mapPercentageToStep(completionPercentage);
      const nextStep = getNextIncompleteStep(completionPercentage);
      
      // Use next step (not current step) to show what user needs to complete
      const stepToShow = nextStep < 100 ? nextStep : stepNumber;
      
      setCurrentStep(stepToShow);
      
      // Update URL
      window.history.replaceState(
        {},
        '',
        `/profile-completion/tenant?step=${stepToShow}`
      );
    } catch (error) {
      console.error('Error fetching completion status:', error);
      // Default to step 10 if fetch fails
      setCurrentStep(10);
    }
  };
  
  fetchCompletionStatus();
}, []);
```

### 5. Progress Bar Calculation

```javascript
// ProfileCompletionTenant.jsx

// Calculate progress percentage from backend or form data
const progressPercentage = Math.max(
  completionStatus?.profileCompletionStep || 0,  // Backend percentage
  calculateCompletion(formData)                  // Frontend calculation (fallback)
);

// Display progress bar
<div className="w-full bg-gray-200 rounded-full h-3">
  <div
    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
    style={{ width: `${progressPercentage}%` }}
  ></div>
</div>
<span className="text-sm font-medium text-gray-600">
  {progressPercentage}%
</span>
```

## Step Ranges Reference

| Step Range | Percentage Range | Fields Required | Description |
|------------|------------------|-----------------|-------------|
| **10-29** | 0-23% | firstname, lastname, photo | Basic Information |
| **30-49** | 24-46% | phone, preferredContact, location | Contact Information |
| **50-69** | 47-69% | interests, personality, preferences | Tenant Preferences |
| **70-89** | 70-92% | dailyRoutine (optional) | Daily Routine |
| **90-100** | 90-100% | languages (optional) | Languages |

## Important Notes

1. **Backend Returns Percentage**: The backend always returns a percentage (0-100), not step numbers
2. **Frontend Maps to Steps**: The frontend must map percentages to step numbers (10, 30, 50, 70, 90, 100)
3. **Always Show Next Step**: After successful update, show the **next incomplete step**, not the current one
4. **Step 100 = Complete**: When percentage is 100, profile is complete → navigate to dashboard
5. **URL Sync**: Always update the URL parameter when step changes: `/profile-completion/tenant?step={stepNumber}`

## Example Flow

1. **User submits Step 10 (Basic Info)**
   - Backend calculates: 25% (3/12 fields)
   - Frontend maps: 25% → Step 30
   - Navigate to: `/profile-completion/tenant?step=30`

2. **User submits Step 30 (Contact Info)**
   - Backend calculates: 50% (6/12 fields)
   - Frontend maps: 50% → Step 50
   - Navigate to: `/profile-completion/tenant?step=50`

3. **User submits Step 50 (Tenant Preferences)**
   - Backend calculates: 75% (9/12 fields)
   - Frontend maps: 75% → Step 70
   - Navigate to: `/profile-completion/tenant?step=70`

4. **User completes all required fields**
   - Backend calculates: 100% (12/12 fields)
   - Frontend maps: 100% → Step 100
   - Navigate to: `/tenant/{username}` (dashboard)

## Testing Checklist

- [ ] Step updates correctly after form submission
- [ ] URL parameter updates with step number
- [ ] Progress bar shows correct percentage
- [ ] Navigation to next step works
- [ ] Navigation to dashboard works when complete (100%)
- [ ] Step persists on page refresh
- [ ] Completion status fetched correctly on mount

## Debugging

Add console logs to track step mapping:

```javascript
console.log('Backend percentage:', completionPercentage);
console.log('Mapped step:', mapPercentageToStep(completionPercentage));
console.log('Next step:', getNextIncompleteStep(completionPercentage));
```

Check backend logs for completion calculation:
```bash
docker logs pokojowo-app | grep "completion"
```

## Common Issues

1. **Step not updating**: Check if `profileCompletionStep` is being extracted from response correctly
2. **Wrong step shown**: Verify the mapping function is using correct percentage ranges
3. **Step stuck**: Ensure `recalculateProfileCompletion` is called after update
4. **URL not updating**: Check if `window.history.replaceState` is being called

