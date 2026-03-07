import React, { useState } from "react";
import { Send, MapPin, Paperclip, Smile, Mic, Square, X, Image, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmojiPicker from "emoji-picker-react";
import { toast } from "sonner";
import axios from "axios";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function MessageInput({
  selectedConversation,
  user,
  socket,
  API,
  token,
  addOptimisticMessage,
  isCurrentChatBlocked,
}) {
  const { t } = useLanguage();
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

  const handleFileUpload = (e) => {
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

    files.forEach((file) => {
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
    });
    
    setShowMediaUploader(false);
  };

  const sendMessage = async () => {
    if (
      (!messageInput.trim() && attachedFiles.length === 0) ||
      !selectedConversation ||
      !user
    )
      return;

    if (messageInput.trim()) {
      const tempId = addOptimisticMessage(messageInput, "text");
      socket?.emit("send_message", {
        conversation_id: selectedConversation.conversation_id,
        content: messageInput,
        message_type: "text",
        temp_id: tempId,
      });
    }

    for (const file of attachedFiles) {
      const tempId = addOptimisticMessage(file.data, file.type, file.name);

      try {
        await axios.post(
          `${API}/conversations/${selectedConversation.conversation_id}/messages`,
          { content: file.data, message_type: file.type, file_name: file.name, temp_id: tempId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        toast.error(`Failed to send ${file.name}`);
      }
    }

    setMessageInput("");
    setAttachedFiles([]);
    setShowMediaUploader(false);
    setShowEmojiPicker(false);
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
        socket?.emit("send_message", {
          conversation_id: selectedConversation.conversation_id,
          content: locationUrl,
          message_type: "location",
          temp_id: tempId,
        });
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
    <div className="p-4 bg-card border-t border-border z-10 relative" style={{ backdropFilter: 'blur(20px)' }}>
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
          <EmojiPicker
            theme="dark"
            onEmojiClick={(e) => setMessageInput((p) => p + e.emoji)}
          />
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
            socket?.emit("typing", { conversation_id: selectedConversation.conversation_id });
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
