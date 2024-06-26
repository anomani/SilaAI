import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import { getMessagesByClientId, sendMessage } from '../services/api';
import twilioAvatar from '../../assets/uzi.png';
import defaultAvatar from '../../assets/avatar.png';

const ClientMessagesScreen = ({ route }) => {
  const { clientid } = route.params; // Retrieve clientId from route params
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState(''); // State for new message
  const navigation = useNavigation(); // Initialize navigation

  useEffect(() => {
    fetchMessages(clientid);
  }, [clientid]);

  const fetchMessages = async (clientid) => {
    try {
      const data = await getMessagesByClientId(clientid);
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return; // Prevent sending empty messages
    try {
      const lastMessage = messages[messages.length - 2];
      const fromtext = lastMessage ? lastMessage.fromtext : clientid; // Use fromtext of the last message or clientId if no messages
      console.log(fromtext)
      console.log(newMessage)
      await sendMessage(fromtext, newMessage);
      setNewMessage(''); // Clear the input field
      fetchMessages(clientid); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessages = (messages) => {
    return messages.map((message) => {
      const avatar = message.fromtext === '+18446480598' ? twilioAvatar : defaultAvatar;
      return (
        <View key={message.id} style={styles.messageContainer}>
          <Image source={avatar} style={styles.avatar} />
          <View style={styles.messageContent}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageSender}>{message.fromtext}</Text>
              <Text style={styles.messageTime}>{message.date}</Text>
            </View>
            <Text style={styles.messageText}>{message.body}</Text>
          </View>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}> 
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{ width: 50 }} /> 
      </View>
      <Text style={styles.dateHeader}>Today</Text>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View>
            {renderMessages([item])}
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor="#9da6b8"
          value={newMessage} // Bind input value to state
          onChangeText={setNewMessage} // Update state on text change
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
    paddingTop: 50, // Added padding to the top
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Ensure space between elements
    padding: 16,
    backgroundColor: '#111318',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateHeader: {
    textAlign: 'center',
    color: '#9da6b8',
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageSender: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageTime: {
    color: '#9da6b8',
    fontSize: 12,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#292e38',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#292e38',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#1c1f26',
    borderRadius: 20,
    padding: 10,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default ClientMessagesScreen;
