# QuickChat - Developer Quick Reference

## 🎯 Project Overview

QuickChat is a **production-ready real-time chat application** with 14 fully-integrated features built with React, FastAPI, and MongoDB.

**Status**: ✅ READY FOR PRODUCTION  
**Version**: 1.0.0  
**Last Updated**: January 2026

---

## ⚡ Quick Start (5 Minutes)

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
export MONGO_URL="your-mongodb-url"
export SECRET_KEY="your-secret-key"
python -m uvicorn server:app --reload
```

**Backend running at**: http://localhost:8000

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

**Frontend running at**: http://localhost:3000

### 3. Test

- Go to http://localhost:3000
- Register with email
- Verify OTP
- Start chatting!

---

## 📁 Key Files You Need to Know

### Frontend

| File                             | Purpose             | Lines |
| -------------------------------- | ------------------- | ----- |
| `src/pages/Chat.js`              | Main chat interface | 858   |
| `src/contexts/ThemeContext.js`   | Theme management    | 90    |
| `src/contexts/AuthContext.js`    | Authentication      | ~200  |
| `src/components/SettingsMenu.js` | Settings dropdown   | 140   |
| `src/components/Profile.js`      | Profile editor      | 150   |

### Backend

| File                 | Purpose              | Lines |
| -------------------- | -------------------- | ----- |
| `server.py`          | FastAPI app          | 830   |
| `encryption.py`      | Message encryption   | 50    |
| `i18n.py`            | Internationalization | 150+  |
| `spam_protection.py` | Rate limiting        | 200+  |

---

## 🔌 Key Component Architecture

### Auth Flow

```
Login.js → AuthContext → backend/auth → JWT Token → useAuth Hook
```

### Real-time Messaging

```
Chat.js → Socket.IO → backend/sio → MongoDB → All Users
```

### Theme System

```
ThemeContext → localStorage → useTheme Hook → All Components
```

---

## 🛠️ Common Tasks

### Add a New Feature

1. Create component in `src/components/`
2. Add state in Chat.js: `const [showFeature, setShowFeature] = useState(false)`
3. Add Dialog in Chat.js: `<Dialog open={showFeature}><YourComponent/></Dialog>`
4. Add button to trigger feature
5. Create API endpoint in `server.py` if needed

### Fix an Issue

1. Check browser console (F12)
2. Check backend logs
3. Check [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
4. Look at relevant component source code

### Deploy to Production

1. Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Set up environment variables
3. Build frontend: `npm run build`
4. Deploy to hosting service
5. Monitor logs

---

## 🎨 Styling Guide

### Colors

```javascript
bg: "#050505"; // Dark background
accent: "#7000FF"; // Purple accent
text: "#FFFFFF"; // White text
muted: "#A1A1AA"; // Gray text
```

### Tailwind Classes

```javascript
// Use responsive prefixes
<div className="sm:w-full md:w-1/2 lg:w-1/3">

// Common patterns
className="bg-[#050505] border-white/10 rounded-lg p-4"
className="flex items-center justify-between"
```

### Theme Application

```javascript
import { useTheme } from "@/contexts/ThemeContext";

function Component() {
  const { currentThemeData } = useTheme();
  return <div style={currentThemeData.bgStyle}>{/* content */}</div>;
}
```

---

## 🔐 Security Essentials

### Authentication

- JWT tokens (7 days)
- Bcrypt hashing
- OTP verification
- Use: `const { user, token, API } = useAuth()`

### Rate Limiting

- 10 msg/min per user
- 100 msg/hour per user
- Configured in `spam_protection.py`

### Encryption

- Available in `encryption.py`
- Use: `encrypt_message()`, `decrypt_message()`

---

## 📊 API Endpoints

### Core

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-otp
GET    /api/conversations
POST   /api/messages
```

### Features

```
GET    /api/calls/history
POST   /api/polls
GET    /api/users/blocked
PUT    /api/conversations/{id}/archive
```

**Full list**: See [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md)

---

## 🐛 Debugging Tips

### Frontend Errors

```javascript
// Browser Console (F12)
// Check for red error messages
// Network tab shows API requests
// React DevTools for state issues
```

### Backend Errors

```bash
# Terminal output shows errors
# Check logs for detailed messages
# Use: print(f"Debug: {variable}")
```

