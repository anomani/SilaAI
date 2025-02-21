import React, { createContext, useState, useContext } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [activeThreadContext, setActiveThreadContext] = useState(null);

  const value = {
    messages,
    setMessages,
    activeThreadContext,
    setActiveThreadContext
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);