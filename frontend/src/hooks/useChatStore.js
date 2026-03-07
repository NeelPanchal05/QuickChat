import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  onlineUsers: new Set(),
  callData: null,
  showCall: false,
  typing: null,
  isLoadingMessages: false,
  hasMoreMessages: true,
  replyingTo: null,

  setConversations: (conversations) => set({ conversations }),
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setMessages: (messagesUpdater) => set((state) => ({
    messages: typeof messagesUpdater === 'function' ? messagesUpdater(state.messages) : messagesUpdater
  })),
  setOnlineUsers: (usersUpdater) => set((state) => ({
    onlineUsers: typeof usersUpdater === 'function' ? usersUpdater(state.onlineUsers) : usersUpdater
  })),
  setCallData: (callData) => set({ callData }),
  setShowCall: (showCall) => set({ showCall }),
  setTyping: (typing) => set({ typing }),
  setIsLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),
  setHasMoreMessages: (hasMoreMessages) => set({ hasMoreMessages }),

  uploadProgress: {},
  setUploadProgress: (id, progress) => set((state) => ({
    uploadProgress: { ...state.uploadProgress, [id]: progress }
  })),
  clearUploadProgress: (id) => set((state) => {
    const newProgress = { ...state.uploadProgress };
    delete newProgress[id];
    return { uploadProgress: newProgress };
  }),

  downloadProgress: {},
  setDownloadProgress: (id, progress) => set((state) => ({
    downloadProgress: { ...state.downloadProgress, [id]: progress }
  })),
  clearDownloadProgress: (id) => set((state) => {
    const newProgress = { ...state.downloadProgress };
    delete newProgress[id];
    return { downloadProgress: newProgress };
  }),

  // Optimistic updates need access to current state
  addOptimisticMessage: (content, type, fileName = null, replyToId = null, user, selectedConv) => {
    if (!user || !selectedConv) return null;
    
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg = {
      message_id: tempId,
      conversation_id: selectedConv.conversation_id,
      sender_id: user.user_id,
      content: content,
      message_type: type,
      file_name: fileName,
      timestamp: new Date().toISOString(),
      read_by: [user.user_id],
      reply_to: replyToId,
      reactions: [],
    };

    set((state) => {
      const updatedConversations = state.conversations.map((c) => {
        if (c.conversation_id === selectedConv.conversation_id) {
          return {
            ...c,
            last_message: optimisticMsg,
            updated_at: optimisticMsg.timestamp,
          };
        }
        return c;
      }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      return {
        messages: [...state.messages, optimisticMsg],
        conversations: updatedConversations,
      };
    });

    return tempId;
  }
}));
