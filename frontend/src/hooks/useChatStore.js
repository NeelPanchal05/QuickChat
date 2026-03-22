import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useChatStore = create(
  persist(
    (set, get) => ({
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

  // Offline queue for actions (like send_message)
  offlineActionQueue: [],
  addOfflineAction: (action) => set((state) => ({
    offlineActionQueue: [...state.offlineActionQueue, action]
  })),
  clearOfflineActions: () => set({ offlineActionQueue: [] }),
  removeOfflineAction: (id) => set((state) => ({
    offlineActionQueue: state.offlineActionQueue.filter(a => a.id !== id)
  })),

  setConversations: (conversationsUpdater) => set((state) => ({
    conversations: typeof conversationsUpdater === 'function' ? conversationsUpdater(state.conversations) : conversationsUpdater
  })),
  setSelectedConversation: (conversationUpdater) => set((state) => ({
    selectedConversation: typeof conversationUpdater === 'function' ? conversationUpdater(state.selectedConversation) : conversationUpdater
  })),
  setReplyingTo: (replyingToUpdater) => set((state) => ({
    replyingTo: typeof replyingToUpdater === 'function' ? replyingToUpdater(state.replyingTo) : replyingToUpdater
  })),
  setMessages: (messagesUpdater) => set((state) => ({
    messages: typeof messagesUpdater === 'function' ? messagesUpdater(state.messages) : messagesUpdater
  })),
  setOnlineUsers: (usersUpdater) => set((state) => ({
    onlineUsers: typeof usersUpdater === 'function' ? usersUpdater(state.onlineUsers) : usersUpdater
  })),
  setCallData: (callDataUpdater) => set((state) => ({
    callData: typeof callDataUpdater === 'function' ? callDataUpdater(state.callData) : callDataUpdater
  })),
  setShowCall: (showCallUpdater) => set((state) => ({
    showCall: typeof showCallUpdater === 'function' ? showCallUpdater(state.showCall) : showCallUpdater
  })),
  setTyping: (typingUpdater) => set((state) => ({
    typing: typeof typingUpdater === 'function' ? typingUpdater(state.typing) : typingUpdater
  })),
  setIsLoadingMessages: (isLoadingMessagesUpdater) => set((state) => ({
    isLoadingMessages: typeof isLoadingMessagesUpdater === 'function' ? isLoadingMessagesUpdater(state.isLoadingMessages) : isLoadingMessagesUpdater
  })),
  setHasMoreMessages: (hasMoreMessagesUpdater) => set((state) => ({
    hasMoreMessages: typeof hasMoreMessagesUpdater === 'function' ? hasMoreMessagesUpdater(state.hasMoreMessages) : hasMoreMessagesUpdater
  })),

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
  addOptimisticMessage: (content, type, fileName = null, replyToId = null, expiresIn = 0, user, selectedConv) => {
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
      is_edited: false,
      is_deleted: false,
      expires_in: expiresIn,
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
}),
{
  name: 'chat-store', // key in local storage
  // Only persist the offlineActionQueue
  partialize: (state) => ({ offlineActionQueue: state.offlineActionQueue }),
}));
