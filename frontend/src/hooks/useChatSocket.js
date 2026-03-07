import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export const useChatSocket = ({
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
}) => {
  const selectedConversationRef = useRef(selectedConversation);
  const typingTimeoutRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Socket event listeners
  useEffect(() => {
    // If user is not fully loaded, do not set up listeners yet to prevent crashes
    if (!socket || !user) return;

    const handleNewMessage = (msg) => {
      const currentConv = selectedConversationRef.current;

      setMessages((prev) => {
        // If the server echoed back a temp_id, swap the optimistic placeholder
        if (msg.temp_id) {
          const idx = prev.findIndex((m) => m.message_id === msg.temp_id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...msg };
            return next;
          }
        }
        // Deduplicate by real message_id
        if (prev.some((m) => m.message_id === msg.message_id)) return prev;
        return [...prev, msg];
      });

      if (msg.sender_id !== user.user_id) {
        playNotificationSound();
        if (
          currentConv &&
          msg.conversation_id === currentConv.conversation_id
        ) {
          const allowReadReceipts = JSON.parse(
            localStorage.getItem("privacy_read_receipts") ?? "true"
          );
          if (allowReadReceipts) {
            socket.emit("message_read", {
              message_id: msg.message_id,
              conversation_id: msg.conversation_id,
            });
          }
        }
      }
      fetchConversations();
    };

    const handleUserTyping = (data) => {
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversation_id === currentConv.conversation_id) {
        setTyping(data.user_id);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(null), 3000);
      }
    };
    const handleIncomingCall = (data) => {
      setCallData({ ...data, incoming: true });
      setShowCall(true);
    };
    const handleOnline = (data) =>
      setOnlineUsers((p) => new Set([...p, data.user_id]));
    const handleOffline = (data) =>
      setOnlineUsers((p) => {
        const newSet = new Set(p);
        newSet.delete(data.user_id);
        return newSet;
      });
    const handleError = (data) => toast.error(data.message);

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);
    socket.on("incoming_call", handleIncomingCall);
    socket.on("error", handleError);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
      socket.off("incoming_call", handleIncomingCall);
      socket.off("error", handleError);
    };
  }, [socket, fetchConversations, playNotificationSound, user, setMessages, setTyping, setCallData, setShowCall, setOnlineUsers]);

  // Join conversation effect
  useEffect(() => {
    if (selectedConversation && socket) {
      fetchMessages(selectedConversation.conversation_id);
      socket.emit("join_conversation", {
        conversation_id: selectedConversation.conversation_id,
      });
    }
  }, [selectedConversation, fetchMessages, socket]);
};
