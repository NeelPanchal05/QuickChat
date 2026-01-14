/**
 * Chat.js Integration Template
 * 
 * This file shows all the imports and state setup needed to integrate
 * the new features into the Chat.js component.
 */

// ==================== NEW IMPORTS ====================

// Pages
import Profile from '@/pages/Profile';
import TermsAndConditions from '@/pages/TermsAndConditions';

// Components
import SettingsMenu from '@/components/SettingsMenu';
import ChatBackgroundSelector from '@/components/ChatBackgroundSelector';
import CallHistory from '@/components/CallHistory';
import PrivacyManager from '@/components/PrivacyManager';
import MediaUploader from '@/components/MediaUploader';
import GifPicker from '@/components/GifPicker';
import PollCreator from '@/components/PollCreator';
import MessageReadStatus from '@/components/MessageReadStatus';

// Contexts
import { useTheme } from '@/contexts/ThemeContext';

// Icons
import { Settings, MessageCircle, Phone, Archive, Shield } from 'lucide-react';

// ==================== NEW STATE VARIABLES ====================

// In your Chat component function body, add:

// Profile & Settings
const [showProfile, setShowProfile] = useState(false);
const [showTerms, setShowTerms] = useState(false);

// Chat Features
const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
const [showCallHistory, setShowCallHistory] = useState(false);
const [showPrivacy, setShowPrivacy] = useState(false);

// Message Input Features
const [showMediaUploader, setShowMediaUploader] = useState(false);
const [showGifPicker, setShowGifPicker] = useState(false);
const [showPollCreator, setShowPollCreator] = useState(false);
const [attachedFiles, setAttachedFiles] = useState([]);

// Theme
const { currentThemeData } = useTheme();

// ==================== NEW HANDLERS ====================

// Profile & Logout
const handleLogout = async () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Navigate to login
  window.location.href = '/login';
};

// Media Upload
const handleMediaUpload = (file) => {
  setAttachedFiles(prev => [...prev, file]);
};

const handleRemoveMedia = (fileId) => {
  setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
};

// GIF Selection
const handleSelectGif = (gifUrl) => {
  // Send GIF as message
  socket.emit('new_message', {
    conversation_id: selectedConversation,
    content: gifUrl,
    message_type: 'gif'
  });
  setShowGifPicker(false);
};

