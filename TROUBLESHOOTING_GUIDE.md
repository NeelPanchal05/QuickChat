# QuickChat - Troubleshooting Guide

## Common Issues & Solutions

### Frontend Issues

#### 1. Components Not Displaying

**Problem**: Dialog components not showing up

```
Error: Dialog appears blank or missing
```

**Solution**:

1. Verify Dialog components are properly imported
2. Check that DialogContent wrapper is in place
3. Ensure component state is correctly setting show state
4. Clear browser cache: Ctrl+Shift+Delete
5. Check browser console for errors: F12

```javascript
// ✅ Correct
<Dialog open={showProfile} onOpenChange={setShowProfile}>
  <DialogContent>
    <Profile user={user} onBack={() => setShowProfile(false)} />
  </DialogContent>
</Dialog>

// ❌ Wrong
<Dialog open={showProfile}>
  <Profile user={user} />
</Dialog>
```

---

#### 2. Theme Not Applying

**Problem**: Theme colors not showing on messages

```
Messages appear with wrong colors or gradient
```

**Solution**:

1. Verify ThemeContext is imported: `import { useTheme } from "@/contexts/ThemeContext"`
2. Check that useTheme hook is called: `const { currentThemeData } = useTheme()`
3. Verify theme is applied to messages container:
   ```javascript
   <div style={currentThemeData?.bgStyle || { background: "..." }}>
   ```
4. Check App.js has ThemeProvider wrapper:
   ```javascript
   <ThemeProvider>
     <BrowserRouter>
       <AppRoutes />
     </BrowserRouter>
   </ThemeProvider>
   ```
5. Open DevTools → inspect messages div → check computed styles

---

#### 3. Real-time Messages Not Updating

**Problem**: Messages from other users don't appear

```
Socket.IO connection error or messages not syncing
```

**Solution**:

1. Check WebSocket connection: Open DevTools → Network → WS
2. Verify Socket.IO is initialized in AuthContext
3. Check that `socket.on("new_message", handleNewMessage)` is set up
4. Ensure message handler is updating state correctly:
   ```javascript
   const handleNewMessage = (message) => {
     setMessages((prev) => [...prev, message]);
   };
   ```
5. Check backend server is running on correct port
6. Look for CORS issues in console

---

#### 4. Media Uploader Not Working

**Problem**: Can't upload files

```
Error: File not uploading or showing error
```

**Solution**:

1. Check file size is within limits
2. Verify file type is allowed (check MediaUploader component)
3. Ensure API endpoint exists: `POST /api/messages/upload`
4. Check FormData is properly created:
   ```javascript
   const formData = new FormData();
   formData.append("file", file);
   ```
5. Verify backend has file upload handler
6. Check server upload directory has write permissions

---

#### 5. GIF Picker Returns No Results

**Problem**: GIF search not working

```
No GIFs showing in picker
```

**Solution**:

1. Verify API key for GIF service (Giphy or similar)
2. Check network request: DevTools → Network → search GIF
3. Ensure API endpoint exists and returns data
4. Check that search query is being sent correctly
5. Verify backend has GIF service integration
6. Check API rate limits haven't been exceeded

---

#### 6. Polls Not Sending

**Problem**: Can't create or send polls

```
Poll creation fails or doesn't send
```

**Solution**:

1. Check poll validation passes (has options, title)
2. Verify Socket.IO emit event: `socket.emit('poll_created', pollData)`
3. Check backend receives poll endpoint: `POST /api/polls`
4. Ensure poll data structure matches backend expectations:
   ```javascript
   {
     title: "Question?",
     options: ["Option 1", "Option 2"],
     time_limit: 300
   }
   ```
5. Verify poll is being added to messages state
6. Check WebSocket connection is active

---

#### 7. Profile Changes Not Saving

**Problem**: Profile edits don't persist

```
Changes revert after page reload
```

**Solution**:

1. Check Profile component sends PUT request:
   ```javascript
   await API.put(`/api/users/${user.user_id}`, updatedData);
   ```
