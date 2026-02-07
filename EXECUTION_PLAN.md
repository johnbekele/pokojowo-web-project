# GlobalRoom (Pokojowo) - Feature Execution Plan

## Project Overview

**GlobalRoom/Pokojowo** is an AI-enhanced roommate matching and rental support platform for international students, workers, and travelers. The platform combines personality-based matching algorithms with AI-powered communication tools.

### Project Vision (from project_context.md)
- AI-based roommate compatibility matching using personality traits, lifestyle preferences, and behavioral factors
- Real-time translation for chat messages
- AI-powered landlord communication assistant
- Rental contract analysis
- Premium features (subscription-based monetization)

### Current Implementation Status

**✅ Backend (FastAPI) - Completed**
- Authentication system (JWT + refresh tokens)
- User profiles (tenant & landlord)
- Listings CRUD with filtering
- Chat/messaging infrastructure (WebSocket/Socket.IO)
- File uploads
- Models prepared for AI (embedding_vector, match_score fields exist)

**⚠️ Backend - Missing Core Features**
- AI matching algorithm (embedding generation + scoring)
- Services layer architecture (app/services/ is empty)
- Email notifications
- Complete Google OAuth
- Translation service integration
- Contract analysis

**✅ Frontend (React) - Completed**
- Authentication flows (login, signup, verification)
- Multi-step tenant profile completion (6 steps)
- Listing display with cards
- i18n support (English/Polish)
- Google OAuth (frontend ready)

**⚠️ Frontend - Missing Core Features**
- Matching/recommendations UI
- Real-time chat interface
- Landlord dashboard
- Listing detail page
- Advanced search & filters
- Subscription/premium page

---

# PROJECT STRUCTURE

## Backend Directory Structure
```
pokojowo-fastapi/
├── app/
│   ├── services/           # ⚠️ EMPTY - needs implementation
│   │   ├── ai_service.py
│   │   ├── matching_service.py
│   │   ├── email_service.py
│   │   └── translation_service.py
│   ├── ml/                 # NEW - machine learning
│   │   ├── embeddings.py
│   │   └── similarity.py
│   └── api/v1/endpoints/
│       └── matching.py     # NEW - matching endpoints
```

## Frontend Directory Structure
```
pokojowo-frontend/src/
├── pages/
│   ├── matching/           # NEW - matching pages
│   │   ├── MatchesPage.jsx
│   │   └── MatchDetailPage.jsx
│   ├── chat/              # NEW - chat pages
│   │   └── ChatPage.jsx
│   └── landlord/          # NEW - landlord features
│       └── LandlordDashboard.jsx
├── components/
│   ├── matching/          # NEW
│   │   ├── MatchCard.jsx
│   │   └── CompatibilityChart.jsx
│   └── chat/             # NEW
│       ├── ChatSidebar.jsx
│       └── MessageBubble.jsx
├── services/
│   ├── matchingService.js # NEW
│   └── chatService.js     # NEW
└── hooks/
    ├── useMatches.js      # NEW
    └── useChat.js         # NEW
```

---

# BACKEND FEATURES

## Feature 1: AI Matching Service

**Priority**: HIGH | **Complexity**: HIGH | **Estimated Time**: 2 weeks

### Purpose
Generate embedding vectors for user profiles and calculate compatibility scores between potential roommates.

### Critical Files

**app/services/ai_service.py** (NEW)
- Purpose: Core AI service managing Google Gemini API
- Key methods:
  - `generate_embedding(text: str) -> List[float]` - Generate 768-dim embedding
  - `generate_profile_text(user_data: dict) -> str` - Convert profile to text
  - `translate_text()` - Translation functionality
  - `improve_message()` - AI message enhancement

**app/ml/embeddings.py** (NEW)
- Purpose: Profile vectorization logic
- Key methods:
  - `build_tenant_profile_text(profile)` - Convert profile to embedding-ready text
  - `calculate_weighted_profile()` - Assign importance weights to factors

