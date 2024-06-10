import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { handleUserInput } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const ChatScreen = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSend = async () => {
    if (message.trim() === '') return;

    // Add the user's message to the state immediately
    const newMessages = [...messages, { text: message, sender: 'user' }];
    setMessages(newMessages);
    setMessage('');

    try {
      const response = await handleUserInput(message);
      const responseMessage = typeof response === 'string' ? response : response.message;
      setMessages([...newMessages, { text: responseMessage, sender: 'bot' }]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.chatContainer}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message"
          placeholderTextColor="#888"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
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
});

export default ChatScreen;