// Poll Creation
const handleCreatePoll = async (poll) => {
  try {
    const response = await axios.post(
      `${API}/polls`,
      {
        conversation_id: selectedConversation,
        ...poll
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    socket.emit('new_message', {
      conversation_id: selectedConversation,
      content: JSON.stringify(response.data),
      message_type: 'poll'
    });
    
    toast.success('Poll created!');
  } catch (error) {
    toast.error('Failed to create poll');
  }
};

// ==================== JSX ADDITIONS ====================

// In Chat Header - Add Settings Menu:
<div className="flex items-center gap-2">
  <SettingsMenu 
    onProfile={() => setShowProfile(true)}
    onLogout={handleLogout}
    onTerms={() => setShowTerms(true)}
  />
</div>

// In Chat Container - Apply Theme:
<div style={currentThemeData?.bgStyle} className="flex-1 overflow-y-auto p-4 space-y-4">
  {/* Messages */}
</div>

// In Message Input Area - Add Feature Buttons:
<div className="flex gap-2">
  <Button 
    onClick={() => setShowBackgroundSelector(true)}
    variant="ghost"
    size="icon"
    title="Change Background"
  >
    <Settings size={20} />
  </Button>
  
  <Button 
    onClick={() => setShowCallHistory(true)}
    variant="ghost"
    size="icon"
    title="Call History"
  >
    <Phone size={20} />
  </Button>
  
  <Button 
    onClick={() => setShowPrivacy(true)}
    variant="ghost"
    size="icon"
    title="Privacy Settings"
  >
    <Shield size={20} />
  </Button>
  
  <Button 
    onClick={() => setShowMediaUploader(!showMediaUploader)}
    variant="ghost"
    size="icon"
    title="Attach Media"
  >
    <Paperclip size={20} />
  </Button>
  
  <Button 
    onClick={() => setShowGifPicker(true)}
    variant="ghost"
    size="icon"
    title="Insert GIF"
  >
    <Smile size={20} />
  </Button>
  
  <Button 
    onClick={() => setShowPollCreator(true)}
    variant="ghost"
    size="icon"
    title="Create Poll"
  >
    <BarChart3 size={20} />
  </Button>
</div>

// Media Uploader in Input Section:
{showMediaUploader && (
  <MediaUploader 
    onUpload={handleMediaUpload}
    disabled={loading}
  />
)}

// Display Attached Files:
{attachedFiles.length > 0 && (
  <div className="bg-black/40 border border-white/10 rounded-lg p-3 space-y-2 mb-3">
    <p className="text-xs font-semibold text-[#A1A1AA]">
      Attached Files ({attachedFiles.length})
    </p>
    <div className="space-y-2">
      {attachedFiles.map(file => (
        <div key={file.id} className="flex items-center justify-between p-2 bg-black/60 rounded">
          <span className="text-sm text-white truncate">{file.name}</span>
          <Button 
            onClick={() => handleRemoveMedia(file.id)}
            size="icon"
            variant="ghost"
            className="text-red-400 hover:bg-red-500/20"
          >
            <X size={16} />
          </Button>
        </div>
      ))}
    </div>
  </div>
)}

// In Message Display - Add Read Status:
{message.sender_id === user.user_id && (
  <MessageReadStatus status={message.status} size={14} />
)}

// ==================== DIALOGS/MODALS ====================

// Profile Dialog
{showProfile && (
  <Dialog open={showProfile} onOpenChange={setShowProfile}>
    <DialogContent className="bg-black/95 border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
      <Profile onBack={() => setShowProfile(false)} />
    </DialogContent>
  </Dialog>
)}

// Terms & Conditions Dialog
{showTerms && (
  <TermsAndConditions 
    onBack={() => setShowTerms(false)}
    onAccept={() => {
      setShowTerms(false);
      toast.success('Terms accepted!');
    }}
  />
)}

// Background Selector Dialog
<ChatBackgroundSelector 
  open={showBackgroundSelector}
  onOpenChange={setShowBackgroundSelector}
/>

// Call History Dialog
<CallHistory 
  open={showCallHistory}
  onOpenChange={setShowCallHistory}
/>

// Privacy Manager Dialog
<PrivacyManager 
  open={showPrivacy}
  onOpenChange={setShowPrivacy}
  conversations={conversations}
/>

// GIF Picker Dialog
<GifPicker 
  open={showGifPicker}
  onOpenChange={setShowGifPicker}
  onSelectGif={handleSelectGif}
/>

// Poll Creator Dialog
<PollCreator 
  open={showPollCreator}
  onOpenChange={setShowPollCreator}
  onCreatePoll={handleCreatePoll}
/>

// ==================== UPDATED MESSAGE SEND ====================

const sendMessageWithAttachments = async () => {
  // Send text message
  if (messageContent.trim()) {
    await sendMessage(messageContent);
  }
  
  // Send attached files
  for (const file of attachedFiles) {
    await axios.post(
      `${API}/conversations/${selectedConversation}/messages`,
      {
        content: file.data,
        message_type: file.type,
        file_name: file.name,
        mime_type: file.mimeType
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    socket.emit('new_message', {
      conversation_id: selectedConversation,
      content: file.data,
      message_type: file.type,
      file_name: file.name
    });
  }
  
  // Clear input
  setMessageContent('');
  setAttachedFiles([]);
};

// ==================== REQUIRED ADDITIONS ====================

// 1. Add to package.json if not already present:
// No new npm packages required! All components use existing dependencies.

// 2. Add to backend requirements.txt:
// cryptography>=41.0.0

// 3. Install backend dependency:
// pip install cryptography

// 4. Update .env (optional, for encryption):
// ENCRYPTION_KEY=<generate key if needed>

// ==================== STYLING NOTES ====================

/*
All components follow the dark glassmorphism theme:
- Background: #050505 (almost black)
- Accent: #7000FF (purple)
- Text: #A1A1AA (light gray)
- Borders: border-white/10 (10% white transparency)
- Effects: backdrop-blur-xl (glassmorphism)

Responsive classes:
- Mobile: default styling
- Tablet: md: prefix
- Desktop: lg: prefix

No additional CSS needed - all styled with Tailwind!
*/

// ==================== TESTING ====================

/*
After integration, test:

1. Profile page
   - Edit name, username, bio
   - Upload photo
   - Change password
   - Save and reload

2. Settings menu
   - Theme selection changes background
   - Language option shows
   - Logout redirects to login
   - Call history opens dialog
   - Privacy manager opens dialog

3. Message features
   - Media upload shows preview
   - GIF picker displays GIFs
   - Poll creator validates input
   - Message read status displays

4. Responsive design
   - Test on mobile (320px)
   - Test on tablet (768px)
   - Test on desktop (1440px)
   - All modals work on all sizes

5. Theme persistence
   - Change background
   - Reload page
   - Background should persist
*/

// ==================== DEPLOYMENT ====================

/*
Before going live:

1. Backend setup:
   - Install cryptography: pip install cryptography
   - Add ENCRYPTION_KEY to .env (optional)
   - Restart uvicorn server
   
2. Frontend setup:
   - npm install (should not need new packages)
   - npm start to verify no errors

3. Database:
   - Ensure MongoDB collections exist:
     - call_history
     - polls
     - archived_conversations
   - Create indexes for performance

4. Testing:
   - Test all endpoints with Postman
   - Test UI on real mobile devices
   - Check cross-browser compatibility

5. Production:
   - Enable HTTPS
   - Configure CORS for production domain
   - Set rate limiting in reverse proxy
   - Monitor logs for errors
*/

export default Chat;