**app/ml/similarity.py** (NEW)
- Purpose: Similarity calculations
- Key methods:
  - `cosine_similarity(vec1, vec2)` - Embedding similarity
  - `weighted_compatibility_score()` - Attribute-based scoring
  - `combined_score()` - Blend embedding + attribute scores

**app/services/matching_service.py** (NEW)
- Purpose: Roommate matching algorithm
- Key methods:
  - `find_matches(user_id, limit, min_score)` - Find compatible roommates
  - `calculate_match_score(user1, user2)` - Detailed compatibility analysis
  - `generate_match_explanation()` - AI-generated explanation
  - `update_user_embedding(user)` - Regenerate embedding on profile update

**app/api/v1/endpoints/matching.py** (NEW)
- Endpoints:
  - `GET /api/matching/matches` - Get recommended matches
  - `GET /api/matching/matches/{user_id}` - Detailed compatibility
  - `POST /api/matching/matches/refresh` - Regenerate embeddings
  - `PUT /api/matching/matches/preferences` - Update matching weights

**app/schemas/matching.py** (NEW)
- Response models: MatchResponse, MatchDetailResponse, CompatibilityFactors

### Implementation Steps
1. Install Google Generative AI SDK: `pip install google-generativeai`
2. Create AIService with Gemini client initialization
3. Implement embedding generation using gemini-embedding-001 model
4. Build ProfileEmbedding class to convert user data to text
5. Implement SimilarityCalculator with cosine similarity
6. Create MatchingService with find_matches algorithm
7. Add matching API endpoints
8. Update User model to populate embedding_vector field
9. Create background task to update embeddings on profile changes
10. Write unit tests for scoring algorithms

### Scoring Algorithm
```
Final Match Score =
  embedding_similarity * 0.4 +
  sleep_schedule_match * 0.2 +
  cleanliness_match * 0.2 +
  personality_match * 0.1 +
  interests_overlap * 0.1
```

### Integration Points
- User.embedding_vector field (already exists in model)
- Profile completion trigger (update embedding after profile complete)
- Premium users get priority in match results

---

## Feature 2: Email Notification Service

**Priority**: HIGH | **Complexity**: MEDIUM | **Estimated Time**: 3-4 days

### Purpose
Send transactional emails for account verification, password resets, and match notifications.

### Critical Files

**app/services/email_service.py** (NEW)
- Purpose: SMTP email sending with templates
- Key methods:
  - `send_email(to_email, subject, html_content)` - Core sending
  - `send_verification_email()` - Account verification
  - `send_password_reset_email()` - Password reset
  - `send_new_match_notification()` - New match alerts
  - `send_message_notification()` - New message alerts

