# Pokojowo FastAPI - Room Rental Platform API

A modern, high-performance REST API built with FastAPI for the Pokojowo room rental platform. This is a refactored version of the original Node.js/Express application.

## Features

- **FastAPI Framework**: Modern, fast (high-performance), web framework for building APIs
- **MongoDB with Beanie ODM**: Async MongoDB support with Pydantic models
- **JWT Authentication**: Secure token-based authentication
- **Google OAuth**: OAuth 2.0 authentication support
- **WebSocket Support**: Real-time chat using Socket.IO
- **File Upload**: Image upload for profiles and listings
- **API Documentation**: Auto-generated OpenAPI (Swagger) documentation
- **Type Safety**: Full type hints with Pydantic models
- **Async/Await**: Fully asynchronous codebase for better performance

## Architecture

```
pokojowo-fastapi/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/      # API route handlers
│   │       │   ├── auth.py
│   │       │   ├── users.py
│   │       │   ├── listings.py
│   │       │   ├── messages.py
│   │       │   ├── chat.py
│   │       │   ├── upload.py
│   │       │   └── profile.py
│   │       └── api.py          # API router
│   ├── core/
│   │   ├── config.py           # Configuration
│   │   ├── database.py         # Database connection
│   │   ├── security.py         # JWT & password hashing
│   │   ├── dependencies.py     # FastAPI dependencies
│   │   └── socket.py           # Socket.IO setup
│   ├── models/                 # Beanie document models
│   │   ├── user.py
│   │   ├── listing.py
│   │   ├── message.py
│   │   └── chat.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── user_schema.py
│   │   ├── listing_schema.py
│   │   ├── message_schema.py
│   │   └── chat_schema.py
│   ├── services/               # Business logic
│   ├── middleware/             # Custom middleware
│   └── utils/                  # Utility functions
├── uploads/                    # File uploads directory
├── main.py                     # Application entry point
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variables example
└── README.md                   # This file
```

## Prerequisites

- Python 3.9+
- MongoDB 4.4+
- pip or poetry for package management

## Installation

1. **Clone the repository**:
   ```bash
   cd pokojowo-fastapi
   ```

2. **Create and activate virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Configure MongoDB**:
   - Update `MONGODB_URL` in `.env` file
   - Ensure MongoDB is running

## Configuration

Edit `.env` file with your settings:

```env
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=pokojowo

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Running the Application

### Development Mode

```bash
uvicorn main:socket_app --reload --host 0.0.0.0 --port 3000
```

Or using the Python script:

```bash
python main.py
```

### Production Mode

```bash
uvicorn main:socket_app --host 0.0.0.0 --port 3000 --workers 4
```

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/api-docs
- **ReDoc**: http://localhost:3000/api-redoc
- **OpenAPI JSON**: http://localhost:3000/openapi.json

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `GET /api/users/{user_id}` - Get user by ID
- `GET /api/users/` - Get all users
- `DELETE /api/users/me` - Delete current user

### Profile
- `GET /api/profile/` - Get current user profile
- `PUT /api/profile/` - Update profile
- `PUT /api/profile/photo` - Update profile photo
- `PUT /api/profile/completion` - Update profile completion
- `GET /api/profile/{user_id}` - Get public profile

### Listings
- `POST /api/listings/` - Create listing (landlords only)
- `GET /api/listings/` - Get all listings (with filters)
- `GET /api/listings/{listing_id}` - Get listing by ID
- `PUT /api/listings/{listing_id}` - Update listing
- `DELETE /api/listings/{listing_id}` - Delete listing
- `GET /api/listings/owner/{owner_id}` - Get listings by owner

### Chat
- `POST /api/chat/` - Create chat
- `GET /api/chat/` - Get user chats
- `GET /api/chat/{chat_id}` - Get chat by ID
- `DELETE /api/chat/{chat_id}` - Delete chat
- `GET /api/chat/with/{user_id}` - Get/create chat with user

### Messages
- `POST /api/messages/` - Send message
- `GET /api/messages/room/{room_id}` - Get messages by room
- `GET /api/messages/{message_id}` - Get message by ID
- `DELETE /api/messages/{message_id}` - Delete message

### Upload
- `POST /api/upload/photo` - Upload profile photo
- `POST /api/upload/listing` - Upload listing image
- `POST /api/upload/listing/multiple` - Upload multiple listing images
- `DELETE /api/upload/photo/{filename}` - Delete photo

## WebSocket (Socket.IO)

Connect to Socket.IO server at: `ws://localhost:3000/socket.io`

### Events

**Client to Server:**
- `join_room` - Join a chat room
- `leave_room` - Leave a chat room
- `send_message` - Send a message
- `typing` - Typing indicator

**Server to Client:**
- `connection` - Connection established
- `joined_room` - Joined room confirmation
- `left_room` - Left room confirmation
- `new_message` - New message received
- `user_typing` - User typing notification
- `notification` - General notifications

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## Docker Deployment

Build and run with Docker:

```bash
docker build -t pokojowo-fastapi .
docker run -p 3000:3000 --env-file .env pokojowo-fastapi
```

Or use Docker Compose:

```bash
docker-compose up
```

## Migration from Node.js

This FastAPI version provides the same functionality as the original Express.js application with the following improvements:

1. **Better Performance**: FastAPI is built on Starlette and Pydantic, offering excellent performance
2. **Type Safety**: Full type hints throughout the codebase
3. **Auto Documentation**: Built-in OpenAPI documentation
4. **Async by Default**: Fully asynchronous for better concurrency
5. **Modern Python**: Uses latest Python features and best practices

## Key Differences from Node.js Version

| Feature | Node.js/Express | FastAPI |
|---------|----------------|---------|
| Language | JavaScript | Python |
| Database Driver | Mongoose | Motor + Beanie |
| Auth | Passport.js | Python-JOSE + PassLib |
| Validation | Manual | Pydantic (automatic) |
| Documentation | Swagger setup required | Built-in OpenAPI |
| Async Support | Callbacks/Promises | Native async/await |
| Type System | Optional (TypeScript) | Built-in (Python) |

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For issues and questions, please create an issue in the GitHub repository.