### Database Issues

```javascript
// MongoDB Atlas dashboard
// Check collections exist
// Verify indexes created
// Monitor CPU/Memory usage
```

---

## 📝 Project Structure

```
QuickChat/
├── frontend/src/
│   ├── pages/          # Page components
│   ├── components/     # Reusable components
│   ├── contexts/       # Global state
│   ├── lib/            # Utilities
│   └── App.js          # Root component
├── backend/
│   ├── server.py       # FastAPI app
│   ├── *.py            # Modules
│   └── requirements.txt # Python packages
└── docs/
    ├── QUICK_START.md
    ├── DEPLOYMENT_CHECKLIST.md
    └── TROUBLESHOOTING_GUIDE.md
```

---

## ✅ Quality Checklist

Before committing code:

- [ ] No console errors
- [ ] No TypeScript warnings
- [ ] Responsive on mobile
- [ ] All buttons working
- [ ] Proper error handling
- [ ] Loading states shown
- [ ] Comments where needed

Before deploying:

- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database backed up
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Performance tested

---

## 🚀 Deployment Quick Reference

### Vercel (Frontend)

```bash
npm run build
vercel --prod
```

### Heroku (Backend)

```bash
git push heroku main
```

### Environment Variables

```
MONGO_URL=<database-url>
DB_NAME=quickchat
SECRET_KEY=<random-string>
GMAIL_EMAIL=<email>
GMAIL_PASSWORD=<password>
```

---

## 📚 Documentation Map

| Document                                             | Purpose           | When to Use            |
| ---------------------------------------------------- | ----------------- | ---------------------- |
| [QUICK_START.md](QUICK_START.md)                     | Get started       | First time setup       |
| [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md)   | How features work | Understanding features |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)   | Deploy steps      | Going to production    |
| [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) | Fix issues        | Something broken       |
| [FEATURES_VERIFICATION.md](FEATURES_VERIFICATION.md) | Feature status    | Checking completeness  |

---

## 💡 Pro Tips

### Performance

- Use React DevTools Profiler to find slow renders
- Check Network tab for large API responses
- Use MongoDB indexes for frequent queries

### Debugging

- Use `console.log()` in frontend
- Use `print()` in backend
- Check browser DevTools → Sources for breakpoints
- Use MongoDB Atlas dashboard to check data

### Development

- Use `--reload` flag for hot reload
- Clear browser cache (Ctrl+Shift+Delete)
- Check localStorage for stored data
- Use Postman for API testing

### Testing

- Test on actual mobile device
- Test with different themes
- Test with slow network (DevTools)
- Test with JS disabled (DevTools)

---

## 🔗 Important Links

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB Atlas**: https://cloud.mongodb.com

---

## 📞 Quick Help

**Q: Where's the code for feature X?**  
A: See component files in `src/components/`

**Q: How do I add a new API endpoint?**  
A: Add function to `server.py`, test with Postman

**Q: How do I change the theme colors?**  
A: Edit `ThemeContext.js` or use color picker in app

**Q: How do I connect a new component?**  
A: Import in `Chat.js`, add state, add Dialog wrapper

**Q: What if I get CORS errors?**  
A: Check CORS middleware in `server.py`

**Q: Where are messages stored?**  
A: MongoDB in `messages` collection

---

## 🎓 Learning Resources

### React

- [React Hooks](https://react.dev/reference/react)
- [Context API](https://react.dev/reference/react/useContext)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)

### FastAPI

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Async MongoDB](https://motor.readthedocs.io/)
- [JWT Authentication](https://fastapi.tiangolo.com/tutorial/security/)

### Tailwind CSS

- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Responsive Design](https://tailwindcss.com/docs/responsive-design)

---

## ✨ What's Next?

### Short Term

- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Fix reported issues

### Medium Term

- [ ] Version 1.1 features
- [ ] Performance optimization
- [ ] Security enhancements
- [ ] User analytics

### Long Term

- [ ] Mobile app
- [ ] Advanced features
- [ ] Enterprise features
- [ ] AI integration

---

## 📞 Support

Need help?

1. Check [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
2. Review component source code
3. Check browser console (F12)
4. Check backend logs

---

**Happy coding! 🚀**

Remember: When in doubt, check the documentation files - they have all the answers!

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
