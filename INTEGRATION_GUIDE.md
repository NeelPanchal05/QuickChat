# QuickChat - Feature Integration Guide

This guide explains how to integrate the new features into Chat.js and other pages.

## 1. Integrate Settings Menu into Chat.js Header

```javascript
import SettingsMenu from "@/components/SettingsMenu";
import CallHistory from "@/components/CallHistory";
import PrivacyManager from "@/components/PrivacyManager";
import Profile from "@/pages/Profile";

// In your Chat component header:
const [showProfile, setShowProfile] = useState(false);
const [showCallHistory, setShowCallHistory] = useState(false);
const [showPrivacy, setShowPrivacy] = useState(false);
const [showTerms, setShowTerms] = useState(false);

// Add to JSX:
<SettingsMenu
  onProfile={() => setShowProfile(true)}
  onLogout={() => {
    // Handle logout
  }}
  onTerms={() => setShowTerms(true)}
/>;

{
  showProfile && <Profile onBack={() => setShowProfile(false)} />;
}
{
  showCallHistory && (
    <CallHistory open={showCallHistory} onOpenChange={setShowCallHistory} />
  );
}
{
  showPrivacy && (
    <PrivacyManager
      open={showPrivacy}
      onOpenChange={setShowPrivacy}
      conversations={conversations}
    />
  );
}
{
  showTerms && (
    <TermsAndConditions open={showTerms} onBack={() => setShowTerms(false)} />
  );
}
```

## 2. Add Chat Background Selector

```javascript
import ChatBackgroundSelector from '@/components/ChatBackgroundSelector';
import { useTheme } from '@/contexts/ThemeContext';

// In Chat component:
const { currentThemeData } = useTheme();
const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);

// Apply theme to chat container:
<div style={currentThemeData?.bgStyle} className="flex-1 overflow-y-auto p-4">
  {/* Chat messages here */}
</div>

// Add button to access background selector:
<Button onClick={() => setShowBackgroundSelector(true)}>
  Change Background
</Button>

<ChatBackgroundSelector open={showBackgroundSelector} onOpenChange={setShowBackgroundSelector} />
```

## 3. Add Media Upload to Message Input

```javascript
import MediaUploader from "@/components/MediaUploader";

// In message input section:
const [attachedFiles, setAttachedFiles] = useState([]);

<MediaUploader
  onUpload={(file) => setAttachedFiles((prev) => [...prev, file])}
  disabled={loading}
/>;

// When sending message:
const sendMessageWithMedia = async () => {
  // Send text message
  await sendMessage(messageContent);

  // Send attached files
  for (const file of attachedFiles) {
    await sendMediaMessage(file);
  }

  setAttachedFiles([]);
};
```

## 4. Add GIF Picker to Message Input

```javascript
import GifPicker from '@/components/GifPicker';

// In message input component:
const [showGifPicker, setShowGifPicker] = useState(false);

<Button onClick={() => setShowGifPicker(true)}>
  <Smile size={20} />
</Button>

<GifPicker
  open={showGifPicker}
  onOpenChange={setShowGifPicker}
  onSelectGif={(gifUrl) => {
    // Send GIF as message
    sendMessage(gifUrl, 'gif');
  }}
/>
```

## 5. Add Poll Creator to Message Input

```javascript
import PollCreator from '@/components/PollCreator';

// In message input component:
const [showPollCreator, setShowPollCreator] = useState(false);

<Button onClick={() => setShowPollCreator(true)}>
  <BarChart3 size={20} />
</Button>

<PollCreator
  open={showPollCreator}
  onOpenChange={setShowPollCreator}
  onCreatePoll={(poll) => {
    // Save poll to database and send to conversation
    sendPoll(poll);
  }}
/>
```

## 6. Display Message Read Status

```javascript
import MessageReadStatus from "@/components/MessageReadStatus";

// In message component:
<div className="flex items-end gap-2">
  <p>{message.content}</p>
  {message.sender_id === currentUser.user_id && (
    <MessageReadStatus status={message.status} size={16} />
  )}
</div>;
```

## 7. Add Profile Edit in Settings

Instead of navigating away, you can embed Profile in a modal:

