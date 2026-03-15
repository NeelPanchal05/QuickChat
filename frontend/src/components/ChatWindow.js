import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Phone, Video, Calendar, Shield, MoreVertical, Eraser, MessageCircle, X, Download, MapPin, Paperclip, Reply, Smile } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { decryptMessage } from "@/utils/encryption";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MessageInput from "@/components/MessageInput";
import { Virtuoso } from "react-virtuoso";

const formatMessageDate = (timestamp, t) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

  if (isToday) return typeof t === 'function' ? (t("today") || "Today") : "Today";
  if (isYesterday) return typeof t === 'function' ? (t("yesterday") || "Yesterday") : "Yesterday";
  
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// --- Render Optimization: Memoized Row ---
// We pull this out of the Virtuoso render function and memoize it.
// This prevents Virtuoso from re-running the extremely expensive O(n) decryptMessage
// and messages.find() on EVERY scrolling frame!
const MemoizedMessageRow = React.memo(({ 
  m, index, messages, user, selectedConversation, t, downloadFile, 
  uploadProgress, downloadProgress, socket, setReplyingTo
}) => {
  const isOwn = user && m.sender_id === user.user_id;

  if (m.message_type === "poll") return null;

  const myPrivateKey = user ? localStorage.getItem(`e2ee_private_key_${user.email}`) : null;
  const theirPublicKey = selectedConversation?.other_user?.public_key;

  const decryptedContent = decryptMessage(m.content, myPrivateKey, theirPublicKey);

  const repliedMessage = m.reply_to ? messages.find(msg => msg.message_id === m.reply_to) : null;
  const decryptedRepliedContent = repliedMessage ? decryptMessage(repliedMessage.content, myPrivateKey, theirPublicKey) : null;

  const currentDate = formatMessageDate(m.timestamp, t);
  const prevDate = index > 0 ? formatMessageDate(messages[index - 1].timestamp, t) : null;
  const showDateSeparator = currentDate !== prevDate;

  // Vanish Mode countdown calculated dynamically (React component rerenders will catch this, or we could use an interval, but for now a static compute on render works mostly if interacting)
  const isVanishing = m.expires_in > 0;
  let remainingSeconds = isVanishing ? m.expires_in : null;
  if (isVanishing && m.expires_at) {
      remainingSeconds = Math.max(0, Math.floor((new Date(m.expires_at).getTime() - Date.now()) / 1000));
  }

  return (
    <div className="py-1">
      {showDateSeparator && (
        <div className="flex w-full justify-center my-5 mb-6 relative z-10 pointer-events-none">
          <span className="bg-black/50 backdrop-blur-md border border-white/10 text-white/90 text-[11px] py-1 px-4 rounded-full shadow-sm font-medium tracking-wide">
            {currentDate}
          </span>
        </div>
      )}
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-message-in group`}>
        <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
          
          {repliedMessage && (
            <div className={`text-xs opacity-75 mb-1 px-3 py-1.5 rounded-lg truncate border-l-2 max-w-full cursor-pointer hover:opacity-100 transition-opacity ${isOwn ? 'border-primary/50 bg-primary/10' : 'border-muted-foreground/50 bg-muted/50'}`}>
              <span className="font-semibold block mb-0.5">{repliedMessage.sender_id === user?.user_id ? "You" : "Them"}:</span>
              {repliedMessage.message_type === 'text' ? decryptedRepliedContent : `[${repliedMessage.message_type}]`}
            </div>
          )}

          <div className={`relative flex items-center gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} w-full`}>
            <div className={`px-4 py-2.5 rounded-2xl relative z-10 w-fit ${isOwn ? "bubble-own text-white rounded-tr-sm" : "bubble-other text-foreground rounded-tl-sm"}`}>
          {m.is_deleted ? (
             <div className="relative group overflow-hidden rounded-xl min-h-[40px] px-4 py-2 bg-black/5 dark:bg-white/5 border border-dashed border-foreground/20 text-muted-foreground italic text-sm">
                🚫 {t("message_deleted") || "This message was deleted"}
             </div>
          ) : (
            <>
          {m.message_type === "text" && (
            <p className="text-sm leading-relaxed break-words">{decryptedContent}</p>
          )}
          {m.message_type === "location" && (
            <a
              href={decryptedContent}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center p-4 rounded-xl text-inherit no-underline transition-all"
              style={{
                background: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)',
                border: isOwn ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" 
                style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.15)' }}
              >
                <MapPin size={24} className={isOwn ? 'text-white' : 'text-primary'} />
              </div>
              <span className="text-sm font-semibold mb-0.5">{t("view_location")}</span>
              <span className="text-xs opacity-70 underline underline-offset-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
                {decryptedContent}
              </span>
            </a>
          )}
          {m.message_type?.startsWith("image") && (
            <div className={`relative group overflow-hidden rounded-xl min-h-[60px] min-w-[100px] bg-black/10 ${isVanishing && !isOwn ? 'blur-md hover:blur-none transition-all duration-300' : ''}`}>
              <img src={decryptedContent} alt="attachment" className="w-full max-h-60 object-cover" />
              <button
                onClick={() => downloadFile(decryptedContent, m.file_name || "image", m.message_id)}
                className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Download Image"
              >
                <Download size={14} />
              </button>
              {(uploadProgress[m.message_id] !== undefined || downloadProgress[m.message_id] !== undefined) && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm z-20 transition-all duration-300">
                  <div className="w-12 h-12 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" />
                      <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" 
                        strokeDasharray="125.6" 
                        strokeDashoffset={125.6 - (125.6 * (uploadProgress[m.message_id] ?? downloadProgress[m.message_id])) / 100} 
                        className="transition-all duration-150 ease-out" />
                    </svg>
                    <span className="absolute text-white text-[10px] font-bold">{uploadProgress[m.message_id] ?? downloadProgress[m.message_id]}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {m.message_type && ["audio", "video"].includes(m.message_type.split("/")[0]) && (
            <div className="relative group overflow-hidden rounded-xl min-h-[60px] min-w-[200px] bg-black/10">
              <video controls src={decryptedContent} className="max-w-full rounded-xl relative z-10" />
              {(uploadProgress[m.message_id] !== undefined || downloadProgress[m.message_id] !== undefined) && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm z-20 transition-all duration-300 rounded-xl">
                  <div className="w-12 h-12 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" />
                      <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" 
                        strokeDasharray="125.6" 
                        strokeDashoffset={125.6 - (125.6 * (uploadProgress[m.message_id] ?? downloadProgress[m.message_id])) / 100} 
                        className="transition-all duration-150 ease-out" />
                    </svg>
                    <span className="absolute text-white text-[10px] font-bold">{uploadProgress[m.message_id] ?? downloadProgress[m.message_id]}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {m.message_type &&
            !["text", "location", "poll"].includes(m.message_type) &&
            !["image", "audio", "video"].includes(m.message_type.split("/")[0]) && (
            <button
              onClick={() => downloadFile(decryptedContent, m.file_name, m.message_id)}
              className="group relative flex items-center gap-3 p-3 rounded-xl transition-all text-left max-w-[260px] md:max-w-sm overflow-hidden"
              style={{
                background: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)',
                border: isOwn ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.08)'
              }}
              title="Download Document"
            >
              {(uploadProgress[m.message_id] !== undefined || downloadProgress[m.message_id] !== undefined) && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all duration-300" 
                  style={{width: `${uploadProgress[m.message_id] ?? downloadProgress[m.message_id]}%`}}
                />
              )}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center relative z-10"
                style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.15)' }}
              >
                <Paperclip size={20} className={isOwn ? 'text-white' : 'text-primary'} />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-sm font-medium truncate mb-0.5">{m.file_name || "Document.pdf"}</p>
                <p className="text-[10px] opacity-70 uppercase tracking-wider truncate">
                  {uploadProgress[m.message_id] !== undefined 
                    ? `Uploading... ${uploadProgress[m.message_id]}%` 
                    : downloadProgress[m.message_id] !== undefined
                      ? `Downloading... ${downloadProgress[m.message_id]}%`
                      : m.message_type.split("/").pop()}
                </p>
              </div>
              {(uploadProgress[m.message_id] === undefined && downloadProgress[m.message_id] === undefined) && (
                <Download size={16} className="opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1 relative z-10" />
              )}
            </button>
          )}
          <div className="flex justify-end items-center mt-1 gap-1.5 flex-wrap">
            {isVanishing && (
              <span className="text-[10px] flex items-center gap-0.5" style={{opacity: 0.9, color: m.expires_at ? '#ef4444' : 'inherit'}}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
                 {m.expires_at ? `${remainingSeconds}s` : `${m.expires_in}s`}
              </span>
            )}
            {m.is_edited && (
              <span className="text-[9px] italic opacity-60 mr-1">(edited)</span>
            )}
            <span className="text-[10px]" style={{opacity: 0.55}}>
              {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isOwn && (
              <div className="text-[10px] opacity-70">
                {m.read_by?.length > 1 ? "Read" : "Sent"}
              </div>
            )}
          </div>
          </>
          )}

          {m.reactions && m.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1.5 -mb-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(m.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                <button key={emoji} onClick={() => {
                  const userReacted = m.reactions.find(r => r.emoji === emoji && r.user_id === user.user_id);
                  if (userReacted) {
                    socket.emit("remove_reaction", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id, emoji });
                  } else {
                    socket.emit("add_reaction", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id, emoji });
                  }
                }} className="text-[11px] px-1.5 py-0.5 rounded-full bg-black/10 hover:bg-black/20 dark:bg-black/20 dark:hover:bg-black/40 transition-colors flex items-center gap-1 border border-foreground/5 text-inherit">
                  <span>{emoji}</span><span>{count}</span>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Hover Actions */}
        {!m.is_deleted && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80">
                <Smile size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-2 flex gap-1 rounded-full border border-border bg-popover shadow-xl z-50">
              {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                <button key={emoji} onClick={() => {
                  socket.emit("react_to_message", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id, emoji });
                }} className="text-xl hover:scale-125 transition-transform p-1">
                  {emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80" onClick={() => setReplyingTo(m)}>
             <Reply size={14} />
          </Button>

          {isOwn && ((Date.now() - new Date(m.timestamp).getTime()) / 1000) < 900 && m.message_type === "text" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80">
                   <MoreVertical size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 z-50 border border-border bg-popover text-foreground rounded-lg shadow-xl">
                 <DropdownMenuItem onClick={() => {
                    const newText = prompt("Edit your message:", decryptedContent);
                    if (newText !== null && newText.trim() !== "" && newText !== decryptedContent) {
                        socket.emit("edit_message", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id, new_content: newText.trim() });
                    }
                 }} className="text-sm cursor-pointer">
                    Edit
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => {
                    if (window.confirm("Are you sure you want to delete this message?")) {
                        socket.emit("delete_message", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id });
                    }
                 }} className="text-sm cursor-pointer text-destructive focus:text-destructive">
                    Delete
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        )}
      </div>
    </div>
  </div>
</div>
  );
  // Important: We only re-render if fundamental props change!
}, (prevProps, nextProps) => {
  return prevProps.m === nextProps.m &&
         prevProps.user === nextProps.user &&
         prevProps.uploadProgress[prevProps.m.message_id] === nextProps.uploadProgress[nextProps.m.message_id] &&
         prevProps.downloadProgress[prevProps.m.message_id] === nextProps.downloadProgress[nextProps.m.message_id];
});

export default function ChatWindow({
  startCall,
  dateSearch,
  setDateSearch,
  setShowPrivacy,
  clearChat,
  isCurrentChatBlocked,
  downloadFile,
}) {
  const { user, socket } = useAuth();
  const { t } = useLanguage();
  const { currentThemeData } = useTheme();
  
  const {
    selectedConversation,
    setSelectedConversation,
    onlineUsers,
    typing,
    fetchMessages,
    hasMoreMessages,
    messages,
    isLoadingMessages,
    setReplyingTo,
    uploadProgress,
    downloadProgress
  } = useChat();

  const isUserOnline = (userId) => onlineUsers.has(userId);

  // --- Infinite Scroll Logic ---
  const observerRef = useRef(null);
  
  const loadMoreMessages = useCallback(() => {
    if (isLoadingMessages || !hasMoreMessages || messages.length === 0 || !selectedConversation) return;
    
    // The timestamp of the oldest loaded message acts as our cursor
    const oldestMessageTimestamp = messages[0].timestamp;
    
    fetchMessages(selectedConversation.conversation_id, { before: oldestMessageTimestamp }, true);
  }, [isLoadingMessages, hasMoreMessages, messages, selectedConversation, fetchMessages]);

  const topElementRef = useCallback((node) => {
    if (isLoadingMessages) return;
    
    // Disconnect old observer
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      // If the top element intersects, we have scrolled to the top
      if (entries[0].isIntersecting && hasMoreMessages) {
        loadMoreMessages();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [isLoadingMessages, hasMoreMessages, loadMoreMessages]);

  return (
    <div
      className={`${
        !selectedConversation ? "hidden md:flex" : "flex"
      } flex-1 flex-col h-full relative`}
      style={currentThemeData?.bgStyle || undefined}
    >
      {/* Chat Header */}
      <div className="p-3 md:p-4 flex justify-between items-center z-10 flex-shrink-0 bg-card border-b border-border"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost" size="icon"
            className="md:hidden text-foreground icon-btn-hover"
            onClick={() => setSelectedConversation(null)}
          >
            <X />
          </Button>
          <div className="relative">
            <div className="rounded-full p-[2px]" style={{background: 'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedConversation.other_user?.profile_photo} />
                <AvatarFallback style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontWeight:700,fontFamily:"'Space Grotesk',sans-serif"}}>
                  {selectedConversation.other_user?.username?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            {isUserOnline(selectedConversation.other_user?.user_id) && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 online-badge" style={{background:'#22c55e', borderColor:'hsl(var(--card))'}} />
            )}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">{selectedConversation.other_user?.real_name}</h3>
            <span className={`text-xs ${isUserOnline(selectedConversation.other_user?.user_id) ? 'text-green-500' : 'text-muted-foreground'}`}>
              {isUserOnline(selectedConversation.other_user?.user_id) ? t("online") : t("offline")}
            </span>
          </div>
        </div>
        <div className="flex gap-1 md:gap-2 items-center">
          <Button variant="ghost" size="icon" onClick={() => startCall("audio")} className="icon-btn-hover text-muted-foreground h-8 w-8">
            <Phone size={17} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => startCall("video")} className="icon-btn-hover text-muted-foreground h-8 w-8">
            <Video size={17} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="icon-btn-hover text-muted-foreground h-8 w-8"><Calendar size={17} /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 bg-popover border border-border">
              <h4 className="text-foreground font-semibold mb-3 text-sm">Search by Date</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="bg-muted text-foreground text-xs" onChange={(e) => setDateSearch({...dateSearch, start: e.target.value})} />
                  <Input type="date" className="bg-muted text-foreground text-xs" onChange={(e) => setDateSearch({...dateSearch, end: e.target.value})} />
                </div>
                <Button className="w-full text-sm" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}} onClick={() => fetchMessages(selectedConversation.conversation_id, dateSearch)}>Search</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={() => setShowPrivacy(true)} className="icon-btn-hover text-muted-foreground h-8 w-8"><Shield size={17} /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="icon-btn-hover text-muted-foreground h-8 w-8"><MoreVertical size={17} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-foreground bg-popover border border-border">
              <DropdownMenuItem onClick={clearChat} className="text-destructive cursor-pointer text-sm">
                <Eraser className="mr-2 h-4 w-4" /><span>{t("clear_chat")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 p-4 flex flex-col relative w-full h-full overflow-hidden">
        <Virtuoso
          className="custom-scrollbar"
          style={{ height: '100%', width: '100%', overflowX: 'hidden' }}
          data={messages}
          firstItemIndex={0}
          initialTopMostItemIndex={messages.length - 1}
          followOutput="smooth"
          startReached={() => {
            if (hasMoreMessages && !isLoadingMessages) {
              loadMoreMessages();
            }
          }}
          components={{
            Header: () => (
              <div className="h-4 w-full flex justify-center items-center py-4">
                {isLoadingMessages && <div className="typing-dot w-2 h-2 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />}
              </div>
            )
          }}
          itemContent={(index, m) => (
            <MemoizedMessageRow 
              m={m} 
              index={index} 
              messages={messages} 
              user={user} 
              selectedConversation={selectedConversation} 
              t={t} 
              downloadFile={downloadFile} 
              uploadProgress={uploadProgress} 
              downloadProgress={downloadProgress} 
              socket={socket} 
              setReplyingTo={setReplyingTo} 
            />
          )}
        />

        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start animate-fade-up absolute bottom-2 left-4 z-10 bg-card rounded-2xl shadow-lg">
            <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
            </div>
          </div>
        )}
      </div>
      {/* Input Bar */}
      <MessageInput
        isCurrentChatBlocked={isCurrentChatBlocked}
      />
    </div>
  );
}
