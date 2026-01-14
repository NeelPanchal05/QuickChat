# QuickChat - Quick Start Guide

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Python 3.8+
- MongoDB Atlas account
- Gmail account (for email notifications)

### Installation & Setup

#### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `.env` file:

```
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true
DB_NAME=quickchat
SECRET_KEY=your-super-secret-key-change-this
GMAIL_EMAIL=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
SENDER_EMAIL=your-email@gmail.com
```

Run backend:

```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup

```bash
cd frontend
npm install  # or yarn install
npm start    # or yarn start
```

The app will open at `http://localhost:3000`

---

## 📋 Features Overview

### User Features

1. **User Authentication**

   - Registration with email verification
   - OTP-based email verification
   - JWT token-based sessions

2. **Real-time Messaging**

   - Send and receive messages
   - Typing indicators
   - Message timestamps
   - Message read status indicators

3. **Profile Management**

   - Edit profile information
   - Upload profile photo
   - Change password
   - View account statistics

4. **Theme Customization**

   - 8 preset theme options
   - Custom color picker
   - Theme persistence

5. **Chat Features**

   - Multi-user conversations
   - Conversation search
   - Pin important conversations
   - Archive old conversations
   - Block users

6. **Media Sharing**

   - Upload and share files
   - GIF picker integration
   - Preview attached files

7. **Voice & Video Calls**

   - Start calls from chat
   - Call history tracking
   - Call status indicators

8. **Engagement Features**

   - Create and vote on polls
   - Use emoji picker
   - Send GIFs

9. **Privacy & Security**

   - User blocking system
   - Conversation archiving
   - Privacy settings management
   - Message encryption support
   - Spam protection

10. **Accessibility**
    - Mobile responsive design
    - Dark theme throughout
    - Keyboard navigation
    - Accessible components

---

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/refresh` - Refresh token

### Conversations

- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create new conversation
- `PUT /api/conversations/{id}` - Update conversation
- `DELETE /api/conversations/{id}` - Delete conversation
- `PUT /api/conversations/{id}/archive` - Archive conversation
- `GET /api/conversations/archived` - Get archived conversations

### Messages

- `GET /api/messages/{conversation_id}` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/{id}/read` - Mark as read
- `DELETE /api/messages/{id}` - Delete message

### Users

- `GET /api/users/{id}` - Get user profile
- `PUT /api/users/{id}` - Update profile
- `POST /api/users/block/{id}` - Block user
- `POST /api/users/unblock/{id}` - Unblock user
- `GET /api/users/blocked` - Get blocked users

### Calls

- `POST /api/calls` - Create call
- `GET /api/calls/history` - Get call history
- `DELETE /api/calls/{id}` - Delete call

### Polls

- `POST /api/polls` - Create poll
- `GET /api/polls/{id}` - Get poll details
- `POST /api/polls/{id}/vote` - Vote on poll

---

## 📁 Project Structure

```
QuickChat/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── CallModal.js
│   │   │   ├── SettingsMenu.js
│   │   │   ├── ChatBackgroundSelector.js
│   │   │   ├── CallHistory.js
│   │   │   ├── PrivacyManager.js
│   │   │   ├── MediaUploader.js
│   │   │   ├── GifPicker.js
│   │   │   ├── PollCreator.js
│   │   │   └── MessageReadStatus.js
│   │   ├── contexts/
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js
│   │   ├── pages/
│   │   │   ├── Chat.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── VerifyOTP.js
│   │   │   └── Profile.js
│   │   ├── lib/
│   │   │   └── utils.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── jsconfig.json
│
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── encryption.py       # Message encryption utilities
│   ├── i18n.py            # Internationalization support
│   ├── spam_protection.py # Spam detection & rate limiting
│   ├── requirements.txt
│   └── .env
│
├── design_guidelines.json
├── README.md
└── INTEGRATION_COMPLETE.md
```

---

## 🎨 Component Usage

### Using ThemeContext

```javascript
import { useTheme } from "@/contexts/ThemeContext";

function MyComponent() {
  const { currentTheme, themes, setTheme } = useTheme();

  return <div style={currentTheme.bgStyle}>{/* Your content */}</div>;
}
```

### Using AuthContext

```javascript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, token, logout, API } = useAuth();

  // Make authenticated API calls
  const response = await API.get("/api/conversations");
}
```

### Using Toast Notifications

```javascript
import { toast } from "sonner";

// Success
toast.success("Operation successful!");

// Error
toast.error("Something went wrong");

// Info
toast.info("Here's some information");

// Loading
const id = toast.loading("Loading...");
toast.success("Done!", { id });
```

---

## 🔐 Security Features

1. **Authentication**

   - JWT tokens with 7-day expiration
   - Bcrypt password hashing
   - Email OTP verification

2. **Data Protection**

   - Fernet encryption for sensitive data
   - HTTPS-ready setup
   - CORS configured

3. **Spam Protection**

   - Rate limiting (10 msg/min, 100 msg/hour)
   - Keyword-based spam detection
   - User-based throttling

4. **Privacy**
   - User blocking system
   - Conversation archiving
   - Message deletion

---

## 📱 Responsive Breakpoints

- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md)
- Desktop: > 1024px (lg)

All components are fully responsive using Tailwind CSS.

---

## 🎯 Development Workflow

### Adding a New Component

1. Create component in `src/components/`
2. Import required dependencies
3. Use shadcn/ui components for UI
4. Add to appropriate dialog in Chat.js
5. Connect to relevant state

### Adding a New API Endpoint

1. Define Pydantic model in `server.py`
2. Create router function with authentication
3. Add CORS if cross-origin needed
4. Call from frontend using `API` from AuthContext

### Styling Guidelines

- Use Tailwind CSS classes
- Follow color scheme: #050505 (bg), #7000FF (accent), #A1A1AA (text)
- Mobile-first approach
- Use responsive prefixes (sm:, md:, lg:)

---

## 🐛 Troubleshooting

### Backend Connection Issues

```
Error: Cannot connect to MongoDB
Solution: Check MONGO_URL in .env and ensure database is accessible
```

### Authentication Errors

```
Error: Invalid token
Solution: Clear localStorage and login again
```

### Real-time Updates Not Working

```
Error: Socket connection failed
Solution: Ensure Socket.IO server is running and CORS allows client
```

### Theme Not Persisting

```
Error: Theme resets after reload
Solution: Check browser localStorage is enabled
```

---

## 📊 Performance Tips

1. **Frontend**

   - Use React.memo for expensive components
   - Lazy load components with React.lazy
   - Optimize images before uploading

2. **Backend**

   - Use database indexes for frequent queries
   - Implement caching for repeated requests
   - Monitor rate limits

3. **Database**
   - Create compound indexes for common filters
   - Archive old messages periodically
   - Regular database backups

---

## 🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy build/ folder
```

### Backend (Heroku/Railway/Render)

```bash
git push heroku main
# or configure for other platforms
```

### Environment Setup

- Update API URLs for production
- Change SECRET_KEY to secure random value
- Configure CORS for production domain
- Set up environment variables

---

## 📞 Support

For issues or questions:

1. Check the documentation files
2. Review component source code
3. Check browser console for errors
4. Review backend logs

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
