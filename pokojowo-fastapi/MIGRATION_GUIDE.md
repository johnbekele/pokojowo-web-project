# Migration Guide: Node.js/Express to FastAPI

This guide helps you migrate from the original Node.js/Express Pokojowo application to the new FastAPI version.

## Overview

The FastAPI version maintains the same core functionality while providing improved performance, type safety, and developer experience.

## Architecture Changes

### Project Structure

**Node.js/Express:**
```
Pokojowo-/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── model/
│   ├── routes/
│   ├── services/
│   └── utils/
├── server.js
└── package.json
```

**FastAPI:**
```
pokojowo-fastapi/
├── app/
│   ├── api/v1/endpoints/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── middleware/
│   └── utils/
├── main.py
└── requirements.txt
```

## Database Changes

### Mongoose → Beanie + Motor

**Node.js (Mongoose):**
```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true }
});

const User = mongoose.model('Users', userSchema);
```

**FastAPI (Beanie):**
```python
from beanie import Document

class User(Document):
    username: str
    email: EmailStr

    class Settings:
        name = "users"
```

### Database Operations

**Node.js:**
```javascript
// Find
const user = await User.findOne({ email: email });

// Create
const newUser = new User({ username, email });
await newUser.save();

// Update
user.username = "newname";
await user.save();

// Delete
await user.deleteOne();
```

**FastAPI:**
```python
# Find
user = await User.find_one({"email": email})

# Create
new_user = User(username=username, email=email)
await new_user.insert()

# Update
user.username = "newname"
await user.save()

# Delete
await user.delete()
```

## Authentication Changes

### Passport.js → Python-JOSE + PassLib

**Node.js (Passport):**
```javascript
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

passport.use(new LocalStrategy(async (username, password, done) => {
  // Authentication logic
}));
```

**FastAPI (Dependencies):**
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    # Authentication logic
    pass
```

### JWT Token Handling

**Node.js:**
```javascript
import jwt from 'jsonwebtoken';

const token = jwt.sign({ user_id: user.id }, SECRET_KEY, { expiresIn: '30m' });
```

**FastAPI:**
```python
from jose import jwt

token = jwt.encode(
    {"user_id": str(user.id), "exp": expire},
    SECRET_KEY,
    algorithm=ALGORITHM
)
```

## Route Definitions

### Express Routes → FastAPI Routers

**Node.js (Express):**
```javascript
import express from 'express';
const router = express.Router();

router.post('/register', authController.createUser);
router.get('/users/:id', userController.getUser);

export default router;
```

**FastAPI:**
```python
from fastapi import APIRouter

router = APIRouter()

@router.post("/register")
async def register(user_data: UserCreate):
    # Handler logic
    pass

@router.get("/users/{user_id}")
async def get_user(user_id: str):
    # Handler logic
    pass
```

## Request Validation

### Manual Validation → Pydantic

**Node.js:**
```javascript
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Continue processing
});
```

**FastAPI (Automatic with Pydantic):**
```python
@router.post("/register")
async def register(user_data: UserCreate):
    # Validation happens automatically
    # user_data is guaranteed to have username, email, password
    pass
```

## Middleware

### Express Middleware → FastAPI Middleware

**Node.js:**
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

**FastAPI:**
```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"{request.method} {request.url}")
    response = await call_next(request)
    return response
```

## Environment Variables

### .env File → Pydantic Settings

**Node.js:**
```javascript
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
```

**FastAPI:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 3000

    class Config:
        env_file = ".env"

settings = Settings()
```

## WebSocket/Socket.IO

Both versions use Socket.IO, but the implementation differs:

**Node.js:**
```javascript
import { Server } from 'socket.io';
const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('message', (data) => {
    // Handle message
  });
});
```

**FastAPI:**
```python
import socketio
sio = socketio.AsyncServer(async_mode='asgi')

@sio.event
async def connect(sid, environ):
    pass

@sio.event
async def message(sid, data):
    # Handle message
    pass
```

## Error Handling

**Node.js:**
```javascript
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message
  });
});
```

**FastAPI:**
```python
from fastapi import HTTPException

@router.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

## File Upload

### Multer → FastAPI UploadFile

**Node.js:**
```javascript
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  // Handle file
});
```

**FastAPI:**
```python
from fastapi import UploadFile, File

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Handle file
    pass
```

## API Documentation

**Node.js:**
- Manual Swagger setup required
- Configuration in separate file
- Need to maintain JSDoc comments

**FastAPI:**
- Built-in OpenAPI documentation
- Automatic from type hints
- Available at `/docs` and `/redoc`

## Running the Application

### Development

**Node.js:**
```bash
npm install
npm run dev
```

**FastAPI:**
```bash
pip install -r requirements.txt
uvicorn main:socket_app --reload
```

### Production

**Node.js:**
```bash
npm start
```

**FastAPI:**
```bash
uvicorn main:socket_app --workers 4
```

## Testing

**Node.js:**
```javascript
import request from 'supertest';

describe('GET /api/users', () => {
  it('should return users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
  });
});
```

**FastAPI:**
```python
from fastapi.testclient import TestClient

def test_get_users():
    client = TestClient(app)
    response = client.get("/api/users")
    assert response.status_code == 200
```

## Migration Steps

1. **Set up Python environment**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Database migration**
   - No schema changes needed (MongoDB)
   - Existing data works with new application
   - Update connection string in `.env`

4. **Test endpoints**
   ```bash
   # Start the server
   python main.py

   # Test endpoints
   curl http://localhost:3000/health
   ```

5. **Update frontend**
   - API endpoints remain the same
   - Token format unchanged
   - Socket.IO connection compatible

6. **Deploy**
   - Use Docker or traditional deployment
   - Update environment variables
   - Monitor logs for issues

## Common Pitfalls

1. **Async/Await**: FastAPI requires `async`/`await` for database operations
2. **ObjectId**: Convert ObjectIds to strings: `str(user.id)`
3. **Field Names**: Use Pydantic's `alias` for camelCase fields
4. **Null Values**: Use `Optional[Type]` for nullable fields
5. **Validation**: Pydantic validation is stricter than manual validation

## Performance Improvements

- **Async I/O**: Better handling of concurrent requests
- **Type Checking**: Catches errors at development time
- **Automatic Validation**: No runtime overhead for manual checks
- **Built-in Caching**: Better response time with caching support

## Benefits of Migration

1. ✅ **Type Safety**: Full type hints prevent common errors
2. ✅ **Auto Documentation**: OpenAPI docs generated automatically
3. ✅ **Better Performance**: Async-first architecture
4. ✅ **Modern Python**: Latest language features
5. ✅ **Less Boilerplate**: Pydantic handles validation
6. ✅ **Better Testing**: Built-in test client
7. ✅ **IDE Support**: Better autocomplete and type checking

## Support

For issues during migration:
1. Check error messages carefully
2. Review the API documentation at `/api-docs`
3. Compare with original Node.js implementation
4. Create an issue if you find bugs

## Next Steps

After successful migration:
1. Add more comprehensive tests
2. Implement email sending functionality
3. Complete Google OAuth integration
4. Add caching layer
5. Implement rate limiting
6. Add monitoring and logging
