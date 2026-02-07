# Quick Start Guide

Get the Pokojowo FastAPI application running in 5 minutes!

## 1. Prerequisites

Ensure you have:
- Python 3.9 or higher
- MongoDB running (locally or remote)
- Git

## 2. Installation

```bash
# Navigate to project directory
cd pokojowo-fastapi

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## 3. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# Minimum required:
# - MONGODB_URL (your MongoDB connection string)
# - SECRET_KEY (generate with: openssl rand -hex 32)
```

### Generate Secret Key

```bash
# On macOS/Linux:
openssl rand -hex 32

# Or in Python:
python -c "import secrets; print(secrets.token_hex(32))"
```

## 4. Run the Application

```bash
# Development mode (with auto-reload)
uvicorn main:socket_app --reload --host 0.0.0.0 --port 3000

# Or simply:
python main.py
```

## 5. Test the API

Open your browser and visit:

- **API Info**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 6. First API Call

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstname": "Test",
    "lastname": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `access_token` from the response!

### Get User Info

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 7. Using with Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 8. Interactive API Documentation

Visit http://localhost:3000/api-docs to:
- View all available endpoints
- Test API calls directly from browser
- See request/response schemas
- Authorize with JWT token

Click "Authorize" button and enter: `Bearer YOUR_ACCESS_TOKEN`

## Common Issues

### MongoDB Connection Error

**Problem**: `ServerSelectionTimeoutError`

**Solution**:
- Ensure MongoDB is running
- Check `MONGODB_URL` in `.env`
- Test connection: `mongosh YOUR_MONGODB_URL`

### Port Already in Use

**Problem**: `OSError: [Errno 48] Address already in use`

**Solution**:
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
uvicorn main:socket_app --reload --port 8000
```

### Module Not Found

**Problem**: `ModuleNotFoundError: No module named 'X'`

**Solution**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Reinstall dependencies
pip install -r requirements.txt
```

## Next Steps

1. **Create a Landlord User**
   - Register normally
   - Update role to include "Landlord"

2. **Create a Listing**
   - Upload images via `/api/upload/listing`
   - Create listing with image URLs

3. **Test Real-time Chat**
   - Connect to Socket.IO at `ws://localhost:3000/socket.io`
   - Use Socket.IO client to test messaging

4. **Explore the API**
   - Check out all endpoints in Swagger UI
   - Test different user roles and permissions

## Development Tips

### Hot Reload

The `--reload` flag enables hot reload. Change any Python file and the server automatically restarts.

### Debugging

Add print statements or use Python debugger:

```python
import pdb; pdb.set_trace()  # Breakpoint
```

### Logs

Check application logs in the terminal where the server is running.

### Database GUI

Use MongoDB Compass or Studio 3T to view/edit database directly:
```
mongodb://localhost:27017
```

## Production Deployment

For production deployment:

1. **Set Environment Variables**
   ```bash
   export DEBUG=False
   export SECRET_KEY=your-production-secret
   ```

2. **Use Production Server**
   ```bash
   uvicorn main:socket_app --host 0.0.0.0 --port 3000 --workers 4
   ```

3. **Use Reverse Proxy**
   - Nginx or Apache in front of Uvicorn
   - Handle SSL/TLS certificates
   - Static file serving

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Beanie ODM](https://roman-right.github.io/beanie/)
- [Pydantic](https://docs.pydantic.dev/)
- [Socket.IO](https://socket.io/docs/v4/)

## Getting Help

- Check `MIGRATION_GUIDE.md` for detailed explanations
- Review `README.md` for complete documentation
- Check FastAPI docs for framework-specific questions
- Search existing issues in the repository

Happy coding! 🚀
