import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMessagesByClientId, sendMessage, setMessagesRead, getClientById, getClientAutoRespond, updateClientAutoRespond } from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { useIsFocused } from '@react-navigation/native';

const ClientMessagesScreen = () => {
  const route = useRoute();
  const { clientid, clientName, suggestedResponse, clientMessage } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [autoRespond, setAutoRespond] = useState(true);
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isFocused = useIsFocused();
  const [polling, setPolling] = useState(null);
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fetchMessages(clientid);
      fetchClientDetails(clientid);
      scrollToBottom();
      setMessagesAsRead();
      
      // Start polling when the screen is focused
      const pollInterval = setInterval(() => {
        fetchMessages(clientid);
      }, 5000); // Poll every 5 seconds
      setPolling(pollInterval);

      // Handle suggested response or new client message
      if (suggestedResponse) {
        setNewMessage(suggestedResponse);
        setIsConfirmationModalVisible(true);
      } else if (clientMessage) {
        // Optionally, you can highlight the new message or scroll to it
        // For now, we'll just log it
        console.log('New client message:', clientMessage);
      }
    } else {
      // Stop polling when the screen is not focused
      if (polling) {
        clearInterval(polling);
        setPolling(null);
      }
    }

    return () => {
      if (polling) {
        clearInterval(polling);
      }
    };
  }, [clientid, isFocused, suggestedResponse, clientMessage]);

  const fetchClientDetails = async (clientId) => {
    try {
      const autoRespondStatus = await getClientAutoRespond(clientId);
      setAutoRespond(autoRespondStatus);
    } catch (error) {
      console.error('Error fetching client auto-respond status:', error);
    }
  };

  const fetchMessages = async (clientid) => {
    try {
      const data = await getMessagesByClientId(clientid);
      const sortedMessages = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMessages(prevMessages => {
        // Only update if there are new messages
        if (JSON.stringify(prevMessages) !== JSON.stringify(sortedMessages)) {
          return sortedMessages;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const setMessagesAsRead = async () => {
    try {
      await setMessagesRead(clientid);
    } catch (error) {
      console.error('Error setting messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    try {
      const lastMessage = messages[messages.length - 1];
      const recipient = lastMessage.fromtext === '+18446480598' ? lastMessage.totext : lastMessage.fromtext;
      await sendMessage(recipient, newMessage, false, true);
      setNewMessage('');
      fetchMessages(clientid);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAutoRespondToggle = async (value) => {
    try {
      await updateClientAutoRespond(clientid, value);
      setAutoRespond(value);
    } catch (error) {
      console.error('Error updating auto-respond:', error);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    setShowScrollButton(offsetY < contentHeight - scrollViewHeight - 100);
  };

  const formatTimestamp = (dateString) => {
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [time, period] = timePart.split(' ');
    const [hours, minutes] = time.split(':');

    let adjustedHours = parseInt(hours, 10) - 4;
    let adjustedPeriod = period;

    if (adjustedHours < 0) {
      adjustedHours += 12;
      adjustedPeriod = period === 'AM' ? 'PM' : 'AM';
    } else if (adjustedHours === 0) {
      adjustedHours = 12;
    } else if (adjustedHours > 12) {
      adjustedHours -= 12;
      adjustedPeriod = 'PM';
    }

    return `${adjustedHours}:${minutes} ${adjustedPeriod}`;
  };

  const formatDate = (dateString) => {
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach(message => {
      const date = message.date.split(', ')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return Object.entries(grouped).map(([date, messages]) => ({ date, messages }));
  };

  const renderDateSeparator = (date) => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{formatDate(date)}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  const renderMessage = useCallback((message) => {
    const isAssistant = message.fromtext === '+18446480598';
    const avatar = isAssistant ? twilioAvatar : defaultAvatar;
    const senderName = isAssistant ? 'Assistant' : clientName || 'Client';
    const isAI = message.is_ai;
    const messageKey = message.id || `${message.date}-${message.fromtext}-${Math.random()}`;

    return (
      <View 
        key={messageKey}
        style={[styles.messageContainer, isAssistant ? styles.assistantMessage : styles.clientMessage]}
      >
        {!isAssistant && <Image source={avatar} style={styles.avatar} />}
        <View style={styles.messageContent}>
          <Text style={styles.messageSender}>{senderName}</Text>
          <View style={[styles.messageBubble, isAssistant ? styles.assistantBubble : styles.clientBubble]}>
            <Text style={[styles.messageText, isAssistant ? styles.assistantText : styles.clientText]}>
              {message.body}
            </Text>
            <View style={styles.timestampContainer}>
              <Text style={styles.timestamp}>
                {formatTimestamp(message.date)}
              </Text>
              {isAssistant && (
                <Text style={styles.aiIndicator}>
                  {isAI ? 'AI' : 'Manual'}
                </Text>
              )}
            </View>
          </View>
        </View>
        {isAssistant && <Image source={avatar} style={styles.avatar} />}
      </View>
    );
  }, [clientid, clientName]);

  const renderItem = useCallback(({ item }) => (
    <View key={item.date}>
      {renderDateSeparator(item.date)}
      {item.messages.map(message => renderMessage(message))}
    </View>
  ), [renderMessage]);

  const handleConfirmSuggestedResponse = () => {
    handleSendMessage();
    setIsConfirmationModalVisible(false);
  };

  const handleRejectSuggestedResponse = () => {
    setNewMessage('');
    setIsConfirmationModalVisible(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -200}
    >
      <FlatList
        ref={flatListRef}
        data={groupMessagesByDate(messages)}
        renderItem={renderItem}
        keyExtractor={useCallback((item) => item.date, [])}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.messageList}
      />
      {showScrollButton && (
        <TouchableOpacity style={styles.scrollButton} onPress={scrollToBottom}>
          <Text style={styles.scrollButtonText}>↓</Text>
        </TouchableOpacity>
      )}
      <View style={styles.autoRespondContainer}>
        <Text style={styles.autoRespondText}>Auto-respond</Text>
        <Switch
          value={autoRespond}
          onValueChange={handleAutoRespondToggle}
          trackColor={{ false: "#292e38", true: "#195de6" }}
          thumbColor={autoRespond ? "#ffffff" : "#9da6b8"}
        />
      </View>
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

      {isConfirmationModalVisible && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Suggested Response</Text>
            <Text style={styles.modalMessage}>{newMessage}</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleRejectSuggestedResponse}>
                <Text style={styles.modalButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleConfirmSuggestedResponse}>
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
  },
  messageList: {
    flex: 1,
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
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#9da6b8',
  },
  aiIndicator: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  autoRespondContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111318',
    borderTopWidth: 1,
    borderTopColor: '#292e38',
  },
  autoRespondText: {
    color: '#9da6b8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111318',
    borderTopWidth: 1,
    borderTopColor: '#292e38',
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
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#9da6b8',
  },
  dateText: {
    color: '#9da6b8',
    fontSize: 12,
    marginHorizontal: 10,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#292e38',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: '#195de6',
    borderRadius: 8,
    padding: 10,
    width: '45%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default React.memo(ClientMessagesScreen);