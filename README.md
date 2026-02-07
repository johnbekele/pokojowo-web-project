# Pokojowo - Room Rental Platform

Full-stack room rental platform with AI-powered matching, real-time chat, and comprehensive user profiles.

## Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: FastAPI (Python) with async/await
- **Database**: MongoDB Atlas (Cloud)
- **Real-time**: Socket.IO for chat
- **Authentication**: JWT with refresh tokens
- **Deployment**: Docker + Docker Compose

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: pokojowo-network          │
│                                                               │
│  ┌───────────────────┐              ┌──────────────────┐    │
│  │  Frontend         │              │  Backend         │    │
│  │  (React/Vite)     │◄────────────►│  (FastAPI)       │    │
│  │  Port: 5173       │   HTTP/WS    │  Port: 3000      │    │
│  │  Service: frontend│              │  Service: backend│    │
│  └───────────────────┘              └──────────────────┘    │
│          │                                    │              │
│          │ (External Access)                  │              │
│          │                                    ▼              │
│          │                         ┌────────────────────┐   │
│          │                         │  MongoDB Atlas     │   │
│          │                         │  (Cloud)           │   │
└──────────┼─────────────────────────┴────────────────────┘   │
           │                                                   │
    ┌──────▼──────────┐                                      │
    │ localhost:5173  │                                      │
    │ (Frontend UI)   │                                      │
    └─────────────────┘                                      │
```

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account (free tier available)
- Git

### 1. Configuration

Update MongoDB connection in `pokojowo-fastapi/.env`:

```env
# Update these values
MONGODB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=pokojowo
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## Development

### Hot Reload

Both services support hot reload:

- **Frontend**: Edit files in `pokojowo-frontend/src/` - Vite hot reloads automatically
- **Backend**: Edit files in `pokojowo-fastapi/app/` - Uvicorn reloads automatically

### Running Individual Services

**Backend Only:**
```bash
cd pokojowo-fastapi
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:socket_app --reload
```

**Frontend Only:**
```bash
cd pokojowo-frontend
npm install
npm run dev
```

### Docker Commands

```bash
# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart a service
docker-compose restart backend

# Rebuild a specific service
docker-compose build backend

# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# View container stats
docker stats pokojowo-backend pokojowo-frontend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `GET /api/users/{user_id}` - Get user by ID
- `GET /api/users/` - Get all users
- `DELETE /api/users/me` - Delete account

### Profile
- `GET /api/profile/` - Get full profile
- `PUT /api/profile/` - Update profile
- `PUT /api/profile/photo` - Update photo
- `PUT /api/profile/completion` - Update profile completion
- `GET /api/profile/{user_id}` - Get public profile

### Listings
- `POST /api/listings/` - Create listing (landlords only)
- `GET /api/listings/` - Get all listings (with filters)
- `GET /api/listings/{listing_id}` - Get listing by ID
- `PUT /api/listings/{listing_id}` - Update listing
- `DELETE /api/listings/{listing_id}` - Delete listing
- `GET /api/listings/owner/{owner_id}` - Get listings by owner

### Chat & Messages
- `POST /api/chat/` - Create chat room
- `GET /api/chat/` - Get user chats
- `GET /api/chat/{chat_id}` - Get chat by ID
- `POST /api/messages/` - Send message
- `GET /api/messages/room/{room_id}` - Get messages

### Upload
- `POST /api/upload/photo` - Upload profile photo
- `POST /api/upload/listing` - Upload listing image
- `POST /api/upload/listing/multiple` - Upload multiple images

## Environment Variables

### Backend (.env)
```env
MONGODB_URL=your-mongodb-atlas-url
DATABASE_NAME=pokojowo
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://frontend:5173
```

### Frontend (.env.development)
```env
VITE_API_URL=http://backend:3000
VITE_API_BASE_URL=http://backend:3000/api
VITE_SOCKET_URL=http://backend:3000
```

## Features

### User Roles
- **Tenants**: Search for rooms, view listings, chat with landlords
- **Landlords**: Create/manage listings, respond to inquiries
- **Admins**: Platform moderation and user management

### Key Features
- ✅ JWT Authentication with refresh tokens
- ✅ Email verification
- ✅ Password reset functionality
- ✅ Real-time chat with Socket.IO
- ✅ File upload for profiles and listings
- ✅ Profile completion tracking
- ✅ Advanced search and filtering
- ✅ AI-powered matching (with Google AI)
- ✅ Multilingual support (i18next)
- ✅ Responsive design (TailwindCSS)

## Troubleshooting

### Frontend can't connect to backend

```bash
# Check if both services are running
docker-compose ps

# Check network connectivity
docker-compose exec frontend ping backend

# Check CORS configuration
docker-compose logs backend | grep CORS

# Verify environment variables
docker-compose exec frontend env | grep VITE
docker-compose exec backend env | grep CORS
```

### Hot reload not working

- Ensure volumes are correctly mounted in docker-compose.yml
- Check that `usePolling: true` is set in vite.config.js
- Verify `--reload` flag is in backend Dockerfile.dev

### MongoDB connection fails

- Verify MongoDB Atlas connection string is correct
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure database user has correct permissions
- Test connection: `mongosh "your-connection-string"`

### Port already in use

```bash
# Find process using port
lsof -i :3000
lsof -i :5173

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

## Project Structure

```
testapi/
├── docker-compose.yml          # Main orchestration file
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
│
├── pokojowo-frontend/          # React frontend
│   ├── src/                    # Source code
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Frontend container
│   ├── vite.config.js          # Vite configuration
│   ├── .env.development        # Docker environment
│   ├── .env                    # Local environment
│   └── package.json            # Dependencies
│
├── pokojowo-fastapi/           # FastAPI backend
│   ├── app/                    # Application code
│   │   ├── api/                # API routes
│   │   ├── core/               # Core functionality
│   │   ├── models/             # Database models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Business logic
│   ├── uploads/                # User uploads
│   ├── Dockerfile              # Production container
│   ├── Dockerfile.dev          # Development container
│   ├── .env                    # Environment variables
│   ├── main.py                 # Application entry point
│   └── requirements.txt        # Python dependencies
│
└── Pokojowo-/                  # Legacy Node.js backend (deprecated)
```

## Testing

### Backend Tests
```bash
cd pokojowo-fastapi
pip install pytest pytest-asyncio httpx
pytest
```

### Frontend Tests
```bash
cd pokojowo-frontend
npm test
```

### Manual Testing

1. **Register a new user**: http://localhost:5173/register
2. **Login**: http://localhost:5173/login
3. **Create a listing** (as landlord)
4. **Test real-time chat**
5. **Upload profile photo**

## Production Deployment

For production, create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./pokojowo-fastapi
      dockerfile: Dockerfile  # Production Dockerfile
    environment:
      - DEBUG=False
    # ... production config

  frontend:
    build:
      context: ./pokojowo-frontend
      dockerfile: Dockerfile  # Will use Nginx
    # ... production config
```

Deploy with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC

## Support

For issues and questions:
- Backend issues: Check `pokojowo-fastapi/README.md`
- Frontend issues: Check `pokojowo-frontend/README.md`
- Create an issue in the repository

## Links

- **API Documentation**: http://localhost:3000/api-docs (when running)
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Vite Docs**: https://vitejs.dev/
- **React Docs**: https://react.dev/