**app/templates/emails/** (NEW DIRECTORY)
- verification.html - Email verification template
- password_reset.html - Password reset template
- new_match.html - Match notification template
- new_message.html - Message notification template

**app/api/v1/endpoints/auth.py** (MODIFY)
- Add email sending after user registration
- Add email sending in password reset flow

### Implementation Steps
1. Install Jinja2 for templates: `pip install jinja2`
2. Create EmailService class with SMTP configuration
3. Implement send_email() with error handling and retry logic
4. Set up Jinja2 template environment
5. Create HTML email templates
6. Update auth endpoints to send verification emails
7. Generate and store verification tokens (JWT or Redis)
8. Add verification endpoint to process tokens
9. Implement password reset email flow
10. Create daily digest for new matches (background task)

### Configuration Required
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in settings
- EMAIL_FROM address
- FRONTEND_URL for verification links

---

## Feature 3: Google OAuth Completion

**Priority**: MEDIUM | **Complexity**: LOW | **Estimated Time**: 1 day

### Purpose
Complete Google OAuth integration (frontend button already exists).

### Critical Files

**app/api/v1/endpoints/auth.py** (MODIFY)
- Complete `google_login()` endpoint - return authorization URL
- Complete `google_callback()` endpoint - exchange code for tokens, create/login user

**app/models/user.py** (MODIFY)
- Add fields: `google_id: Optional[str]`, `auth_provider: str`, `email_verified: bool`

### Implementation Steps
1. Install google-auth: `pip install google-auth google-auth-oauthlib`
2. Implement google_login() to generate OAuth URL
3. Implement google_callback() to:
   - Exchange authorization code for tokens
   - Verify ID token with Google
   - Extract user info (email, name, profile picture)
   - Find or create user in database
   - Set email_verified=True for Google users
   - Generate JWT tokens
4. Add google_id and auth_provider fields to User model
5. Test OAuth flow end-to-end

---

## Feature 4: Translation Service

**Priority**: MEDIUM | **Complexity**: MEDIUM | **Estimated Time**: 3-4 days

### Purpose
Real-time translation of chat messages and AI-powered message improvement for landlord communication.

### Critical Files

**app/services/translation_service.py** (NEW)
- Purpose: Translation and message improvement
- Key methods:
  - `translate(text, source_lang, target_lang)` - Translate text
  - `improve_message_for_landlord()` - Enhance message tone/content
  - `detect_language()` - Auto-detect language

**app/api/v1/endpoints/translation.py** (NEW)
- Endpoints:
  - `POST /api/translation/translate` - Translate text
  - `POST /api/translation/improve` - Improve message (premium)

### Implementation Steps
1. Create TranslationService using AIService
2. Implement translate() with Gemini
3. Create structured prompts for message improvement
4. Add translation endpoints
5. Implement premium check for improve endpoint
6. Add rate limiting to control AI API costs
7. Cache common translations in Redis

---

## Feature 5: Contract Analysis Service

**Priority**: LOW (Premium Feature) | **Complexity**: MEDIUM | **Estimated Time**: 3-4 days

### Purpose
AI-powered analysis of rental contracts to highlight risks and important clauses.

### Critical Files

**app/services/contract_analysis_service.py** (NEW)
- Purpose: PDF contract analysis
- Key methods:
  - `extract_text_from_pdf(pdf_bytes)` - Extract text from PDF
  - `analyze_contract(contract_text, country)` - AI analysis
  - `compare_to_standard()` - Compare to standard practices

**app/api/v1/endpoints/contracts.py** (NEW)
- Endpoints:
  - `POST /api/contracts/analyze` - Upload and analyze contract

### Implementation Steps
1. Install PyPDF2: `pip install PyPDF2`
2. Create ContractAnalysisService
3. Implement PDF text extraction
4. Create comprehensive analysis prompt for Gemini
5. Implement analyze_contract() with structured JSON output
6. Add file upload endpoint with type validation
7. Add premium feature check
8. Return analysis with risks, action items, unusual terms

---

## Feature 6: Services Layer Architecture

**Priority**: HIGH | **Complexity**: LOW | **Estimated Time**: 2 days

### Purpose
Refactor business logic from endpoints into services layer for better organization.

### Implementation Strategy
Currently, business logic is embedded in API endpoints. Extract to services:
- app/services/user_service.py - User operations
- app/services/listing_service.py - Listing operations
- app/services/chat_service.py - Chat operations

Update endpoints to call services instead of direct database operations.

---

# FRONTEND FEATURES

## Feature 1: Matching UI

**Priority**: HIGH | **Complexity**: MEDIUM | **Estimated Time**: 1.5 weeks

### Purpose
Display AI-powered roommate matches with compatibility scores and detailed analysis.

### Critical Files

**src/pages/matching/MatchesPage.jsx** (NEW)
- Purpose: Main matches page
- Features:
  - List of matched users with scores
  - Filter by minimum score
  - Sort options (best match, newest, location)
  - Refresh matches button

**src/components/matching/MatchCard.jsx** (NEW)
- Purpose: Individual match card
- Displays: Profile photo, name, age, match score, shared interests, summary

**src/pages/matching/MatchDetailPage.jsx** (NEW)
- Purpose: Detailed compatibility analysis
- Features:
  - Large match score display
  - Compatibility breakdown chart
  - AI-generated explanation
  - Shared interests
  - Potential conflicts
  - "Send Message" button

**src/components/matching/CompatibilityChart.jsx** (NEW)
- Purpose: Visual compatibility breakdown
- Shows horizontal bars for each factor (sleep, cleanliness, personality, etc.)

**src/hooks/useMatches.js** (NEW)
- Custom hook to fetch matches using React Query
- Accepts filters: minScore, sortBy, limit

**src/services/matchingService.js** (NEW)
- API calls:
  - `getMatches({ minScore, sortBy, limit })`
  - `getMatchDetail(userId)`
  - `refreshMatches()`
  - `updateMatchPreferences(preferences)`

### Implementation Steps
1. Create MatchesPage component with filter state
2. Implement useMatches hook with React Query
3. Create matchingService API methods
4. Build MatchCard component with score color coding
5. Add MatchDetailPage with detailed analysis
6. Create CompatibilityChart with horizontal bars
7. Add navigation from MatchCard to MatchDetailPage
8. Implement refresh functionality
9. Add empty state handling
10. Make responsive for mobile

### Integration Points
- Backend API: GET /api/matching/matches
- Backend API: GET /api/matching/matches/{user_id}
- Navigation to chat when "Send Message" clicked

---

## Feature 2: Real-Time Chat Interface

**Priority**: HIGH | **Complexity**: HIGH | **Estimated Time**: 2 weeks

### Purpose
WebSocket-based chat with translation support and AI message improvement.

### Critical Files

**src/pages/chat/ChatPage.jsx** (NEW)
- Purpose: Main chat page with split layout
- Layout: Chat sidebar (left) + Conversation view (right)

**src/components/chat/ChatSidebar.jsx** (NEW)
- Purpose: Conversation list
- Features: Search, unread indicators, last message preview

**src/pages/chat/ConversationView.jsx** (NEW)
- Purpose: Active conversation
- Features: Message list, auto-scroll, typing indicator, translation toggle

**src/components/chat/MessageBubble.jsx** (NEW)
- Purpose: Individual message display
- Different styles for sent vs received messages

**src/components/chat/ChatInput.jsx** (NEW)
- Purpose: Message composer
- Features: Text input, send button, AI improve button (premium), emoji picker

**src/components/chat/TranslationToggle.jsx** (NEW)
- Toggle button to enable/disable real-time translation

**src/components/chat/MessageImprover.jsx** (NEW)
- Modal to improve message with AI before sending (premium)

**src/hooks/useWebSocket.js** (NEW)
- Custom hook for Socket.IO connection
- Manages connection state and event listeners

**src/hooks/useChat.js** (NEW)
- Manages chat state (conversations, active conversation)

**src/services/chatService.js** (NEW)
- API methods:
  - `getConversations()`
  - `getMessages(conversationId)`
  - `sendMessage(conversationId, content)`
  - `markAsRead(conversationId)`

### Implementation Steps
1. Install socket.io-client: `npm install socket.io-client`
2. Create useWebSocket hook with connection logic
3. Build ChatPage with split layout
4. Create ChatSidebar with conversation list
5. Implement ConversationView with message display
6. Build MessageBubble component
7. Create ChatInput with send functionality
8. Add TranslationToggle component
9. Implement MessageImprover modal for premium users
10. Connect WebSocket events (new_message, typing, read_receipt)
11. Add auto-scroll to latest message
12. Implement unread count tracking
13. Make responsive (collapse sidebar on mobile)

### WebSocket Events
- `connect` - Connection established
- `disconnect` - Connection lost
- `new_message` - Receive new message
- `typing` - User is typing indicator
- `read_receipt` - Message read confirmation

---

## Feature 3: Listing Detail Page

**Priority**: HIGH | **Complexity**: MEDIUM | **Estimated Time**: 4-5 days

### Purpose
Full property listing view with image gallery, map, amenities, and contact options.

### Critical Files

**src/pages/listings/ListingDetailPage.jsx** (NEW)
- Purpose: Full listing detail page
- Features:
  - Image gallery with lightbox
  - Property details (size, price, type)
  - Bilingual description
  - Amenities list
  - Map showing location
  - Owner information
  - "Contact Owner" and "Save Listing" buttons

**src/components/listings/ImageGallery.jsx** (NEW)
- Image carousel with thumbnails
- Lightbox view for full-screen images

**src/components/listings/MapView.jsx** (NEW)
- Embedded map showing property location
- Use Google Maps or Mapbox

### Implementation Steps
1. Create ListingDetailPage component
2. Use useParams to get listing ID from URL
3. Fetch listing details with React Query
4. Build ImageGallery with carousel
5. Display property details with icons
6. Show description (select language from i18n context)
7. List nearby places as badges
8. Add MapView component
9. Create sticky booking card on right
10. Display owner information
11. Add "Contact Owner" button (navigates to chat)
12. Implement "Save Listing" functionality
13. Make responsive (stack on mobile)

### Integration Points
- Backend API: GET /api/listings/{listingId}
- Navigate to chat on "Contact Owner"
- Current language from i18n context

---

## Feature 4: Advanced Search & Filters

**Priority**: MEDIUM | **Complexity**: MEDIUM | **Estimated Time**: 3-4 days

### Purpose
Advanced search with multiple filters for listings.

### Critical Files

**src/components/listings/SearchFilters.jsx** (NEW)
- Purpose: Filter panel
- Filters:
  - Location (text input)
  - Price range (slider)
  - Size range (slider)
  - Room type (checkboxes)
  - Building type (checkboxes)
  - Available from (date picker)
  - Rent for only (checkboxes)

**src/pages/listings/SearchListingsPage.jsx** (MODIFY HomeListings.jsx)
- Add SearchFilters component
- Apply filters to listings query
- Show filter count badge

### Implementation Steps
1. Create SearchFilters component with state
2. Implement price range slider (use shadcn/ui or similar)
3. Add room type checkboxes
4. Add building type checkboxes
5. Implement location text search
6. Add date picker for available from
7. Create "Clear All Filters" button
8. Debounce filter changes to avoid excessive API calls
9. Update listings query to include filters
10. Display active filter count
11. Show "No results" state with suggestions

---

## Feature 5: Landlord Dashboard

**Priority**: MEDIUM | **Complexity**: MEDIUM | **Estimated Time**: 1 week

### Purpose
Dashboard for landlords to manage listings and view inquiries.

### Critical Files

**src/pages/landlord/LandlordDashboard.jsx** (NEW)
- Purpose: Main landlord dashboard
- Features:
  - Stats cards (listings, views, inquiries)
  - Recent inquiries list
  - Active listings management
  - "Create Listing" button

**src/pages/landlord/CreateListingPage.jsx** (NEW)
- Multi-step form to create new listing
- Steps: Location, Details, Photos, Description, Preferences

**src/pages/landlord/MyListingsPage.jsx** (NEW)
- Table/grid of landlord's listings
- Actions: Edit, Delete, View analytics

**src/components/landlord/ListingForm.jsx** (NEW)
- Reusable form for create/edit listing

**src/services/landlordService.js** (NEW)
- API methods:
  - `getStats()`
  - `createListing(data)`
  - `updateListing(id, data)`
  - `deleteListing(id)`
  - `getInquiries()`

### Implementation Steps
1. Create LandlordDashboard with stats cards
2. Fetch landlord stats from backend
3. Build CreateListingPage with multi-step form
4. Implement image upload with preview
5. Add bilingual description inputs (EN/PL)
6. Create MyListingsPage with listing grid
7. Add edit/delete actions
8. Implement inquiry list
9. Add "Contact Tenant" from inquiry

---

## Feature 6: Subscription & Premium Features

**Priority**: MEDIUM | **Complexity**: MEDIUM | **Estimated Time**: 4-5 days

### Purpose
Subscription management and premium feature showcase.

### Critical Files

**src/pages/premium/SubscriptionPage.jsx** (NEW)
- Purpose: Subscription management
- Features:
  - Current subscription status
  - Pricing cards (free vs premium)
  - Feature comparison table
  - Upgrade/cancel buttons

**src/components/premium/PremiumBadge.jsx** (NEW)
- Badge to indicate premium features

**src/components/premium/FeatureUpsell.jsx** (NEW)
- Modal shown when free user tries premium feature

**src/hooks/useSubscription.js** (NEW)
- Custom hook for subscription status

**src/contexts/SubscriptionContext.jsx** (NEW)
- Global subscription state

### Implementation Steps
1. Create SubscriptionPage with pricing cards
2. Build feature comparison table
3. Fetch subscription status with hook
4. Display current plan with expiry date
5. Implement upgrade button (link to Stripe checkout)
6. Add cancel subscription functionality
7. Create PremiumBadge component
8. Build FeatureUpsell modal
9. Add premium checks to gated features
10. Show billing history section

### Premium Features to Gate
- Unlimited AI translation (free: 10/month)
- Message improvement assistant
- Contract analysis
- Priority in search results
- Advanced compatibility insights

---

# INTEGRATION CHECKLIST

## Backend ↔ Frontend Data Flow
- [ ] API responses use consistent field naming
- [ ] Error responses follow standard format
- [ ] Success responses include data + status
- [ ] Pagination implemented for lists
- [ ] Rate limiting configured

## WebSocket Integration
- [ ] Backend Socket.IO CORS includes frontend origin
- [ ] JWT authentication in Socket.IO handshake
- [ ] Event names match between backend and frontend
- [ ] Connection state handled gracefully
- [ ] Reconnection logic implemented

## File Uploads
- [ ] Frontend uploads to /api/upload endpoints
- [ ] Backend returns file URL
- [ ] Supported file types validated
- [ ] Max file size enforced
- [ ] Images optimized/resized

## Translation Flow
- [ ] Frontend calls /api/translation/translate
- [ ] Language codes consistent (ISO 639-1)
- [ ] Translation cached for performance
- [ ] Premium users have unlimited translations
- [ ] Free users see usage counter

---

# TESTING STRATEGY

## Backend Testing
- **Unit Tests**: Services, ML functions, similarity calculations
- **Integration Tests**: API endpoints with test database
- **WebSocket Tests**: Real-time message delivery
- **AI Service Tests**: Mock Gemini API responses

## Frontend Testing
- **Component Tests**: React Testing Library for components
- **Integration Tests**: Page flows (login → profile → matching)
- **E2E Tests**: Playwright/Cypress for critical user flows

---

# DEPLOYMENT PLAN

## Development
- Docker Compose for local development
- Hot reload enabled for both backend and frontend
- MongoDB Atlas for database

## Production
- **Backend**: Deploy to AWS/GCP/DigitalOcean
- **Frontend**: Deploy to Vercel/Netlify
- **Database**: MongoDB Atlas with backups
- **CDN**: CloudFront for static assets
- **Monitoring**: Sentry for error tracking

---

# PRIORITY ROADMAP

## Phase 1: MVP (4 weeks)
1. Week 1: Backend AI Services (matching, embeddings)
2. Week 2: Frontend Matching UI
3. Week 3: Chat Implementation
4. Week 4: Email & OAuth

## Phase 2: Marketplace (4 weeks)
5. Week 5: Translation Service
6. Week 6: Listing Features (detail, search)
7. Week 7: Landlord Dashboard
8. Week 8: Subscription System

## Phase 3: Polish (4 weeks)
9. Week 9: Contract Analysis
10. Week 10: Admin Panel
11. Week 11: Mobile Optimization
12. Week 12: Bug Fixes & Launch

---

# SUCCESS METRICS

## Technical
- API response time < 200ms (p95)
- WebSocket uptime > 99%
- AI matching accuracy > 80%
- Translation quality > 4/5

## Business
- Profile completion rate > 70%
- Match acceptance rate > 30%
- Premium conversion rate > 5%
- Monthly active users (MAU)

---

# COST ESTIMATION

## Development: ~300-400 hours
- Backend: 120-160 hours
- Frontend: 120-160 hours
- Testing: 40-60 hours
- DevOps: 20-30 hours

## Monthly Operational Costs: ~$115-300
- MongoDB Atlas: $25-50
- Server Hosting: $50-100
- Google Gemini AI: $20-100
- Email Service: $10-30
- Storage (S3): $10-20

---

**END OF PLAN**