2. Verify backend endpoint exists and updates database
3. Check authentication token is included in request
4. Ensure response includes updated user data
5. Verify local auth context is updated with new data
6. Check browser localStorage is enabled

---

#### 8. Theme Not Persisting

**Problem**: Theme resets after page refresh

```
Custom theme disappears on reload
```

**Solution**:

1. Verify ThemeContext saves to localStorage:
   ```javascript
   useEffect(() => {
     localStorage.setItem("theme", JSON.stringify(theme));
   }, [theme]);
   ```
2. Check browser localStorage is enabled
3. Verify localStorage quota not exceeded
4. Clear browser cache and try again
5. Check that theme is loaded from localStorage on mount:
   ```javascript
   const savedTheme = localStorage.getItem("theme");
   if (savedTheme) setTheme(JSON.parse(savedTheme));
   ```

---

### Backend Issues

#### 1. Port Already in Use

**Problem**: Can't start backend server

```
Error: Address already in use [::]:8000
```

**Solution**:

```bash
# Option 1: Find and kill process using port 8000
lsof -i :8000
kill -9 <PID>

# Option 2: Use different port
python -m uvicorn server:app --port 8001

# Option 3: Windows (PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

#### 2. MongoDB Connection Failed

**Problem**: Can't connect to database

```
Error: Cannot connect to MongoDB Atlas
```

**Solution**:

1. Verify MONGO_URL in .env is correct
2. Check MongoDB Atlas cluster is running
3. Whitelist your IP in MongoDB Atlas:
   - Go to Network Access
   - Add Current IP
   - Or allow 0.0.0.0/0 for development
4. Verify credentials in connection string
5. Check database name is correct
6. Test connection directly:
   ```python
   from motor.motor_asyncio import AsyncIOMotorClient
   client = AsyncIOMotorClient(os.environ['MONGO_URL'])
   print(await client.server_info())
   ```

---

#### 3. CORS Errors

**Problem**: Frontend can't reach backend

```
Error: Access to XMLHttpRequest blocked by CORS
```

**Solution**:

1. Check CORS is configured in FastAPI:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
2. Verify frontend URL is in allow_origins
3. For production, update with actual domain:
   ```python
   allow_origins=["https://yourdomain.com"]
   ```
4. Check preflight request is being handled (OPTIONS)
5. Test with curl from backend server:
   ```bash
   curl -H "Origin: http://localhost:3000" http://localhost:8000/api/conversations
   ```

---

#### 4. Authentication Token Issues

**Problem**: Users keep getting logged out

```
Error: Invalid token or 401 Unauthorized
```

**Solution**:

1. Verify JWT_SECRET_KEY is consistent between sessions
2. Check token expiration time:
   ```python
   ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
   ```
3. Ensure token is properly included in requests:
   ```javascript
   headers: {
     "Authorization": `Bearer ${token}`
   }
   ```
4. Check token is being refreshed before expiry
5. Verify token is stored in localStorage/sessionStorage
6. Check that logout clears token properly

---

#### 5. Email Not Sending

**Problem**: OTP or reset emails not received

```
Error: SMTP authentication failed or email not sent
```

**Solution**:

1. Verify Gmail app password is correct (not regular password)
2. Enable "Less secure app access" if using Gmail
3. Check GMAIL_EMAIL and GMAIL_PASSWORD in .env
4. Test SMTP connection directly:
   ```python
   import smtplib
   server = smtplib.SMTP('smtp.gmail.com', 587)
   server.starttls()
   server.login(GMAIL_EMAIL, GMAIL_PASSWORD)
   print("Connected!")
   ```
5. Check email recipient is valid
6. Look for email in spam folder
7. Verify SENDER_EMAIL is correct

---

#### 6. API Endpoint Not Found

**Problem**: 404 errors on API calls

```
Error: 404 Not Found for /api/endpoint
```

**Solution**:

1. Verify endpoint is defined in server.py:
   ```python
   @app.get("/api/endpoint")
   async def get_endpoint():
       return {"data": "value"}
   ```
2. Check HTTP method matches (GET, POST, etc.)
3. Verify route prefix if using routers
4. Check URL spelling and parameters match
5. Ensure @app.get() decorator has correct path
6. Test endpoint with curl:
   ```bash
   curl http://localhost:8000/api/endpoint
   ```
7. Check API documentation: http://localhost:8000/docs

---

#### 7. Rate Limiting Issues

**Problem**: Getting rate limited errors

```
Error: 429 Too Many Requests
```

**Solution**:

1. Check spam_protection rate limits:
   ```python
   # Current: 10 msg/min, 100 msg/hour
   ```
2. Adjust limits if needed:
   ```python
   RATE_LIMIT_PER_MINUTE = 15  # Increase from 10
   RATE_LIMIT_PER_HOUR = 150   # Increase from 100
   ```
3. Clear user's rate limit counter:
   ```python
   await db.rate_limits.delete_one({"user_id": user_id})
   ```
4. Wait before retrying requests
5. Implement exponential backoff on client side

---

#### 8. Database Query Slow

**Problem**: API responses taking too long

```
Response time > 1000ms
```

**Solution**:

1. Create database indexes:
   ```python
   await db.messages.create_index([("conversation_id", 1), ("timestamp", -1)])
   await db.conversations.create_index([("user_ids", 1)])
   ```
2. Check database query performance:
   ```python
   # Use MongoDB Atlas Metrics
   # Look for slow queries in logs
   ```
3. Implement pagination for large result sets
4. Add caching for frequently accessed data
5. Optimize database filters
6. Monitor CPU and memory usage

---

### Integration Issues

#### 1. Components Import Errors

**Problem**: "Module not found" errors

```
Error: Cannot find module '@/components/....'
```

**Solution**:

1. Verify jsconfig.json has correct aliases:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       }
     }
   }
   ```
