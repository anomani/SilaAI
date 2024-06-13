import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { getAllMessagesGroupedByClient } from '../services/api';
import twilioAvatar from '../../assets/uzi.png'; // Import the Twilio avatar
import defaultAvatar from '../../assets/avatar.png'; // Import the default avatar

const ChatDashboard = () => {
  const [groupedMessages, setGroupedMessages] = useState({});

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const data = await getAllMessagesGroupedByClient();
      setGroupedMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const renderMessages = (messages) => {
    return messages.map((message) => {
      const avatar = message.from === '+18446480598' ? twilioAvatar : defaultAvatar;
      return (
        <View key={message._id} style={styles.messageContainer}>
          <Image source={avatar} style={styles.avatar} />
          <View style={styles.messageContent}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageSender}>{message.from}</Text>
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
        <TouchableOpacity>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>
      <Text style={styles.dateHeader}>Today</Text>
      <FlatList
        data={Object.keys(groupedMessages)}
        renderItem={({ item }) => (
          <View>
            {renderMessages(groupedMessages[item])}
          </View>
        )}
        keyExtractor={(item) => item}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor="#9da6b8"
        />
        <TouchableOpacity style={styles.sendButton}>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default ChatDashboard;
