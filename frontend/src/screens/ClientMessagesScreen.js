import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Switch, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMessagesByClientId, sendMessage, setMessagesRead, getClientById, getClientAutoRespond, updateClientAutoRespond } from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { useIsFocused } from '@react-navigation/native';
import { useMessage } from '../components/MessageContext';
import { FlashList } from '@shopify/flash-list';

const ClientMessagesScreen = () => {
  const route = useRoute();
  const { clientid, clientName, suggestedResponse, clientMessage } = route.params;
  const [messages, setMessages] = useState([]);
  const { getDraftMessage, setDraftMessage } = useMessage();
  const [newMessage, setNewMessage] = useState('');
  const [autoRespond, setAutoRespond] = useState(true);
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isFocused = useIsFocused();
  const [polling, setPolling] = useState(null);
  const [inputHeight, setInputHeight] = useState(48);
  const [clientInfo, setClientInfo] = useState(null);

  const groupedMessages = useCallback(() => groupMessagesByDate(messages), [messages]);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && groupedMessages().length > 0) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  }, [groupedMessages]);

  useEffect(() => {
    if (isFocused) {
      fetchMessages(clientid);
      fetchClientDetails(clientid);
      setMessagesAsRead();
      
      const pollInterval = setInterval(() => {
        fetchMessages(clientid);
      }, 5000);
      setPolling(pollInterval);

      if (suggestedResponse) {
        setNewMessage(suggestedResponse);
      } else if (clientMessage) {
        setNewMessage(clientMessage);
      } else {
        const draftMessage = getDraftMessage(clientid);
        setNewMessage(draftMessage);
      }
    } else {
      if (polling) {
        clearInterval(polling);
        setPolling(null);
      }
      setDraftMessage(clientid, newMessage);
    }

    return () => {
      if (polling) {
        clearInterval(polling);
      }
      setDraftMessage(clientid, newMessage);
    };
  }, [clientid, isFocused, suggestedResponse, clientMessage]);

  useEffect(() => {
    if (flatListRef.current && groupedMessages().length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: false });
      }, 100);
    }
  }, []);

  const fetchClientDetails = async (clientId) => {
    try {
      const clientData = await getClientById(clientId);
      setClientInfo(clientData);
      const autoRespondStatus = await getClientAutoRespond(clientId);
      setAutoRespond(autoRespondStatus);
    } catch (error) {I
      console.error('Error fetching client details:', error);
    }
  };

  const fetchMessages = useCallback(async (clientid) => {
    try {
      const data = await getMessagesByClientId(clientid);
      const sortedMessages = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  const setMessagesAsRead = async () => {
    try {
      await setMessagesRead(clientid);
    } catch (error) {
      console.error('Error setting messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !clientInfo) return;
    
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}, ${currentDate.toLocaleTimeString()}`;
    
    const newMessageObject = {
      id: `temp-${Date.now()}`,
      body: newMessage,
      fromtext: '+18446480598', // Assuming this is the barber's number
      totext: clientInfo.phonenumber, // Use the client's phone number from clientInfo
      date: formattedDate,
      is_ai: false,
    };

    // Immediately add the new message to the state
    setMessages(prevMessages => [...prevMessages, newMessageObject]);
    
    // Clear the input field
    setNewMessage('');
    
    // Scroll to the bottom
    scrollToBottom();

    try {
      // Send the message to the API
      await sendMessage(newMessageObject.totext, newMessageObject.body, false, true);
      
      // Optionally, you can update the message with a confirmed ID from the API
      // This would require modifying the sendMessage function to return the sent message data
      // setMessages(prevMessages => prevMessages.map(msg => 
      //   msg.id === newMessageObject.id ? {...msg, id: confirmedId} : msg
      // ));

      // Fetch updated messages
      fetchMessages(clientid);
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally, you can remove the message if it failed to send
      // setMessages(prevMessages => prevMessages.filter(msg => msg.id !== newMessageObject.id));
      // Show an error to the user
      alert('Failed to send message. Please try again.');
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

  const groupMessagesByDate = useCallback((messages) => {
    const grouped = {};
    messages.forEach(message => {
      const date = message.date.split(', ')[0];
      if (!grouped[date]) {
        grouped[date] = [];
        grouped[date].push({ isDateSeparator: true, date });
      }
      grouped[date].push(message);
    });
    return Object.values(grouped).flat();
  }, []);

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

  const renderItem = useCallback(({ item }) => {
    if (item.isDateSeparator) {
      return renderDateSeparator(item.date);
    }
    return renderMessage(item);
  }, [clientName]);

  const getItemType = useCallback((item) => {
    return item.isDateSeparator ? 'dateSeparator' : 'message';
  }, []);

  const keyExtractor = useCallback((item) => {
    return item.isDateSeparator ? `date-${item.date}` : `message-${item.id || item.date}`;
  }, []);

  const handleInputChange = (text) => {
    setNewMessage(text);
    setDraftMessage(clientid, text);
  };

  const handleContentSizeChange = (event) => {
    const newHeight = Math.min(150, Math.max(48, event.nativeEvent.contentSize.height));
    setInputHeight(newHeight);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#111318" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.listContainer}>
          <FlashList
            ref={flatListRef}
            data={groupedMessages()}
            renderItem={renderItem}
            estimatedItemSize={100}
            keyExtractor={keyExtractor}
            getItemType={getItemType}
            contentContainerStyle={styles.flashListContent}
          />
        </View>
        {showScrollButton && (
          <TouchableOpacity style={styles.scrollButton} onPress={scrollToBottom}>
            <Text style={styles.scrollButtonText}>↓</Text>
          </TouchableOpacity>
        )}
        <View style={styles.bottomContainer}>
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
              style={[styles.input, { height: inputHeight }]}
              placeholder="Write a message"
              placeholderTextColor="#9da6b8"
              value={newMessage}
              onChangeText={handleInputChange}
              multiline
              onContentSizeChange={handleContentSizeChange}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Icon name="send" size={20} color="#195de6" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111318',
  },
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  flashListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bottomContainer: {
    backgroundColor: '#111318',
    borderTopWidth: 1,
    borderTopColor: '#292e38',
    paddingBottom: Platform.OS === 'ios' ? 0 : 16, // Add padding for Android
  },
  autoRespondContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  autoRespondText: {
    color: '#9da6b8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
  },
  inputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#292e38',
    color: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    marginRight: 8,
    maxHeight: 150,
    minHeight: 48,
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
});

export default React.memo(ClientMessagesScreen);