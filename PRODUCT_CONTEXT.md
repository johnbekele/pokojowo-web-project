# Pokojowo - Product Context & Development Guide

**Project:** Pokojowo – Roommate & Room Matching Platform (Poland MVP)

---

## 1. Product Vision

Pokojowo is a **production-quality MVP** web application for roommate and room matching.

### Core Idea

Pokojowo helps users **find the best room AND the most compatible roommate** by:

1. Aggregating room listings (initially manual + seed data, later scraping)
2. Creating structured user profiles (budget, lifestyle, habits, deal-breakers)
3. Running a **compatibility-based matching algorithm**
4. Ranking **apartment + roommate combinations**

**Key Differentiator:** This is **not** just a listing site and **not** just a roommate finder. The value is in **compatibility-based matching**.

---

## 2. MVP Scope

### Target Market
- **Location:** Poland (start with Warsaw)
- **Users:** Students, young professionals, expats

### Platform
- Web application only
- Polish + English (i18n implemented)
- Desktop & mobile responsive

### MVP Goal
A working system with **real users and real matches**, not a prototype.

---

## 3. Core Features

### 3.1 Authentication

| Feature | Status | Notes |
|---------|--------|-------|
| Email + password | Implemented | JWT-based |
| Google OAuth | Optional | Future enhancement |
| JWT-based auth | Implemented | Access + refresh tokens |
| Email verification | Implemented | SMTP configured |

**Implementation:** `pokojowo-fastapi/app/api/v1/endpoints/auth.py`

---

### 3.2 User Profile & Onboarding

Structured questionnaire (NO free text for matching fields):

#### Categories

**Basic Preferences:**
- Budget (min/max)
- Location preference (districts)
- Move-in date

**Lifestyle:**
| Field | Type | Values |
|-------|------|--------|
| Smoking | Enum | never, occasionally, regularly |
| Pets | Enum | none, have_pets, allergic, love_pets |
| Cleanliness | Scale | 1-5 |
| Guests frequency | Enum | rarely, sometimes, often |
| Noise tolerance | Scale | 1-5 |
| Sleep schedule | Enum | early_bird, night_owl, flexible |

**Personality:**
| Field | Type | Values |
|-------|------|--------|
| Social style | Enum | introvert, extrovert, ambivert |
| Privacy preference | Enum | very_private, balanced, very_social |

**Deal-breakers:**
- Hard constraints that result in immediate match rejection
- Examples: no_smokers, no_pets, quiet_only

#### Requirements
- All answers must be typed
- All answers must be enumerated
- All answers must be validated

**Implementation:** `pokojowo-fastapi/app/models/user.py`, `pokojowo-fastapi/app/schemas/`

---

### 3.3 Listings

#### Fields
| Field | Type | Required |
|-------|------|----------|
| Price | Integer | Yes |
| Location (district) | String | Yes |
| Room size | Float | Yes |
| Amenities | Array | No |
| Photos | Array | No |
| Source | Enum | Yes (manual/scraped) |

#### Features
- Apartment/room listings with full details
- Ability to seed listings from JSON
- Search and filtering capabilities

**Implementation:** `pokojowo-fastapi/app/models/listing.py`, `pokojowo-fastapi/app/api/v1/endpoints/listings.py`

---

### 3.4 Matching Algorithm (CORE LOGIC)

**Approach:** Deterministic, explainable logic (NOT ML for MVP)

#### Rules

1. **Hard Deal-breakers** = Immediate rejection
2. **Weighted Scoring:**
   - Budget fit
   - Lifestyle compatibility
   - Cleanliness match
   - Schedule compatibility
   - Personality alignment

#### Output Format
```json
{
  "score": 87,
  "reasons": {
    "budget": "Perfect match",
    "cleanliness": "Very compatible",
    "schedule": "Slight difference",
    "personality": "Good match"
  }
}
```

#### Requirements
- Deterministic results
- Explainable scoring
- Adjustable weights
- Designed to evolve into ML later
- No hardcoded assumptions

**Implementation:** `pokojowo-fastapi/app/ml/` (to be enhanced)

---

### 3.5 Match Results UI

- Ranked list of matches
- Clear explanation ("Why this match?")
- Save / dismiss matches functionality
- Filter and sort options

**Implementation:** `pokojowo-frontend/src/pages/`

---

### 3.6 Messaging

- 1-to-1 chat between matched users
- Real-time via Socket.IO
- Message limits for free users
- Email notification on new message

**Implementation:**
- Backend: `pokojowo-fastapi/app/api/v1/endpoints/chat.py`, `messages.py`
- Frontend: `pokojowo-frontend/src/pages/`

---

## 4. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.0 | UI Framework |
| Vite | 6.3.5 | Build tool |
| TailwindCSS | 3.4.18 | Styling |
| React Router | 7.9.5 | Routing |
| TanStack Query | 5.90.5 | Server state |
| i18next | 25.6.0 | Internationalization |
| Axios | 1.13.1 | HTTP client |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.109.0 | Web framework |
| Python | 3.11 | Runtime |
| MongoDB | Atlas | Database |
| Motor | 3.3.2 | Async MongoDB driver |
| Beanie | 1.24.0 | ODM |
| Socket.IO | 5.11.0 | Real-time |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |

---

## 5. Code Quality Requirements

### 5.1 Architecture
- Clean architecture with clear separation
- Layers:
  - **API Layer:** Request handling, routing
  - **Domain Logic:** Business rules, matching algorithm
  - **Infrastructure:** Database, external services
