import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Switch, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getMessagesByClientId, sendMessage, setMessagesRead, getClientById, getClientAutoRespond, updateClientAutoRespond } from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { useIsFocused } from '@react-navigation/native';
import { useMessage } from '../components/MessageContext';

const ClientMessagesScreen = ({ route }) => {
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
  const [localMessages, setLocalMessages] = useState([]);
  const [clientDetails, setClientDetails] = useState(null);
  const [inputHeight, setInputHeight] = useState(60);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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

      // Handle suggested response, new client message, or draft message
      if (suggestedResponse) {
        setNewMessage(suggestedResponse);
      } else if (clientMessage) {
        setNewMessage(clientMessage);
      } else {
        const draftMessage = getDraftMessage(clientid);
        if (draftMessage !== newMessage) {
          setNewMessage(draftMessage);
        }
      }
    } else {
      // Stop polling when the screen is not focused
      if (polling) {
        clearInterval(polling);
        setPolling(null);
      }
      // Save draft message when navigating away
      setDraftMessage(clientid, newMessage);
    }

    return () => {
      if (polling) {
        clearInterval(polling);
      }
      // Save draft message when component unmounts
      setDraftMessage(clientid, newMessage);
    };
  }, [clientid, isFocused, suggestedResponse, clientMessage]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const fetchClientDetails = async (clientId) => {
    try {
      const clientData = await getClientById(clientId);
      setClientDetails(clientData);
      const autoRespondStatus = await getClientAutoRespond(clientId);
      setAutoRespond(autoRespondStatus);
    } catch (error) {
      console.error('Error fetching client details:', error);
    }
  };

  const fetchMessages = useCallback(async (clientid) => {
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
  }, []);

  const setMessagesAsRead = async () => {
    try {
      await setMessagesRead(clientid);
    } catch (error) {
      console.error('Error setting messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !clientDetails) return;
    const tempId = `temp-${Date.now()}`;
    try {
      const recipient = clientDetails.phonenumber;
      const adjustedDate = new Date();
      adjustedDate.setHours(adjustedDate.getHours() - 4);
      const adjustedDateString = adjustedDate.toLocaleString();
      const tempMessage = {
        id: tempId,
        body: newMessage,
        fromtext: '+18446480598',
        totext: recipient,
        date: adjustedDateString,
        is_ai: false,
      };

      setLocalMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      scrollToBottom();

      await sendMessage(recipient, newMessage, false, true);
      
      console.log('Message sent successfully');

      // Fetch updated messages
      await fetchMessages(clientid);
      
      // Remove the temporary message after fetching updated messages
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message if sending failed
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
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

    let adjustedHours = parseInt(hours, 10) ;
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

  const handleInputChange = (text) => {
    setNewMessage(text);
    setDraftMessage(clientid, text);
  };

  const handleContentSizeChange = (event) => {
    const { height } = event.nativeEvent.contentSize;
    setInputHeight(Math.min(Math.max(60, height), 150));
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={[
        styles.contentContainer, 
        keyboardVisible && styles.contentContainerKeyboardVisible
      ]}>
        <FlatList
          ref={flatListRef}
          data={groupMessagesByDate([...messages, ...localMessages])}
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
          contentContainerStyle={[
            styles.messageListContent,
            { paddingBottom: keyboardHeight + 16 }
          ]}
        />
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
              style={[styles.input, { height: Math.min(150, Math.max(60, inputHeight)) }]}
              placeholder="Write a message"
              placeholderTextColor="#9da6b8"
              value={newMessage}
              onChangeText={handleInputChange}
              multiline
              onContentSizeChange={handleContentSizeChange}
            />
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={handleSendMessage}
              disabled={!clientDetails}
            >
              <Icon name="send" size={20} color={clientDetails ? "#195de6" : "#9da6b8"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainerKeyboardVisible: {
    justifyContent: 'flex-start',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    flexGrow: 1,
    paddingBottom: 16, // Base padding
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
  bottomContainer: {
    backgroundColor: '#111318',
    borderTopWidth: 1,
    borderTopColor: '#292e38',
    paddingBottom: Platform.OS === 'ios' ? 5 : 0,
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
    minHeight: 60,
    textAlignVertical: 'top',
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
});

export default React.memo(ClientMessagesScreen);