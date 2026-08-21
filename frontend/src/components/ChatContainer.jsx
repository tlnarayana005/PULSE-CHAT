import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, formatMessageDate } from "../lib/utils";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
    reactToMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [activeReactionPicker, setActiveReactionPicker] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveReactionPicker(null);
    if (activeReactionPicker) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeReactionPicker]);

  const handleReaction = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
    setActiveReactionPicker(null);
  };

  const isSelectedUserTyping = typingUsers[selectedUser?._id];

  // Helper to check if we need a date separator
  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    return currDate !== prevDate;
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={message._id}>
            {/* Date Separator */}
            {shouldShowDateSeparator(message, messages[index - 1]) && (
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 border-t border-base-300"></div>
                <span className="text-xs text-zinc-500 font-medium px-2">
                  {formatMessageDate(message.createdAt)}
                </span>
                <div className="flex-1 border-t border-base-300"></div>
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`chat ${
                message.senderId === authUser._id ? "chat-end" : "chat-start"
              }`}
              ref={index === messages.length - 1 ? messageEndRef : null}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      message.senderId === authUser._id
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/avatar.png";
                    }}
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col relative group">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.text && <p>{message.text}</p>}

                {/* Reaction button - appears on hover */}
                <button
                  className="absolute -bottom-3 right-0 opacity-0 group-hover:opacity-100 
                    transition-opacity text-xs bg-base-200 rounded-full px-1.5 py-0.5 
                    hover:bg-base-300 cursor-pointer border border-base-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReactionPicker(
                      activeReactionPicker === message._id
                        ? null
                        : message._id
                    );
                  }}
                >
                  😊
                </button>

                {/* Reaction Picker */}
                {activeReactionPicker === message._id && (
                  <div
                    className="absolute -bottom-10 right-0 flex gap-1 bg-base-200 
                      rounded-full px-2 py-1 shadow-lg border border-base-300 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        className="hover:scale-125 transition-transform text-sm cursor-pointer"
                        onClick={() => handleReaction(message._id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Display existing reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {/* Group reactions by emoji */}
                  {Object.entries(
                    message.reactions.reduce((acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="text-xs bg-base-200 rounded-full px-1.5 py-0.5 border border-base-300"
                    >
                      {emoji} {count > 1 ? count : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isSelectedUserTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/avatar.png";
                  }}
                />
              </div>
            </div>
            <div className="chat-bubble bg-base-300 text-base-content min-h-0 py-2">
              <div className="flex gap-1 items-center">
                <span
                  className="size-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="size-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="size-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
