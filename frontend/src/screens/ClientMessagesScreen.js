import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Switch, Keyboard, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getMessagesByClientId, sendMessage, setMessagesRead, getClientById, getClientAutoRespond, updateClientAutoRespond, getSuggestedResponse, clearSuggestedResponse, getAIResponseStatus } from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { useIsFocused } from '@react-navigation/native';
import { useMessage } from '../components/MessageContext';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const Header = ({ clientName, navigation, onClearSuggestedResponse, hasSuggestedResponse, clientDetails }) => {
  const handleNamePress = () => {
    if (clientDetails) {
      navigation.navigate('ClientDetails', { client: clientDetails });
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <TouchableOpacity 
          onPress={handleNamePress}
          activeOpacity={0.7}
          style={styles.headerTitleContainer}
        >
          <Text style={styles.headerTitle}>{clientName}</Text>
          <Ionicons name="information-circle-outline" size={16} color="#9da6b8" style={styles.infoIcon} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerRight}>
        {hasSuggestedResponse && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearSuggestedResponse}
          >
            <Text style={styles.clearButtonText}>Clear response</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const ClientMessagesScreen = ({ route }) => {
  const { clientid, clientName, suggestedResponse: initialSuggestedResponse, clientMessage } = route.params;
  const [messages, setMessages] = useState([]);
  const { getDraftMessage, setDraftMessage } = useMessage();
  const [newMessage, setNewMessage] = useState('');
  // const [autoRespond, setAutoRespond] = useState(true);
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
  const [currentSuggestedResponse, setCurrentSuggestedResponse] = useState(initialSuggestedResponse || '');
  const [editableSuggestedResponse, setEditableSuggestedResponse] = useState('');
  const [isSuggestedResponseEdited, setIsSuggestedResponseEdited] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const aiStatusPolling = useRef(null);

  useEffect(() => {
    if (isFocused) {
      const initializeScreen = async () => {
        const data = await getMessagesByClientId(clientid);
        const sortedMessages = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        fetchMessagesAndSetup();
        fetchSuggestedResponse();
        startPollingAIStatus();
      };
      
      initializeScreen();
    } else {
      if (polling) {
        clearInterval(polling);
        setPolling(null);
      }
      stopPollingAIStatus();
      setDraftMessage(clientid, newMessage);
    }

    return () => {
      if (polling) {
        clearInterval(polling);
      }
      stopPollingAIStatus();
      setDraftMessage(clientid, newMessage);
    };
  }, [clientid, isFocused, initialSuggestedResponse, clientMessage]);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  const fetchMessagesAndSetup = useCallback(async () => {
    try {
      const data = await getMessagesByClientId(clientid);
      const sortedMessages = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMessages(sortedMessages);
      
      fetchClientDetails(clientid);
      setMessagesAsRead();
      
      const pollInterval = setInterval(async () => {
        await Promise.all([
          fetchMessages(clientid),
          fetchSuggestedResponse()
        ]);
      }, 5000);
      setPolling(pollInterval);

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [clientid, scrollToBottom]);

  const fetchMessages = useCallback(async (clientid) => {
    try {
      const data = await getMessagesByClientId(clientid);
      const sortedMessages = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setMessages(prevMessages => {
        const hasNewMessages = JSON.stringify(prevMessages) !== JSON.stringify(sortedMessages);
        if (hasNewMessages) {
          const newestMessage = sortedMessages[sortedMessages.length - 1];
          if (newestMessage && newestMessage.fromtext !== '+18446480598') {
            startPollingAIStatus();
          }
          setLocalMessages(prev => prev.filter(localMsg => 
            !sortedMessages.some(realMsg => 
              realMsg.body === localMsg.body && 
              realMsg.fromtext === localMsg.fromtext
            )
          ));
          requestAnimationFrame(() => {
            scrollToBottom();
          });
        }
        return sortedMessages;
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [scrollToBottom]);

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

  useEffect(() => {
    if (Platform.OS === 'ios') {
      Notifications.setNotificationCategoryAsync('suggestedResponse', [
        {
          identifier: 'reply',
          buttonTitle: 'Reply',
          options: {
            opensAppToForeground: false,
          },
          textInput: {
            submitButtonTitle: 'Send',
            placeholder: 'Edit suggested response...',
          },
        },
      ]);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => subscription.remove();
  }, []);

  const fetchClientDetails = async (clientId) => {
    try {
      const clientData = await getClientById(clientId);
      setClientDetails(clientData);
      // const autoRespondStatus = await getClientAutoRespond(clientId);
      // setAutoRespond(autoRespondStatus);
    } catch (error) {
      console.error('Error fetching client details:', error);
    }
  };

  const setMessagesAsRead = async () => {
    try {
      await setMessagesRead(clientid);
    } catch (error) {
      console.error('Error setting messages as read:', error);
    }
  };

  const fetchSuggestedResponse = async () => {
    try {
      const response = await getSuggestedResponse(clientid);
      if (response) {
        setCurrentSuggestedResponse(response);
        if (!newMessage.trim()) {
          setEditableSuggestedResponse(response);
        }
      } else {
        setCurrentSuggestedResponse('');
        if (editableSuggestedResponse === currentSuggestedResponse) {
          setEditableSuggestedResponse('');
        }
      }
    } catch (error) {
      console.error('Error fetching suggested response:', error);
    }
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage called', { newMessage, clientDetails });

    const messageToSend = newMessage || currentSuggestedResponse;

    if (typeof messageToSend !== 'string' || messageToSend.trim() === '') {
      console.log('messageToSend is not a valid string', messageToSend);
      return;
    }

    if (!clientDetails) {
      console.log('clientDetails is null or undefined');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    try {
      const recipient = clientDetails.phonenumber;
      console.log('Recipient:', recipient);

      const now = new Date();
      const adjustedDateString = `${(now.getMonth() + 1)}/${now.getDate()}/${now.getFullYear()}, ${now.toLocaleTimeString('en-US')}`;
      console.log('Temp message date:', adjustedDateString);
      
      const isAI = messageToSend === currentSuggestedResponse;

      const tempMessage = {
        id: tempId,
        body: messageToSend,
        fromtext: '+18446480598',
        totext: recipient,
        date: adjustedDateString,
        is_ai: isAI,
        sending: true,
      };

      console.log('Created temp message:', tempMessage);

      // Clear all message-related states immediately
      setLocalMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      setEditableSuggestedResponse('');
      setCurrentSuggestedResponse('');
      setIsSuggestedResponseEdited(false);
      // Also clear the draft message
      setDraftMessage(clientid, '');
      
      scrollToBottom();

      console.log('Sending message via API'+ messageToSend);
      await sendMessage(recipient, messageToSend, false, !isAI);
      
      console.log('Message sent successfully');

      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchMessages(clientid);
      await fetchSuggestedResponse();
      
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      await clearSuggestedResponse(clientid);
    } catch (error) {
      console.error('Error sending message:', error);
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

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    setShowScrollButton(offsetY < contentHeight - scrollViewHeight - 100);
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) {
      console.log('Undefined dateString received:', dateString);
      return '';
    }

    try {
      const [datePart, timePart] = dateString.split(', ');
      if (!timePart) {
        console.log('Invalid date format:', dateString);
        return '';
      }

      // Handle time format "HH:MM:SS AM/PM"
      const timeMatch = timePart.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
      if (!timeMatch) {
        console.log('Could not parse time:', timePart);
        return '';
      }

      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      let period = timeMatch[3] || '';

      // Convert 24-hour format to 12-hour if needed
      if (!period) {
        period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
      }

      return `${hours}:${minutes} ${period}`;
    } catch (error) {
      console.error('Error formatting timestamp:', error, 'for dateString:', dateString);
      return '';
    }
  };

  const formatDate = (dateString) => {
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const isWithinFiveMinutes = (date1, date2) => {
    const [d1Time, d1Period] = date1.split(', ')[1].split(' ');
    const [d2Time, d2Period] = date2.split(', ')[1].split(' ');
    
    const getMinutes = (time, period) => {
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const minutes1 = getMinutes(d1Time, d1Period);
    const minutes2 = getMinutes(d2Time, d2Period);

    const diffInMinutes = Math.abs(minutes1 - minutes2);
    return diffInMinutes <= 5;
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach((message, index) => {
      const date = message.date.split(', ')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }

      const prevMessage = messages[index - 1];
      const shouldGroup = prevMessage && 
        prevMessage.fromtext === message.fromtext && 
        isWithinFiveMinutes(prevMessage.date, message.date);

      if (shouldGroup) {
        const lastGroup = grouped[date][grouped[date].length - 1];
        lastGroup.messages.push(message);
      } else {
        grouped[date].push({
          sender: message.fromtext,
          messages: [message],
          firstMessageDate: message.date
        });
      }
    });

    return Object.entries(grouped).map(([date, groups]) => ({ date, groups }));
  };

  const renderDateSeparator = (date) => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{formatDate(date)}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  const renderMessage = useCallback((messageGroup) => {
    const isAssistant = messageGroup.sender === '+18446480598';
    const avatar = isAssistant ? twilioAvatar : defaultAvatar;
    
    return (
      <View 
        key={messageGroup.firstMessageDate}
        style={[styles.messageContainer, isAssistant ? styles.assistantMessage : styles.clientMessage]}
      >
        {!isAssistant && <Image source={avatar} style={styles.avatar} />}
        <View style={[styles.messageContent, !isAssistant && styles.clientMessageContent]}>
          {messageGroup.messages.map((message, index) => (
            <View style={styles.messageWrapper} key={message.id || `${message.date}-${message.fromtext}-${Math.random()}`}>
              {isAssistant && <View style={styles.deliveryIconContainer}>
                {message.error && <Ionicons name="alert-circle" size={14} color="#ff4444" />}
                {message.delivered && <Ionicons name="checkmark-done" size={14} color="#9da6b8" />}
                {!message.delivered && <Ionicons name="checkmark" size={14} color="#9da6b8" />}
              </View>}
              <View 
                style={[
                  styles.messageBubble, 
                  isAssistant ? styles.assistantBubble : styles.clientBubble,
                  index > 0 && styles.groupedMessageBubble
                ]}
              >
                <Text style={[styles.messageText, isAssistant ? styles.assistantText : styles.clientText]}>
                  {message.body}
                </Text>
                <View style={styles.timestampContainer}>
                  <Text style={styles.timestamp}>
                    {formatTimestamp(message.date)}
                  </Text>
                  {isAssistant && (
                    <Text style={styles.aiIndicator}>
                      {message.is_ai ? 'AI' : 'Manual'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
        {isAssistant && <Image source={avatar} style={styles.avatar} />}
      </View>
    );
  }, [messages, aiStatus]);

  const renderItem = useCallback(({ item }) => (
    <View key={item.date}>
      {renderDateSeparator(item.date)}
      {item.groups.map(group => renderMessage(group))}
    </View>
  ), [renderMessage]);

  const handleInputChange = (text) => {
    setNewMessage(text);
    setDraftMessage(clientid, text);
    setEditableSuggestedResponse(text);
    setIsSuggestedResponseEdited(text !== currentSuggestedResponse);
  };

  const handleContentSizeChange = (event) => {
    const { height } = event.nativeEvent.contentSize;
    setInputHeight(Math.min(Math.max(60, height), 150));
  };

  const handleNotificationResponse = (response) => {
    if (response.actionIdentifier === 'reply' && response.userText) {
      handleSendMessage(response.userText);
    }
  };

  const sendSuggestedResponseNotification = async (suggestedResponse) => {
    if (Platform.OS !== 'ios') return;

    const recentMessages = messages.slice(-5);
    const formattedMessages = recentMessages
      .map(msg => `${msg.fromtext === '+18446480598' ? 'You' : clientName}: ${msg.body}`)
      .join('\n');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Suggested Response for ${clientName}`,
        body: `Recent messages:\n${formattedMessages}\n\nSuggested response: ${suggestedResponse}`,
        data: { clientid, clientName, suggestedResponse, notificationType: 'suggestedResponse', recentMessages },
        categoryIdentifier: 'suggestedResponse',
      },
      trigger: null,
    });
  };

  const renderEmptyConversation = () => (
    <View style={styles.emptyConversationContainer}>
      <Text style={styles.emptyConversationText}>Start the conversation!</Text>
    </View>
  );

  const handleClearSuggestedResponse = useCallback(async () => {
    try {
      await clearSuggestedResponse(clientid);
      setCurrentSuggestedResponse('');
      setEditableSuggestedResponse('');
      setIsSuggestedResponseEdited(false);
    } catch (error) {
      console.error('Error clearing suggested response:', error);
    }
  }, [clientid]);

  const startPollingAIStatus = useCallback(() => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await getAIResponseStatus(clientid);
        setAiStatus(status?.status || null);
      } catch (error) {
        console.error('Error polling AI status:', error);
      }
    }, 2000); // Poll every 2 seconds

    aiStatusPolling.current = pollInterval;

    return () => clearInterval(pollInterval);
  }, [clientid]);

  const stopPollingAIStatus = useCallback(() => {
    if (aiStatusPolling.current) {
      clearInterval(aiStatusPolling.current);
    }
  }, []);

  const renderInputPlaceholder = () => {
    if (aiStatus === 'pending') {
      return "AI is typing...";
    }
    return "Write a message";
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        clientName={clientName} 
        navigation={navigation} 
        onClearSuggestedResponse={handleClearSuggestedResponse}
        hasSuggestedResponse={!!currentSuggestedResponse}
        clientDetails={clientDetails}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
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
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
            removeClippedSubviews={false}
            onContentSizeChange={() => {
              requestAnimationFrame(() => {
                scrollToBottom();
              });
            }}
            onLayout={() => {
              requestAnimationFrame(() => {
                scrollToBottom();
              });
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.messageList}
            contentContainerStyle={[
              styles.messageListContent,
              { paddingBottom: keyboardHeight + 16 }
            ]}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10
            }}
          />
          {showScrollButton && (
            <TouchableOpacity style={styles.scrollButton} onPress={scrollToBottom}>
              <Text style={styles.scrollButtonText}>↓</Text>
            </TouchableOpacity>
          )}
          <View style={styles.bottomContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { flexGrow: 1 }]}
                value={newMessage || editableSuggestedResponse}
                onChangeText={handleInputChange}
                placeholder={renderInputPlaceholder()}
                placeholderTextColor="#9da6b8"
                multiline
                onContentSizeChange={handleContentSizeChange}
                textAlignVertical="top"
                editable={true}
                maxHeight={200}
              />
              {aiStatus === 'pending' && !currentSuggestedResponse && (
                <ActivityIndicator 
                  style={styles.loadingIndicator} 
                  color="#195de6" 
                  size="small"
                />
              )}
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  (!clientDetails || (newMessage.trim() === '' && currentSuggestedResponse.trim() === '')) && styles.sendButtonDisabled
                ]} 
                onPress={() => handleSendMessage()}
                disabled={!clientDetails || (newMessage.trim() === '' && currentSuggestedResponse.trim() === '')}
              >
                <Ionicons 
                  name="send" 
                  size={24} 
                  color={(clientDetails && (newMessage.trim() !== '' || currentSuggestedResponse.trim() !== '')) ? '#fff' : '#666'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111318',
    borderBottomWidth: 1,
    borderBottomColor: '#292e38',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoIcon: {
    opacity: 0.8,
  },
  backButton: {
    width: 40, // Fixed width to help with centering
  },
  headerRight: {
    width: 40, // Fixed width to help with centering
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    gap: 12,
  },
  assistantMessage: {
    justifyContent: 'flex-end',
  },
  clientMessage: {
    justifyContent: 'flex-start',
  },
  clientMessageContent: {
    alignItems: 'flex-start', // Override alignment for client messages
  },
  clientMessageSender: {
    alignSelf: 'flex-start', // Override alignment for client sender name
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  messageContent: {
    maxWidth: '75%',
    alignItems: 'flex-end', // Align content to the right for assistant messages
  },
  messageSender: {
    color: '#9da6b8',
    fontSize: 13,
    marginBottom: 4,
    alignSelf: 'flex-end', // Align sender name to the right
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  timestampAndReceipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    alignItems: 'flex-start',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(18, 18, 20, 0.9)',
  },
  input: {
    flex: 1,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 25,
    color: '#fff',
    fontSize: 16,
    minHeight: 40,
    maxHeight: 200,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    borderRadius: 50,
    padding: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
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
  emptyConversationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyConversationText: {
    color: '#9da6b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 70,
    bottom: 24,
  },
  groupedMessageBubble: {
    marginTop: 4,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  deliveryIconContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 4,
  },
  typingIndicator: {
    fontSize: 12,
    color: '#9da6b8',
    fontStyle: 'italic'
  },
  clickableText: {
    color: '#007AFF',  // iOS blue color
    textDecorationLine: 'underline',
  },
});

export default React.memo(ClientMessagesScreen);