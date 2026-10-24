import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Notification sound using a simple beep via AudioContext
const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.1;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Audio not supported or blocked
  }
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: {}, // { [userId]: true }

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      const currentMessages = get().messages;
      if (!currentMessages.some((m) => m._id === res.data._id)) {
        set({ messages: [...currentMessages, res.data] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to send message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, {
        emoji,
      });
      // Update message in state
      const updatedMessages = get().messages.map((m) =>
        m._id === messageId ? { ...m, reactions: res.data.reactions } : m
      );
      set({ messages: updatedMessages });
    } catch (error) {
      console.error("Error reacting to message:", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      const currentMessages = get().messages;
      if (!currentMessages.some((m) => m._id === newMessage._id)) {
        set({
          messages: [...currentMessages, newMessage],
        });
        playNotificationSound();
      }
    });

    // Subscribe to typing events
    socket.off("userTyping");
    socket.on("userTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) {
        set({ typingUsers: { ...get().typingUsers, [senderId]: true } });
      }
    });

    socket.off("userStopTyping");
    socket.on("userStopTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) {
        const updated = { ...get().typingUsers };
        delete updated[senderId];
        set({ typingUsers: updated });
      }
    });

    // Subscribe to reaction events
    socket.off("messageReaction");
    socket.on("messageReaction", ({ messageId, reactions }) => {
      const updatedMessages = get().messages.map((m) =>
        m._id === messageId ? { ...m, reactions } : m
      );
      set({ messages: updatedMessages });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("userTyping");
    socket.off("userStopTyping");
    socket.off("messageReaction");
    set({ typingUsers: {} });
  },

  emitTyping: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    socket.emit("typing", {
      senderId: authUser._id,
      receiverId: selectedUser._id,
    });
  },

  emitStopTyping: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    socket.emit("stopTyping", {
      senderId: authUser._id,
      receiverId: selectedUser._id,
    });
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, typingUsers: {} }),
}));