2. Restart development server after changing jsconfig.json
3. Check file path is correct
4. Verify file exists: `ls src/components/...`
5. Check for typos in import statement
6. Ensure file extension matches (.js or .jsx)

---

#### 2. Socket.IO Events Not Firing

**Problem**: Real-time events not working

```
No events received from WebSocket
```

**Solution**:

1. Check Socket.IO event listeners are set up:
   ```javascript
   socket.on('new_message', (data) => {...})
   ```
2. Verify server emits correct event name:
   ```python
   await sio.emit('new_message', message_data)
   ```
3. Check WebSocket connection is established:
   ```javascript
   socket.on("connect", () => console.log("Connected"));
   ```
4. Verify CORS allows WebSocket connections
5. Look for event errors in console
6. Test with socket.emit from client side
7. Monitor server for incoming events

---

#### 3. State Management Issues

**Problem**: Components not updating when state changes

```
Component shows stale data
```

**Solution**:

1. Ensure state is immutable:

   ```javascript
   // ✅ Correct
   setMessages([...messages, newMessage]);

   // ❌ Wrong
   messages.push(newMessage);
   setMessages(messages);
   ```

2. Use proper useState hooks
3. Check dependency arrays in useEffect:
   ```javascript
   useEffect(() => {...}, [dependency])
   ```
4. Verify context provider wraps all components
5. Use React DevTools to debug state changes
6. Check for state updates in useCallback

---

#### 4. Authentication Context Not Available

**Problem**: useAuth() hook not working

```
Error: useAuth must be used within AuthProvider
```

**Solution**:

1. Ensure AuthProvider wraps the entire app in App.js:
   ```javascript
   <AuthProvider>
     <ThemeProvider>
       <BrowserRouter>...</BrowserRouter>
     </ThemeProvider>
   </AuthProvider>
   ```
2. Check component is using hook inside provider
3. Don't use hook in components outside provider
4. Verify import path: `import { useAuth } from "@/contexts/AuthContext"`
5. Check AuthContext is exported as a function

---

### Network Issues

#### 1. Network Request Failing

**Problem**: API calls return errors

```
Error: Failed to fetch
```

**Solution**:

