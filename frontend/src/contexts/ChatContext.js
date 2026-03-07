import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useSound } from './SoundContext';

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

  // Data States
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  // Call States
  const [callData, setCallData] = useState(null);
  const [showCall, setShowCall] = useState(false);
  
  // Typing State
  const [typing, setTyping] = useState(null);
  
  // Loading States
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  const messagesEndRef = useRef(null);

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
  }, [API, token]);

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
    [API, token]
  );

  const addOptimisticMessage = useCallback((content, type, fileName = null) => {
    if (!user || !selectedConversation) return null;
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg = {
      message_id: tempId,
      conversation_id: selectedConversation.conversation_id,
      sender_id: user.user_id,
      content: content,
      message_type: type,
      file_name: fileName,
      timestamp: new Date().toISOString(),
      read_by: [user.user_id],
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.conversation_id === selectedConversation.conversation_id) {
          return {
            ...c,
            last_message: optimisticMsg,
            updated_at: optimisticMsg.timestamp,
          };
        }
        return c;
      });
      return updated.sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      );
    });

    return tempId;
  }, [user, selectedConversation]);

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

  // Auto-scroll to the bottom of the messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
    messagesEndRef,
    fetchConversations,
    fetchMessages,
    addOptimisticMessage
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
