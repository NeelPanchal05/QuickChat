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
  const batchedReadsRef = useRef(new Map());
  const readTimeoutRef = useRef(null);

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
            if (!batchedReadsRef.current.has(msg.conversation_id)) {
              batchedReadsRef.current.set(msg.conversation_id, new Set());
            }
            batchedReadsRef.current.get(msg.conversation_id).add(msg.message_id);

            clearTimeout(readTimeoutRef.current);
            readTimeoutRef.current = setTimeout(() => {
              for (const [convId, msgIds] of batchedReadsRef.current.entries()) {
                socket.emit("messages_read_batch", {
                  conversation_id: convId,
                  message_ids: Array.from(msgIds)
                });
              }
              batchedReadsRef.current.clear();
            }, 1000);
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

    const handleMessageRead = (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === data.message_id
            ? { 
                ...m, 
                read_by: [...new Set([...(m.read_by || []), data.user_id])],
                ...(data.expires_at ? { expires_at: data.expires_at } : {})
              }
            : m
        )
      );
    };

    const handleMessagesReadBatch = (data) => {
      const msgIdSet = new Set(data.message_ids);
      const expiresMap = data.expires_at_map || {};
      
      setMessages((prev) =>
        prev.map((m) =>
          msgIdSet.has(m.message_id)
            ? { 
                ...m, 
                read_by: [...new Set([...(m.read_by || []), data.user_id])],
                ...(expiresMap[m.message_id] ? { expires_at: expiresMap[m.message_id] } : {})
              }
            : m
        )
      );
    };

    const handleReactionAdded = (data) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.message_id === data.message_id) {
            const currentReactions = m.reactions || [];
            // filter out if same user & emoji already exists to avoid dupes, then add
            const filtered = currentReactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji));
            return { ...m, reactions: [...filtered, { user_id: data.user_id, emoji: data.emoji }] };
          }
          return m;
        })
      );
    };

    const handleReactionRemoved = (data) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.message_id === data.message_id) {
            const currentReactions = m.reactions || [];
            const filtered = currentReactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji));
            return { ...m, reactions: filtered };
          }
          return m;
        })
      );
    };

    const handleMessageReaction = (data) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.message_id === data.message_id) {
            const currentReactions = m.reactions || [];
            if (data.action === 'added') {
              const filtered = currentReactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji));
              return { ...m, reactions: [...filtered, { user_id: data.user_id, emoji: data.emoji }] };
            } else {
              const filtered = currentReactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji));
              return { ...m, reactions: filtered };
            }
          }
          return m;
        })
      );
    };

    const handleMessageEdited = (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === data.message_id
            ? { ...m, content: data.new_content, is_edited: true }
            : m
        )
      );
    };

    const handleMessageDeleted = (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === data.message_id
            ? { ...m, content: "", is_deleted: true, file_name: null, message_type: "text" }
            : m
        )
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);
    socket.on("incoming_call", handleIncomingCall);
    socket.on("error", handleError);
    socket.on("message_read", handleMessageRead);
    socket.on("messages_read_batch", handleMessagesReadBatch);
    socket.on("reaction_added", handleReactionAdded);
    socket.on("reaction_removed", handleReactionRemoved);
    socket.on("message_reaction", handleMessageReaction);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
      socket.off("incoming_call", handleIncomingCall);
      socket.off("error", handleError);
      socket.off("message_read", handleMessageRead);
      socket.off("messages_read_batch", handleMessagesReadBatch);
      socket.off("reaction_added", handleReactionAdded);
      socket.off("reaction_removed", handleReactionRemoved);
      socket.off("message_reaction", handleMessageReaction);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
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