1. Check network tab in DevTools for request details
2. Verify backend server is running
3. Check request URL is correct
4. Verify request method (GET, POST, etc.)
5. Check request headers include Authorization if needed
6. Look for response body/error message
7. Test endpoint with curl:
   ```bash
   curl -X GET http://localhost:8000/api/conversations
   ```

---

#### 2. WebSocket Connection Refused

**Problem**: Can't establish WebSocket connection

```
Error: WebSocket connection refused
```

**Solution**:

1. Check backend WebSocket server is running
2. Verify WebSocket URL matches backend:
   ```javascript
   const socket = io("http://localhost:8000");
   ```
3. Check for CORS issues with WebSocket
4. Verify firewall isn't blocking connections
5. Check proxy/router settings
6. Look for connection errors in console
7. Test with socket.io client library

---

#### 3. API Rate Limiting

**Problem**: Getting 429 errors

```
Error: 429 Too Many Requests
```

**Solution**:

1. Check current rate limit thresholds
2. Implement request queuing on client
3. Add retry logic with exponential backoff
4. Cache responses when possible
5. Batch requests together
6. Increase rate limits on backend if needed
7. Add user feedback about rate limiting

---

### Performance Issues

#### 1. Slow Message Loading

**Problem**: Chat takes long to load

```
Messages list takes > 2 seconds to load
```

**Solution**:

1. Implement pagination (load 50 messages at a time)
2. Add virtualization for long lists (react-window)
3. Create database indexes on message queries
4. Lazy load older messages on scroll
5. Cache messages in local storage
6. Optimize message rendering with React.memo

---

#### 2. High CPU Usage

**Problem**: Application consuming too much CPU

```
CPU usage > 80%
```

**Solution**:

1. Check for infinite loops in useEffect
2. Add dependency arrays to useEffect hooks
3. Use React.memo to prevent unnecessary re-renders
4. Optimize expensive computations
5. Use useMemo and useCallback
6. Monitor with React DevTools Profiler

---

#### 3. High Memory Usage

**Problem**: Application memory growing too large

```
Memory usage > 500MB
```

**Solution**:

1. Check for memory leaks in useEffect cleanup
2. Remove event listeners properly:
   ```javascript
   return () => {
     socket.off("event", handler);
   };
   ```
3. Limit array sizes (pagination)
4. Implement message pagination
5. Clear old data when not needed
6. Monitor with DevTools Memory tab

---

## Debugging Tools

### Browser DevTools

```
F12 or Ctrl+Shift+I to open DevTools

Tabs:
- Console: View errors and logs
- Network: Monitor API requests
- Application: Check localStorage, cookies
- Performance: Analyze performance
- React DevTools: Debug component state
```

### Backend Debugging

```python
# Add logging
import logging
logger = logging.getLogger(__name__)
logger.info("Debug message")

# Check logs
tail -f server.log

# Use debugger
import pdb; pdb.set_trace()

# MongoDB queries
db.messages.find({}).pretty()
```

### Network Debugging

```bash
# Test API endpoint
curl http://localhost:8000/api/conversations

# Check WebSocket
wscat -c ws://localhost:8000/socket.io/

# Monitor network traffic
tcpdump -i any 'port 8000'
```

---

## Getting Help

### Where to Look

1. **Browser Console** (F12) - Frontend errors
2. **Network Tab** - API request issues
3. **Backend Logs** - Server errors
4. **MongoDB Logs** - Database errors
5. **Component Source Code** - Logic issues

### Reporting Issues

1. Note exact error message
2. Check browser console
3. Check backend logs
4. Describe steps to reproduce
5. Provide error screenshots
6. Check if issue was worked before

---

## Quick Reference

### Common Commands

**Backend**:

```bash
# Start server
python -m uvicorn server:app --reload

# Install dependencies
pip install -r requirements.txt

# Check MongoDB
mongo "mongodb+srv://..."
```

**Frontend**:

```bash
# Start dev server
npm start

# Build for production
npm run build

# Clear cache
npm cache clean --force
```

**Database**:

```bash
# MongoDB connection test
mongosh "mongodb+srv://..."

# View collections
show collections

# Check indexes
db.collection.getIndexes()
```

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Maintained By**: Development Team
