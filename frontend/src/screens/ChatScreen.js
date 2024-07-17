import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { handleUserInput } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../components/ChatContext';

const ChatScreen = () => {
  const [message, setMessage] = useState('');
  const { messages, setMessages } = useChat();
  const navigation = useNavigation();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (messages.length > 0) {
      setShowIntro(false);
    }
  }, [messages]);

  const suggestedPrompts = [
    "Create a list of clients who have not shown up in more than 6 months",
    "How many appointments have I done in June?",
    "How many active clients do I have",
    "Create a list of my muslim clients"
  ];

  const handleSend = async (text = message) => {
    if (text.trim() === '') return;

    setShowIntro(false);
    const newMessages = [...messages, { text: text, sender: 'user' }];
    setMessages(newMessages);
    setMessage('');

    try {
      const response = await handleUserInput(text);
      const responseMessage = typeof response === 'string' ? response : response.message;
      setMessages([...newMessages, { text: responseMessage, sender: 'bot' }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([...newMessages, { text: 'Sorry, there was an error processing your request.', sender: 'bot' }]);
    }
  };

  const handleLinkPress = (id) => {
    console.log('Navigating with id:', id);
    navigation.navigate('QueryResults', { id });
  };

  const handlePromptClick = (prompt) => {
    setMessage(prompt);
    handleSend(prompt);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
      {item.sender === 'bot' && item.text.includes('Custom list') ? (
        <Text style={styles.messageText}>
          {item.text.split('here:')[0]}
          <Text
            style={styles.link}
            onPress={() => {
              const id = item.text.split('here:')[1].trim();
              handleLinkPress(id);
            }}
          >
            here
          </Text>
          .
        </Text>
      ) : (
        <Text style={styles.messageText}>{item.text}</Text>
      )}
    </View>
  );

  const renderIntro = () => (
    <View style={styles.introContainer}>
      <Text style={styles.introText}>
        Welcome to our AI chatbot! I'm here to assist you with various tasks and answer your questions.
      </Text>
      <Text style={styles.promptsTitle}>Try asking:</Text>
      {suggestedPrompts.map((prompt, index) => (
        <TouchableOpacity
          key={index}
          style={styles.promptButton}
          onPress={() => handlePromptClick(prompt)}
        >
          <Text style={styles.promptButtonText}>{prompt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -200}
    >
      <View style={styles.chatListContainer}>
        {showIntro && messages.length === 0 && renderIntro()}
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.chatContainer}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message"
          placeholderTextColor="#888"
        />
        <TouchableOpacity onPress={() => handleSend()} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    paddingTop: 50, // Add paddingTop
  },
  chatListContainer: {
    flex: 1,
  },
  chatContainer: {
    padding: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#333',
  },
  messageText: {
    color: '#fff',
  },
  link: {
    color: '#4a90e2',
    textDecorationLine: 'underline',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1c1c1e',
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 20,
    color: '#fff',
  },
  sendButton: {
    marginLeft: 10,
  },
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  introText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  promptsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  promptButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    width: '100%',
  },
  promptButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default ChatScreen;