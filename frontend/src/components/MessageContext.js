import React, { createContext, useState, useContext } from 'react';

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const [draftMessages, setDraftMessages] = useState({});

  const setDraftMessage = (clientId, message) => {
    setDraftMessages(prev => ({
      ...prev,
      [clientId]: message
    }));
  };

  const getDraftMessage = (clientId) => {
    return draftMessages[clientId] || '';
  };

  return (
    <MessageContext.Provider value={{ setDraftMessage, getDraftMessage }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => useContext(MessageContext);