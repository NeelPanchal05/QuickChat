import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useSound } from './SoundContext';
import { useChatStore } from '@/hooks/useChatStore';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, socket, API, token } = useAuth();
  const { playNotificationSound } = useSound();

  // Extract from Zustand store
  const conversations = useChatStore(state => state.conversations);
  const setConversations = useChatStore(state => state.setConversations);
  const selectedConversation = useChatStore(state => state.selectedConversation);
  const setSelectedConversation = useChatStore(state => state.setSelectedConversation);
  const messages = useChatStore(state => state.messages);
  const setMessages = useChatStore(state => state.setMessages);
  const onlineUsers = useChatStore(state => state.onlineUsers);
  const setOnlineUsers = useChatStore(state => state.setOnlineUsers);
  const callData = useChatStore(state => state.callData);
  const setCallData = useChatStore(state => state.setCallData);
  const showCall = useChatStore(state => state.showCall);
  const setShowCall = useChatStore(state => state.setShowCall);
  const typing = useChatStore(state => state.typing);
  const setTyping = useChatStore(state => state.setTyping);
  const isLoadingMessages = useChatStore(state => state.isLoadingMessages);
  const setIsLoadingMessages = useChatStore(state => state.setIsLoadingMessages);
  const hasMoreMessages = useChatStore(state => state.hasMoreMessages);
  const setHasMoreMessages = useChatStore(state => state.setHasMoreMessages);
  const replyingTo = useChatStore(state => state.replyingTo);
  const setReplyingTo = useChatStore(state => state.setReplyingTo);
  const storeAddOptimisticMessage = useChatStore(state => state.addOptimisticMessage);

  const fetchConversations = useCallback(async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error("Failed to fetch conversations");
    }
  }, [API, token, setConversations]);

  const fetchMessages = useCallback(
    async (convId, filters = {}, append = false) => {
      if (!token) return;
      try {
        setIsLoadingMessages(true);
        const queryParams = new URLSearchParams();
        if (filters.start) queryParams.append("start_date", filters.start);
        if (filters.end) queryParams.append("end_date", filters.end);
        if (filters.before) queryParams.append("before", filters.before);

        const res = await fetch(
          `${API}/conversations/${convId}/messages?${queryParams}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setHasMoreMessages(data.length === 50); // Assuming 50 is backend limit
          
          if (append) {
            setMessages((prev) => [...data, ...prev]);
          } else {
            setMessages(data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch messages");
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [API, token, setIsLoadingMessages, setHasMoreMessages, setMessages]
  );

  const addOptimisticMessage = useCallback((content, type, fileName = null, replyToId = null) => {
    return storeAddOptimisticMessage(content, type, fileName, replyToId, user, selectedConversation);
  }, [storeAddOptimisticMessage, user, selectedConversation]);

  // Initialize socket listeners
  useChatSocket({
    socket,
    user,
    selectedConversation,
    setMessages,
    setTyping,
    setCallData,
    setShowCall,
    setOnlineUsers,
    fetchConversations,
    fetchMessages,
    playNotificationSound,
  });

  // Fetch conversations on mount / when token changes
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when a conversation is selected 
  useEffect(() => {
    if (selectedConversation) {
      setMessages([]);
      setHasMoreMessages(true);
      fetchMessages(selectedConversation.conversation_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.conversation_id]);

  const value = {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    setMessages,
    onlineUsers,
    callData,
    setCallData,
    showCall,
    setShowCall,
    typing,
    isLoadingMessages,
    hasMoreMessages,
    replyingTo,
    setReplyingTo,
    fetchConversations,
    fetchMessages,
    addOptimisticMessage
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
