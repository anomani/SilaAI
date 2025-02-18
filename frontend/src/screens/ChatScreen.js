import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, SafeAreaView, StatusBar, Keyboard, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { handleUserInput, transcribeAudio, createNewThread, pollJobStatus, createAIChatThread, getAIChatThreads, getAIChatThread, updateAIChatThreadTitle, deleteAIChatThread } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../components/ChatContext';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const TypingIndicator = () => {
  const [dots] = useState([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );

    Animated.loop(Animated.parallel(animations)).start();
  }, []);

  return (
    <View style={styles.typingIndicator}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.typingDot,
            {
              opacity: dot,
              transform: [
                {
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const SoundWave = ({ isRecording }) => {
  const [amplitudes] = useState(
    [...Array(5)].map(() => new Animated.Value(0))
  );

  useEffect(() => {
    if (isRecording) {
      const animations = amplitudes.map((amplitude, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(amplitude, {
              toValue: 1,
              duration: 500 + index * 100,
              useNativeDriver: true,
            }),
            Animated.timing(amplitude, {
              toValue: 0,
              duration: 500 + index * 100,
              useNativeDriver: true,
            }),
          ])
        )
      );

      Animated.parallel(animations).start();
    } else {
      amplitudes.forEach(amplitude => {
        amplitude.setValue(0);
        amplitude.stopAnimation();
      });
    }
  }, [isRecording]);

  return (
    <View style={styles.soundWaveContainer}>
      {amplitudes.map((amplitude, index) => (
        <Animated.View
          key={index}
          style={[
            styles.soundWaveLine,
            {
              transform: [
                {
                  scaleY: amplitude.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
              opacity: amplitude,
            },
          ]}
        />
      ))}
    </View>
  );
};

const ThreadSidebar = ({ threads, activeThreadId, onThreadSelect, onNewThread, onDeleteThread, onEditTitle }) => {
  const [editingThread, setEditingThread] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const handleEditTitle = (thread) => {
    setEditingThread(thread);
    setNewTitle(thread.title);
  };

  const handleSaveTitle = async () => {
    if (editingThread && newTitle.trim()) {
      await onEditTitle(editingThread.id, newTitle.trim());
      setEditingThread(null);
      setNewTitle('');
    }
  };

  return (
    <View style={styles.sidebar}>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.threadItem}>
            {editingThread?.id === item.id ? (
              <View style={styles.editTitleContainer}>
                <TextInput
                  style={styles.editTitleInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  onSubmitEditing={handleSaveTitle}
                  autoFocus
                />
                <TouchableOpacity onPress={handleSaveTitle}>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.threadButton,
                  activeThreadId === item.id && styles.activeThread
                ]}
                onPress={() => onThreadSelect(item)}
              >
                <Text style={styles.threadTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.threadActions}>
                  <TouchableOpacity onPress={() => handleEditTitle(item)}>
                    <Ionicons name="pencil" size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeleteThread(item.id)}>
                    <Ionicons name="trash" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

const ChatScreen = () => {
  const [message, setMessage] = useState('');
  const { messages, setMessages } = useChat();
  const navigation = useNavigation();
  const [showIntro, setShowIntro] = useState(true);
  const [isAITyping, setIsAITyping] = useState(false);
  const flatListRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const silenceThreshold = -50;
  const silenceDuration = 1500;
  const silenceTimer = useRef(null);
  const silenceStartTime = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      setShowIntro(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

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
    return () => {
      if (recording) {
        stopRecording();
      }
    };
  }, []);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const threadList = await getAIChatThreads();
      setThreads(threadList);
      if (threadList.length > 0) {
        const thread = await getAIChatThread(threadList[0].id);
        if (thread) {
          setActiveThread(thread);
          console.log("THREAD", thread);
          const formattedMessages = thread.messages?.messages?.map(msg => ({
            role: msg.role,
            content: msg.content
          })) || [];
          setMessages(formattedMessages);
          setShowIntro(false);
        }
      }
    } catch (error) {
      console.error('Error loading threads:', error);
      setThreads([]);
      setMessages([]);
      setShowIntro(true);
    }
  };

  const handleNewThread = async () => {
    try {
      setMessages([]);
      setShowIntro(true);
      setActiveThread(null);
      setShowSidebar(false);
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  const handleThreadSelect = async (thread) => {
    try {
      const fullThread = await getAIChatThread(thread.id);
      setActiveThread(fullThread);
      setMessages(fullThread.messages?.messages || []);
      setShowIntro(false);
      setShowSidebar(false);
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  };

  const handleDeleteThread = async (threadId) => {
    try {
      await deleteAIChatThread(threadId);
      setThreads(threads.filter(t => t.id !== threadId));
      if (activeThread?.id === threadId) {
        const remainingThreads = threads.filter(t => t.id !== threadId);
        if (remainingThreads.length > 0) {
          handleThreadSelect(remainingThreads[0]);
        } else {
          setActiveThread(null);
          setMessages([]);
          setShowIntro(true);
        }
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  const handleEditTitle = async (threadId, newTitle) => {
    try {
      const updatedThread = await updateAIChatThreadTitle(threadId, newTitle);
      setThreads(threads.map(t => t.id === threadId ? { ...t, title: newTitle } : t));
      if (activeThread?.id === threadId) {
        setActiveThread({ ...activeThread, title: newTitle });
      }
    } catch (error) {
      console.error('Error updating thread title:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    // Create a new message object with unique ID and timestamp
    const userMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message to messages state immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Clear input field
    setMessage('');
    setIsAITyping(true);

    try {
      // Send message to backend with OpenAI thread ID if exists
      const response = await handleUserInput(message, activeThread?.thread_id);
      
      if (response.error) {
        setIsAITyping(false);
        setMessages(prevMessages => [...prevMessages, {
          id: Date.now(),
          content: `Error: ${response.error}`,
          role: 'assistant',
          timestamp: new Date().toISOString()
        }]);
        return;
      }

      if (response.jobId) {
        // Poll for job status
        const pollInterval = setInterval(async () => {
          try {
            const status = await pollJobStatus(response.jobId);
            console.log('Poll status:', status);

            if (status.status === 'completed') {
              clearInterval(pollInterval);
              setIsAITyping(false);

              // Update thread if needed
              if (status.result?.threadId) {
                try {
                  const threadDetails = await getAIChatThread(status.result.threadId);
                  if (threadDetails) {
                    const newThread = {
                      id: threadDetails.id,
                      thread_id: threadDetails.thread_id,
                      title: threadDetails.title,
                      lastMessageAt: new Date().toISOString()
                    };

                    // Update threads list
                    setThreads(prevThreads => {
                      const threadExists = prevThreads.some(t => t.id === newThread.id);
                      if (threadExists) {
                        return prevThreads.map(t => 
                          t.id === newThread.id 
                            ? { ...t, lastMessageAt: new Date().toISOString(), title: threadDetails.title }
                            : t
                        );
                      }
                      return [newThread, ...prevThreads];
                    });

                    // Set as active thread if no active thread
                    if (!activeThread) {
                      setActiveThread(newThread);
                    } else if (activeThread.id === newThread.id) {
                      setActiveThread(newThread);
                    }
                  }
                } catch (error) {
                  console.error('Error updating thread details:', error);
                }
              }

              // Add assistant's response to messages
              if (status.result?.message) {
                setMessages(prevMessages => {
                  // Check if message already exists
                  const messageExists = prevMessages.some(msg => 
                    msg.role === 'assistant' && 
                    msg.content === status.result.message
                  );
                  
                  if (messageExists) return prevMessages;
                  
                  return [...prevMessages, {
                    id: Date.now(),
                    content: status.result.message,
                    role: 'assistant',
                    timestamp: new Date().toISOString()
                  }];
                });
              }
            } else if (status.status === 'failed') {
              clearInterval(pollInterval);
              setIsAITyping(false);
              setMessages(prevMessages => [...prevMessages, {
                id: Date.now(),
                content: 'Error: Failed to process message',
                role: 'assistant',
                timestamp: new Date().toISOString()
              }]);
            }
          } catch (error) {
            clearInterval(pollInterval);
            setIsAITyping(false);
            console.error('Error polling status:', error);
          }
        }, 1000); // Poll every second
      }
    } catch (error) {
      setIsAITyping(false);
      console.error('Error sending message:', error);
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now(),
        content: 'Error sending message. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const suggestedPrompts = [
    "Create a list of clients who have not shown up in more than 6 months",
    "How many appointments have I done in June?",
    "How many active clients do I have"
  ];

  const handlePromptClick = (prompt) => {
    setMessage(prompt);
    handleSend(prompt);
  };

  const renderItem = ({ item }) => {
    
    let id = null;
    if (item.role === 'assistant' && item.content) {
      const idRegex = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;
      const match = item.content.match(idRegex);
      id = match ? match[1] : null;
    }
    

    const handleLinkPress = () => {
      if (id) {
        console.log('Navigating with id:', id);
        navigation.navigate('QueryResults', { id });
      }
    };

    return (
      <View
        style={[
          styles.messageContainer,
          item.role === 'user' ? styles.userMessage : styles.botMessage
        ]}
      >
        {item.role === 'assistant' && id ? (
          <Text style={styles.messageText}>
            View list{' '}
            <Text
              style={styles.link}
              onPress={handleLinkPress}
            >
              here
            </Text>
            .
          </Text>
        ) : (
          <Text style={styles.messageText}>{item.content}</Text>
        )}
      </View>
    );
  };

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

  const startRecording = async () => {
    console.log('Starting recording...');
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      newRecording.setOnRecordingStatusUpdate(onRecordingStatusUpdate);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);

      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording...');
    setIsRecording(false);
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    silenceStartTime.current = null;

    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);
        await handleRecordingComplete(uri);
      } else {
        console.log('No active recording to stop');
      }
    } catch (err) {
      console.error('Error during recording stop process:', err);
    } finally {
      setRecording(null);
    }
  };

  const onRecordingStatusUpdate = (status) => {
    if (status.isRecording) {
      const { metering } = status;

      if (metering !== undefined && metering < silenceThreshold) {
        if (!silenceStartTime.current) {
          silenceStartTime.current = Date.now();
          console.log('Silence detected, starting timer');
        } else {
          const currentSilenceDuration = Date.now() - silenceStartTime.current;
          
          if (currentSilenceDuration >= silenceDuration) {
            console.log('Silence duration exceeded, stopping recording');
            stopRecording();  // Make sure this is being called
          }
        }
      } else {
        if (silenceStartTime.current) {
          console.log('Audio above threshold, resetting silence timer');
          silenceStartTime.current = null;
        }
      }
    }
  };

  const handleRecordingComplete = async (uri) => {
    try {
      const transcription = await transcribeAudio(uri);
      // Directly send the transcribed message without setting it in the input
      await handleSend(transcription);
    } catch (err) {
      console.error('Failed to transcribe audio', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSidebar(!showSidebar)} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{activeThread?.title || 'New Chat'}</Text>
          </View>
          <TouchableOpacity onPress={handleNewThread} style={styles.newChatButton}>
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showSidebar}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSidebar(false)}
        >
          <View style={styles.modalContainer}>
            <ThreadSidebar
              threads={threads}
              activeThreadId={activeThread?.id}
              onThreadSelect={handleThreadSelect}
              onNewThread={handleNewThread}
              onDeleteThread={handleDeleteThread}
              onEditTitle={handleEditTitle}
            />
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setShowSidebar(false)}
            />
          </View>
        </Modal>

        <View style={styles.contentContainer}>
          {showIntro && messages.length === 0 ? (
            renderIntro()
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.chatContainer}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
          
          {isAITyping && (
            <View style={styles.typingIndicatorContainer}>
              <TypingIndicator />
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { height: Math.max(40, inputHeight) }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message"
              placeholderTextColor="#888"
              multiline
              onContentSizeChange={(event) => {
                setInputHeight(event.nativeEvent.contentSize.height);
              }}
            />
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={styles.recordButton}
            >
              {isRecording ? (
                <SoundWave isRecording={isRecording} />
              ) : (
                <Ionicons name="mic" size={24} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleSend(message)} 
              style={[
                styles.sendButton,
                !message.trim() && styles.sendButtonDisabled
              ]}
              disabled={!message.trim()}
            >
              <Ionicons name="send" size={24} color={message.trim() ? '#fff' : '#666'} />
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
    backgroundColor: '#121214',
  },
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    paddingTop: Platform.OS === "ios" ? 8 : 5,
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    height: Platform.OS === "ios" ? 55 : 45,
  },
  menuButton: {
    position: 'absolute',
    left: 15,
    top: Platform.OS === "ios" ? 15 : 10,
    zIndex: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: Platform.OS === "ios" ? 7 : 0,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  newChatButton: {
    position: 'absolute',
    right: 15,
    top: Platform.OS === "ios" ? 15 : 10,
    zIndex: 1,
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sidebar: {
    width: '80%',
    maxWidth: 350,
    backgroundColor: '#1a1a1a',
    padding: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  threadItem: {
    marginBottom: 12,
    marginTop: 4,
  },
  threadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  activeThread: {
    backgroundColor: '#3a3a3a',
  },
  threadTitle: {
    color: '#fff',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  threadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  editTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 12,
  },
  editTitleInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    padding: 8,
    marginRight: 10,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#121214',
    marginHorizontal: 10,
  },
  chatContainer: {
    padding: 10,
    paddingTop: 20,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 12,
    borderRadius: 20,
    maxWidth: '80%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
    backgroundColor: '#2563eb',
    marginLeft: '20%',
  },
  botMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
    backgroundColor: '#333333',
    marginRight: '20%',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  link: {
    color: '#4a90e2',
    textDecorationLine: 'underline',
  },
  typingIndicatorContainer: {
    padding: 10,
    paddingBottom: 0,
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
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginLeft: 10,
    backgroundColor: '#333333',
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#fff',
    marginHorizontal: 3,
  },
  recordButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    borderRadius: 50,
    padding: 10,
  },
  soundWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 30,
    height: 30,
  },
  soundWaveLine: {
    width: 3,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
});

export default ChatScreen;
