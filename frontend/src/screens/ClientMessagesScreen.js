import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getMessagesByClientId, sendMessage, setMessagesRead } from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import twilioAvatar from '../../assets/uzi.png';
import defaultAvatar from '../../assets/avatar.png';
import { getClientById } from '../services/api';

const ClientMessagesScreen = ({ route }) => {
  const { clientid, clientName} = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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
    if (newMessage.trim() === '') return;
    try {
      const lastMessage = messages[messages.length - 1];
      const recipient = lastMessage.fromtext === '+18446480598' ? lastMessage.totext : lastMessage.fromtext;
      await sendMessage(recipient, newMessage);
      setNewMessage('');
      setMessagesRead(clientid);
      fetchMessages(clientid);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    // Show scroll button if not at the bottom
    setShowScrollButton(offsetY < contentHeight - scrollViewHeight - 100);
  };

  const renderMessage = (message) => {
    const client = getClientById(clientid);
    const isAssistant = message.fromtext === '+18446480598';
    const avatar = isAssistant ? twilioAvatar : defaultAvatar;
    const senderName = isAssistant ? 'Assistant' : clientName || 'Client';

    return (
      <View style={[styles.messageContainer, isAssistant ? styles.assistantMessage : styles.clientMessage]}>
        {!isAssistant && <Image source={avatar} style={styles.avatar} />}
        <View style={styles.messageContent}>
          <Text style={styles.messageSender}>{senderName}</Text>
          <View style={[styles.messageBubble, isAssistant ? styles.assistantBubble : styles.clientBubble]}>
            <Text style={[styles.messageText, isAssistant ? styles.assistantText : styles.clientText]}>
              {message.body}
            </Text>
          </View>
        </View>
        {isAssistant && <Image source={avatar} style={styles.avatar} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => renderMessage(item)}
        keyExtractor={(item) => item.id.toString()}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      {showScrollButton && (
        <TouchableOpacity style={styles.scrollButton} onPress={scrollToBottom}>
          <Text style={styles.scrollButtonText}>↓</Text>
        </TouchableOpacity>
      )}
      <View style={styles.inputContainer}>
        <Image source={defaultAvatar} style={styles.inputAvatar} />
        <TextInput
          style={styles.input}
          placeholder="Write a message"
          placeholderTextColor="#9da6b8"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Icon name="send" size={20} color="#195de6" />
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
  messageContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-end',
  },
  clientMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  messageContent: {
    maxWidth: '70%',
  },
  messageSender: {
    color: '#9da6b8',
    fontSize: 13,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
  },
  assistantBubble: {
    backgroundColor: '#195de6',
  },
  clientBubble: {
    backgroundColor: '#292e38',
  },
  messageText: {
    color: 'white',
    fontSize: 16,
  },
  assistantText: {
    color: 'white',
  },
  clientText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111318',
  },
  inputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#292e38',
    color: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#292e38',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollButtonText: {
    color: 'white',
    fontSize: 24,
  },
});

export default ClientMessagesScreen;
