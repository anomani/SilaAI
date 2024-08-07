import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { handleChat } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../components/ChatContext';

const ScheduleScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const { scheduleMessages, setScheduleMessages } = useChat();
  const [localMessages, setLocalMessages] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (scheduleMessages) {
      setLocalMessages(scheduleMessages);
    }
  }, [scheduleMessages]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSend = async () => {
    if (message.trim() === '') return;

    const newMessages = [...localMessages, { text: message, sender: 'user' }];
    setLocalMessages(newMessages);
    if (setScheduleMessages) {
      setScheduleMessages(newMessages);
    }
    setMessage('');

    try {
      console.log('Sending message:', message);
      const response = await handleChat(message);
      console.log('Received response:', response);

      if (response && (typeof response === 'string' || response.message)) {
        const responseMessage = typeof response === 'string' ? response : response.message;
        const updatedMessages = [...newMessages, { text: responseMessage, sender: 'bot' }];
        setLocalMessages(updatedMessages);
        if (setScheduleMessages) {
          setScheduleMessages(updatedMessages);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      const errorMessages = [...newMessages, { text: "Sorry, an error occurred. Please try again.", sender: 'bot' }];
      setLocalMessages(errorMessages);
      if (setScheduleMessages) {
        setScheduleMessages(errorMessages);
      }
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={[
        styles.contentContainer, 
        keyboardVisible && styles.contentContainerKeyboardVisible
      ]}>
        <FlatList
          data={localMessages}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={[
            styles.chatContainer,
            { paddingBottom: keyboardHeight }
          ]}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainerKeyboardVisible: {
    justifyContent: 'flex-start',
  },
  chatContainer: {
    padding: 10,
    flexGrow: 1,
    paddingTop: 50, // Add padding to the top
    paddingBottom: 50, // Add padding to the bottom
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

export default ScheduleScreen;