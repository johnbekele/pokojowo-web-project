# Pokojowo Mobile App - AI Context

## Project Overview

React Native mobile app for Pokojowo - a flatmate/roommate matching platform for Poland. The app allows users to find compatible roommates, browse room listings, and chat with matches.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Expo SDK 52 with Dev Client |
| Language | TypeScript |
| Navigation | Expo Router (file-based routing) |
| Server State | TanStack React Query |
| Client State | Zustand |
| HTTP Client | Axios with JWT interceptors |
| Real-time | Socket.IO Client |
| Styling | NativeWind (TailwindCSS for RN) |
| Forms | React Hook Form + Zod |
| i18n | i18next (English + Polish) |
| Icons | Lucide React Native |

## Backend

**Production URL:** `https://pokojowo-web-project.onrender.com`

- REST API: `/api/*`
- WebSocket: Same URL for Socket.IO

Configured in:
- `lib/api.ts` - Axios instance
- `lib/socket.ts` - Socket.IO client
- `app.config.ts` - Environment variables

## Folder Structure

```
pokojowo-mobile/
├── app/                          # Expo Router routes (file-based)
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Entry redirect
│   ├── (auth)/                   # Auth screens (login, signup, forgot-password)
│   ├── (app)/                    # Protected app screens
│   │   ├── _layout.tsx           # Tab bar navigation
│   │   ├── (home)/               # Listings tab
│   │   ├── (matches)/            # Matching/swipe tab
│   │   ├── (chat)/               # Chat tab
│   │   ├── (profile)/            # Profile tab
│   │   └── (landlord)/           # Landlord features
│   └── onboarding/               # Onboarding flow
├── components/
│   ├── ui/                       # Base UI components (Button, Card, Input, etc.)
│   └── feature/                  # Feature-specific (chat/, listings/, matching/)
├── hooks/                        # React Query hooks
├── services/                     # API service files
├── stores/                       # Zustand stores
├── types/                        # TypeScript types
├── lib/                          # Utilities (api, socket, storage, i18n)
└── locales/                      # Translations (en/, pl/)
```

## Key Patterns

### Data Flow
```
Component → Hook (useQuery) → Service → API
```

### Archyra Guardrails (from parent project)
- Components: 150 lines max
- Hooks: 100 lines max
- Services: 200 lines max
- No fetch/axios in components - use services + React Query
- No useState for server data - use useQuery

### Authentication
- JWT tokens stored in SecureStore (`lib/storage.ts`)
- Auto token refresh in Axios interceptor (`lib/api.ts`)
- Auth state managed by `stores/authStore.ts`

### Translations
- Namespace-based: `common`, `auth`, `profile`, `listings`, `matching`, `chat`, `landlord`
- Polish plurals use `_one`, `_few`, `_many` suffixes
- Access via `useTranslation('namespace')`

## Current Status

### Completed Features
- [x] Authentication (login, signup, forgot password)
- [x] Onboarding flow with role selection
- [x] Home screen with listings
- [x] Listing detail view
- [x] Flatmate matching with swipe cards
- [x] Mutual match modal
- [x] Chat list and chat room
- [x] Profile view and edit
- [x] Settings with language switching
- [x] Favorites/saved profiles
- [x] Landlord dashboard
- [x] Create listing form
- [x] My listings management
- [x] i18n (English + Polish)

### Known Issues / Notes
1. **SafeAreaView warning** - Deprecated warning from react-native, using react-native-safe-area-context (can be ignored)
2. **Home screen uses ScrollView+map** instead of FlatList to avoid VirtualizedList key warning
3. **Swipe cards use basic Animated API** - react-native-reanimated caused Worklets errors, replaced with standard Animated

### Pending / Future Work
- [ ] Push notifications setup (Expo Notifications configured but not fully implemented)
- [ ] Biometric authentication (configured but not wired up)
- [ ] Image upload for profile/listings
- [ ] Filters modal for listings search
- [ ] EAS Build configuration for app store deployment
- [ ] Deep linking for notifications

## Running the App

```bash
cd pokojowo-mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on iOS Simulator
npx expo start --ios

# Run on Android Emulator
npx expo start --android
```

## Important Files

| File | Purpose |
|------|---------|
| `app.config.ts` | Expo config with API URLs |
| `lib/api.ts` | Axios instance with auth interceptor |
| `lib/socket.ts` | Socket.IO client for real-time |
| `lib/i18n.ts` | i18next configuration |
| `stores/authStore.ts` | Auth state management |
| `app/(app)/_layout.tsx` | Main tab bar navigation |

## Translation Keys Structure

When adding translations, ensure keys exist in both `locales/en/*.json` and `locales/pl/*.json`:

```javascript
// Correct usage
t('settings.title')           // Looks for flat key
t('settings.language')        // NOT nested object

// Wrong - returns [object Object]
// settings: { language: { title: "...", subtitle: "..." } }
```

Keep translation values as strings, not nested objects, unless the code explicitly accesses nested keys.

## Commit Style

Follow existing pattern:
- Short descriptive message
- No AI co-author attribution (per user preference)