```javascript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Profile from "@/pages/Profile";

<Dialog open={showProfile} onOpenChange={setShowProfile}>
  <DialogContent className="bg-black/95 border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
    </DialogHeader>
    <Profile onBack={() => setShowProfile(false)} />
  </DialogContent>
</Dialog>;
```

## 8. Terms & Conditions in Registration

Update Register.js:

```javascript
import TermsAndConditions from '@/pages/TermsAndConditions';

// Add state:
const [showTerms, setShowTerms] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);

// Before registration form:
{!termsAccepted ? (
  <TermsAndConditions
    onBack={() => {/* handle back */}}
    onAccept={() => setTermsAccepted(true)}
  />
) : (
  // Show registration form
)}
```

## 9. Enable Message Encryption

Backend automatically encrypts messages. In frontend, messages are encrypted before sending:

```javascript
// In sendMessage function:
const encryptedContent = encryptMessage(content); // Uses backend encryption
await axios.post(`${API}/conversations/${conversationId}/messages`, {
  content: encryptedContent,
  message_type: "text",
  encrypted: true,
});
```

## 10. Use Multi-Language Support

On backend, integrate i18n:

```python
from i18n import get_translation

# In response:
message = get_translation(user_language, 'message_sent')
return {'message': message}
```

On frontend, store language preference:

```javascript
const [language, setLanguage] = useState(
  localStorage.getItem("app_language") || "en"
);

const handleLanguageChange = (lang) => {
  setLanguage(lang);
  localStorage.setItem("app_language", lang);
  // Fetch translations from backend or use frontend i18n library
};
```

## 11. Implement Spam Protection

Backend automatically checks spam. Frontend can show warnings:

```javascript
try {
  await sendMessage(content);
} catch (error) {
  if (error.response?.status === 429) {
    toast.error("You're sending messages too quickly. Please slow down.");
  }
}
```

## 12. Handle Block/Archive Features

After integrating PrivacyManager:

```javascript
// When user blocks another:
const handleBlockUser = async (userId) => {
  await axios.post(
    `${API}/users/block/${userId}`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  toast.success("User blocked");
  // Remove from conversations list if desired
};

// Archive conversation:
const handleArchiveChat = async (conversationId) => {
  await axios.put(
    `${API}/conversations/${conversationId}/archive`,
    { archived: true },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  // Hide from main chat list
};
```

## Testing Checklist

- [ ] Profile edit works and persists
- [ ] Theme selection changes background
- [ ] Settings menu appears and functions
- [ ] File upload shows preview
- [ ] GIF search and selection works
- [ ] Poll creation validates input
- [ ] Call history displays correctly
- [ ] Block/archive functions remove chats
- [ ] Message read status displays correctly
- [ ] All components responsive on mobile
- [ ] Terms & Conditions flow works
- [ ] Logout from settings menu works
- [ ] Language selection changes text
- [ ] Spam protection blocks rapid messages

## Styling Notes

All components use:

- Background: `#050505` (almost black)
- Primary accent: `#7000FF` (purple)
- Secondary text: `#A1A1AA` (light gray)
- Borders: `border-white/10` (10% white)
- Backdrop blur: `backdrop-blur-xl` (glassmorphism)

For consistency, use these classes in new components.

## API Response Format

All new endpoints return JSON with consistent format:

```json
{
  "message": "Operation successful",
  "data": {},
  "status": "success"
}
```

Error responses:

```json
{
  "detail": "Error message",
  "status": "error"
}
```

## Environment Variables

Add to `.env` if using encryption:

```
ENCRYPTION_KEY=<generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
```

Without ENCRYPTION_KEY, the app will derive one from SECRET_KEY (less secure).

## Troubleshooting

**Issue**: Theme not persisting

- Check localStorage is enabled
- Verify theme ID is correct

**Issue**: Media upload fails

- Check file size (max 50MB)
- Verify file type is supported
- Check backend file storage permissions

**Issue**: GIF picker empty

- Integrate with GIPHY API
- Or use default trending GIFs

**Issue**: Spam protection blocking legitimate users

- Adjust limits in `spam_protection.py`
- Add whitelist for fast talkers

**Issue**: Encryption errors

- Generate new ENCRYPTION_KEY
- Update .env file
- Restart backend server
