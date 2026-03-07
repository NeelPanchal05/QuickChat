import React, { useMemo } from "react";
import { Search, MessageCircle, UserPlus, Pin, MoreVertical, UserX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SettingsMenu from "@/components/SettingsMenu";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ChatSidebar({
  conversations,
  selectedConversation,
  setSelectedConversation,
  onlineUsers,
  setShowInvite,
  setShowProfile,
  logout,
  setShowTerms,
  setShowBackgroundSelector,
  setShowPrivacy,
  searchQuery,
  setSearchQuery,
  searchUsers,
  searchResults,
  createOrOpenConversation,
  blockUser,
  deleteConversation,
}) {
  const { t } = useLanguage();

  const isUserOnline = (userId) => onlineUsers.has(userId);

  const memoizedConversations = useMemo(() => {
    return conversations.map((c) => (
      <div
        key={c.conversation_id}
        onClick={() => setSelectedConversation(c)}
        className={`conv-row group p-4 border-b border-border cursor-pointer relative text-foreground ${
          selectedConversation?.conversation_id === c.conversation_id
            ? "active"
            : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-11 w-11 ring-2" style={{ringColor: selectedConversation?.conversation_id === c.conversation_id ? 'rgba(139,92,246,0.5)' : 'transparent'}}>
              <AvatarImage src={c.other_user?.profile_photo} />
              <AvatarFallback style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontFamily:"'Space Grotesk',sans-serif",fontWeight:700}}>{c.other_user?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            {isUserOnline(c.other_user?.user_id) && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 online-badge" style={{background:'#22c55e', borderColor:'rgba(10,10,20,1)'}} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm text-foreground truncate">
                {c.other_user?.real_name}
              </span>
              {c.is_pinned && <Pin size={11} className="text-violet-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {c.last_message?.content
                ? c.last_message.content.length > 32
                  ? c.last_message.content.substring(0, 32) + "…"
                  : c.last_message.content
                : t("start_chatting")}
            </p>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreVertical size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40" style={{background:'rgba(14,14,26,0.97)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <DropdownMenuItem
                  onClick={(e) => blockUser(e, c.other_user?.user_id)}
                  className="text-destructive focus:text-destructive cursor-pointer text-xs"
                >
                  <UserX size={13} className="mr-2" /> Block User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => deleteConversation(e, c.conversation_id)}
                  className="text-destructive focus:text-destructive cursor-pointer text-xs"
                >
                  <Trash2 size={13} className="mr-2" /> Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedConversation, onlineUsers, t]);

  return (
    <div
      className={`${
        selectedConversation ? "hidden md:flex" : "flex"
      } w-full md:w-80 flex-col h-full relative z-10 bg-card border-r border-border`}
      style={{ backdropFilter: 'blur(24px)' }}
    >
      {/* Sidebar top gradient orb */}
      <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none" style={{background: 'radial-gradient(ellipse at 50% -20%, rgba(109,40,217,0.15) 0%, transparent 70%)'}} />
      <div className="p-4 border-b border-border relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #7c3aed, #4f46e5)'}}>
              <MessageCircle className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold gradient-text hidden sm:block">QuickChat</h1>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowInvite(true)}
              className="icon-btn-hover text-muted-foreground h-8 w-8"
            >
              <UserPlus size={18} />
            </Button>
            <SettingsMenu
              onProfile={() => setShowProfile(true)}
              onLogout={logout}
              onTerms={() => setShowTerms(true)}
              onBackgrounds={() => setShowBackgroundSelector(true)}
              onPrivacy={() => setShowPrivacy(true)}
            />
          </div>
        </div>
        <div className="relative z-20">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <Input
            placeholder={t("search_placeholder")}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }}
            className="pl-9 pr-4 rounded-full h-9 text-foreground text-sm bg-muted border border-border"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-xl overflow-hidden bg-popover border border-border" style={{ maxHeight: '12rem', overflowY: 'auto' }}>
            {searchResults.map((u) => (
              <div
                key={u.user_id}
                onClick={() => createOrOpenConversation(u.user_id)}
                className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3 transition-colors"
              >
                <Avatar className="h-8 w-8 ring-1" style={{ringColor:'rgba(139,92,246,0.3)'}}>
                  <AvatarImage src={u.profile_photo} />
                  <AvatarFallback style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontSize:'12px'}}>{u.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{u.real_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {memoizedConversations}
      </div>
    </div>
  );
}
