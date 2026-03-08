import React, { useState, useRef } from "react";
import { Send, MapPin, Paperclip, Smile, Mic, Square, X, Image, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { encryptMessage } from "@/utils/encryption";
import compressImage from '@/utils/compressImage';

export default function MessageInput({ isCurrentChatBlocked }) {
  const EmojiPicker = React.lazy(() => import("emoji-picker-react"));
  const { t } = useLanguage();
  const { user, socket, API, token } = useAuth();
  const { selectedConversation, addOptimisticMessage, replyingTo, setReplyingTo, setUploadProgress, clearUploadProgress } = useChat();
  const { addOfflineAction } = import('@/hooks/useChatStore').then(m => m.useChatStore.getState()); // We'll get it directly from hook below


  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(
    API,
    token,
    selectedConversation,
    addOptimisticMessage
  );

  const typingTimeoutRef = useRef(null);

  const handleTyping = () => {
    if (!typingTimeoutRef.current && socket && selectedConversation) {
      socket.emit("typing", { conversation_id: selectedConversation.conversation_id });
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 1000);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate limits
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) { // 50MB
      toast.error('Total file size exceeds 50MB');
      return;
    }
    
    // Check total files (existing + new)
    if (attachedFiles.length + files.length > 10) {
      toast.error('Maximum 10 files allowed');
      return;
    }

    setShowMediaUploader(false);

    for (let file of files) {
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        try {
          const toastId = toast.loading(`Compressing ${file.name}...`);
          file = await compressImage(file, options);
          toast.dismiss(toastId);
        } catch (error) {
          console.error("Compression failed:", error);
          toast.error(`Compression failed for ${file.name}`);
        }
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: file.type || 'application/octet-stream',
            data: e.target.result,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if (
      (!messageInput.trim() && attachedFiles.length === 0) ||
      !selectedConversation ||
      !user
    )
      return;

    const myPrivateKey = localStorage.getItem(`e2ee_private_key_${user.email}`);
    const theirPublicKey = selectedConversation.other_user?.public_key;

    if (messageInput.trim()) {
      const tempId = addOptimisticMessage(messageInput, "text", null, replyingTo?.message_id);
      const encryptedContent = encryptMessage(messageInput, myPrivateKey, theirPublicKey);
      
      const payload = {
        conversation_id: selectedConversation.conversation_id,
        content: encryptedContent,
        message_type: "text",
        temp_id: tempId,
        reply_to: replyingTo?.message_id
      };

      if (socket?.connected) {
        socket.emit("send_message", payload);
      } else {
        addOfflineAction({
          id: tempId,
          type: 'send_message',
          payload: payload
        });
        toast.info("You're offline. Message queued.");
      }
    }

    for (const file of attachedFiles) {
      const tempId = addOptimisticMessage(file.data, file.type, file.name, replyingTo?.message_id);
      
      // For large files E2EE in-browser base64 can crash the tab, so we might just send the file
      // normally for this demo unless we want to chunk it. Let's encrypt the data URI!
      const encryptedFileContent = encryptMessage(file.data, myPrivateKey, theirPublicKey);

      try {
        setUploadProgress(tempId, 0);
        await axios.post(
          `${API}/conversations/${selectedConversation.conversation_id}/messages`,
          { content: encryptedFileContent, message_type: file.type, file_name: file.name, temp_id: tempId, reply_to: replyingTo?.message_id },
          { 
            headers: { Authorization: `Bearer ${token}` },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(tempId, percentCompleted);
            }
          }
        );
      } catch (error) {
        toast.error(`Failed to send ${file.name}`);
      } finally {
        // Clear progress slightly after completion to allow UI to animate to 100%
        setTimeout(() => clearUploadProgress(tempId), 500);
      }
    }

    setMessageInput("");
    setAttachedFiles([]);
    setShowMediaUploader(false);
    setShowEmojiPicker(false);
    setReplyingTo(null);
  };

  const sendLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    toast.info("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const locationUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        const tempId = addOptimisticMessage(locationUrl, "location");
        
        const myPrivateKey = localStorage.getItem(`e2ee_private_key_${user.email}`);
        const theirPublicKey = selectedConversation.other_user?.public_key;
        const encryptedLocation = encryptMessage(locationUrl, myPrivateKey, theirPublicKey);
        
        const payload = {
          conversation_id: selectedConversation.conversation_id,
          content: encryptedLocation,
          message_type: "location",
          temp_id: tempId,
        };
        
        if (socket?.connected) {
          socket.emit("send_message", payload);
        } else {
          addOfflineAction({
            id: tempId,
            type: 'send_message',
            payload: payload
          });
          toast.info("You're offline. Location queued.");
        }
      },
      () => toast.error("Unable to retrieve location")
    );
  };

  if (isCurrentChatBlocked) {
    return (
      <div className="p-4 bg-card border-t border-border z-10 relative text-center">
        <div className="inline-block p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium">
          You cannot send messages to a blocked user.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card border-t border-border z-10 relative flex flex-col gap-2" style={{ backdropFilter: 'blur(20px)' }}>
      {replyingTo && (
        <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg border border-border text-sm mb-1 px-3">
          <div className="flex flex-col overflow-hidden max-w-[85%]">
            <span className="text-primary font-semibold text-xs mb-0.5">
              {replyingTo.sender_id === user?.user_id ? "Replying to yourself" : "Replying"}
            </span>
            <span className="truncate text-muted-foreground text-xs">
              {replyingTo.message_type === "text" ? replyingTo.content : `Attached ${replyingTo.message_type}`}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="h-6 w-6 rounded-full hover:bg-muted">
            <X size={14} />
          </Button>
        </div>
      )}

      {showMediaUploader && (
        <div className="absolute bottom-16 left-0 bg-popover border border-border p-4 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[200px] z-50">
          <label className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors text-sm">
            <Image size={18} /> {t("photo_video")}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <label className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors text-sm">
            <FileIcon size={18} /> {t("document")}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      )}

      {attachedFiles.length > 0 && (
        <div className="absolute bottom-16 left-4 right-4 bg-popover/90 backdrop-blur-md p-3 rounded-xl border border-border shadow-2xl flex flex-wrap gap-2 z-40 max-h-32 overflow-y-auto">
          {attachedFiles.map((f) => (
            <div
              key={f.id}
              className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 group transition-colors"
              style={{background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.25)', color:'#c4b5fd'}}
            >
              {f.name}
              <X
                size={11}
                className="cursor-pointer opacity-70 hover:opacity-100"
                onClick={() => setAttachedFiles(attachedFiles.filter((x) => x.id !== f.id))}
              />
            </div>
          ))}
        </div>
      )}
      
      {showEmojiPicker && (
        <div className="absolute bottom-20 z-50">
          <React.Suspense fallback={<div className="p-4 bg-popover rounded-xl border border-border">Loading emojis...</div>}>
            <EmojiPicker
              theme="dark"
              onEmojiClick={(e) => setMessageInput((p) => p + e.emoji)}
            />
          </React.Suspense>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setShowMediaUploader(!showMediaUploader)}
            className="icon-btn-hover h-9 w-9 text-muted-foreground">
            <Paperclip size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="icon-btn-hover h-9 w-9 text-muted-foreground">
            <Smile size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={sendLocation}
            className="icon-btn-hover h-9 w-9 text-muted-foreground">
            <MapPin size={18} />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={`h-9 w-9 icon-btn-hover ${
              isRecording ? "recording-btn text-red-400" : "text-muted-foreground"
            }`}
          >
            {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
          </Button>
        </div>
        <Input
          value={messageInput}
          onChange={(e) => {
            setMessageInput(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={isRecording ? "Recording…" : t("type_message")}
          className="flex-1 rounded-full text-foreground text-sm h-10 bg-muted border border-border"
          disabled={isRecording}
        />
        <button
          onClick={sendMessage}
          disabled={isRecording}
          className="glow-btn flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow:'0 4px 16px rgba(124,58,237,0.4)'}}
        >
          <Send size={16} className="text-white ml-0.5" />
        </button>
      </div>
    </div>
  );
}
