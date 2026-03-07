import React, { useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Phone, Video, Calendar, Shield, MoreVertical, Eraser, MessageCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
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

export default function ChatWindow({
  startCall,
  dateSearch,
  setDateSearch,
  setShowPrivacy,
  clearChat,
  memoizedMessages,
  isCurrentChatBlocked,
}) {
  const { t } = useLanguage();
  const { currentThemeData } = useTheme();
  
  const {
    selectedConversation,
    setSelectedConversation,
    onlineUsers,
    typing,
    messagesEndRef,
    fetchMessages,
    hasMoreMessages,
    messages,
    isLoadingMessages
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
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        
        {/* Intersection Observer Target for Infinite Scroll */}
        {hasMoreMessages && (
          <div ref={topElementRef} className="h-4 w-full flex justify-center items-center py-4">
            {isLoadingMessages && <div className="typing-dot w-2 h-2 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />}
          </div>
        )}
        
        {memoizedMessages}
        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start animate-fade-up">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Bar */}
      <MessageInput
        isCurrentChatBlocked={isCurrentChatBlocked}
      />
    </div>
  );
}