- No business logic in controllers

### 5.2 Code Standards
- Strong typing everywhere (TypeScript frontend, Python type hints backend)
- Linting enabled (ESLint frontend, Ruff/Black backend)
- Clear, descriptive naming
- Small, composable functions
- No magic numbers
- Constants defined centrally

### 5.3 Validation & Security
| Requirement | Implementation |
|-------------|----------------|
| Input validation | Pydantic schemas (backend), form validation (frontend) |
| Rate limiting | To be implemented on auth & messaging |
| Password hashing | bcrypt |
| SQL injection safe | N/A (MongoDB) - but sanitize all inputs |
| XSS safe | React auto-escaping + input sanitization |

### 5.4 Error Handling
- Consistent error format across API
- Meaningful error messages
- No silent failures
- Centralized error middleware

### 5.5 Testing Requirements
| Type | Coverage |
|------|----------|
| Unit tests | Matching algorithm, Profile validation |
| Integration tests | Auth, Matching endpoint |
| E2E tests | Critical user flows (future) |

---

## 6. Database Design

### Current: MongoDB
- Document-based schema
- Collections: users, listings, chats, messages
- Indexed frequently queried fields
- Relations via ObjectId references

### Design Rules
- Normalized where appropriate
- Explicit relations
- No deeply nested documents for core logic
- Migrations via Beanie

---

## 7. Non-Goals (DO NOT IMPLEMENT)

| Feature | Reason |
|---------|--------|
| Payments | Post-MVP |
| Mobile app | Web-first approach |
| AI chatbots | Out of scope |
| ML recommendations | Post-MVP (deterministic first) |
| Social media features | Not core value |

---

## 8. Success Criteria

The MVP is successful if a user can:

1. Sign up with email
2. Complete structured onboarding
3. See real listings
4. Get ranked matches with explanations
5. Message another user
6. Understand **why** they were matched

---

## 9. Development Principles

### Build Philosophy
- Build incrementally
- Commit working code only
- Write minimal but clear documentation
- Prefer clarity over cleverness
- Flag risks and assumptions

### Decision Making
- When unsure: Choose the **simplest scalable solution**
- Ask before adding scope
- Avoid over-engineering

### Optimization Priorities
1. **Stability** - No crashes, handle edge cases
2. **Readability** - Code should be self-documenting
3. **Maintainability** - Easy to modify and extend
4. **Speed of iteration** - Quick to add features

---

## 10. Project Structure

```
pokojowo-web-project/
├── pokojowo-frontend/          # React/Vite frontend
│   ├── src/
│   │   ├── api/               # API client
│   │   ├── components/        # Reusable components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utilities
│   │   ├── i18n/              # i18n config
│   │   └── locales/           # Translations (en, pl)
│   └── Dockerfile
│
├── pokojowo-fastapi/           # FastAPI backend
│   ├── app/
│   │   ├── api/v1/            # API routes
│   │   │   └── endpoints/     # Route handlers
│   │   ├── core/              # Config, security, database
│   │   ├── models/            # MongoDB models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   ├── ml/                # Matching algorithm
│   │   └── utils/             # Utilities
│   ├── main.py                # App entry point
│   └── Dockerfile.dev
│
├── docker-compose.yml          # Container orchestration
├── PRODUCT_CONTEXT.md          # This file
├── README.md                   # Setup instructions
└── EXECUTION_PLAN.md           # Development roadmap
```

---

## 11. API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - Logout
- `POST /refresh` - Refresh access token
- `GET /verify-email` - Email verification
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Reset password

### Users (`/api/users`)
- `GET /me` - Current user profile
- `PUT /me` - Update current user
- `GET /{user_id}` - Get specific user
- `DELETE /me` - Delete account

### Profile (`/api/profile`)
- `GET /` - Get full profile
- `PUT /` - Update profile
- `PUT /photo` - Upload profile photo

### Listings (`/api/listings`)
- `POST /` - Create listing
- `GET /` - List all with filters
- `GET /{listing_id}` - Get listing details
- `PUT /{listing_id}` - Update listing
- `DELETE /{listing_id}` - Delete listing

### Matching (`/api/matches`) - To be implemented
- `GET /` - Get user matches
- `POST /calculate` - Calculate compatibility
- `POST /{match_id}/save` - Save match
- `POST /{match_id}/dismiss` - Dismiss match

### Chat & Messages (`/api/chat`, `/api/messages`)
- `POST /chat/` - Create chat room
- `GET /chat/` - Get user chats
- WebSocket for real-time messaging

---

## 12. Environment Variables

### Frontend (`pokojowo-frontend/.env.development`)
```env
VITE_API_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Backend (`pokojowo-fastapi/.env`)
```env
# Database
MONGODB_URL=mongodb+srv://...
DATABASE_NAME=pokojowo

# Security
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password

# AI (for future matching)
GOOGLE_AI_API_KEY=your-key
```

---

## 13. Running the Project

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Points
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/docs

---

## 14. Next Development Priorities

1. **Implement Matching Algorithm** - Core value proposition
2. **Enhance Onboarding Flow** - Structured questionnaire
3. **Add Match Results UI** - Display ranked matches with explanations
4. **Implement Listing Seeding** - JSON import capability
5. **Add Rate Limiting** - Auth and messaging endpoints
6. **Write Tests** - Matching algorithm and auth flows

---

*Last Updated: December 2024*
*Version: MVP 1.0*
