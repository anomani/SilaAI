import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, SafeAreaView, StatusBar, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { handleUserInput, transcribeAudio, createNewThread } from '../services/api';
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
  const silenceThreshold = -50; // Adjust this value as needed (in dB)
  const silenceDuration = 1500; // 1.5 seconds of silence before stopping
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

  const suggestedPrompts = [
    "Create a list of clients who have not shown up in more than 6 months",
    "How many appointments have I done in June?",
    "How many active clients do I have",
    "Create a list of my muslim clients",
    "Create a list of clients named Adam Nomani"
  ];

  const handleSend = async (text = message) => {
    if (text.trim() === '') return;

    setShowIntro(false);
    const newMessages = [...messages, { text: text, sender: 'user' }];
    setMessages(newMessages);
    setMessage('');
    setIsAITyping(true);

    try {
      const response = await handleUserInput(text);
      const responseMessage = typeof response === 'string' ? response : response.message;
      setMessages([...newMessages, { text: responseMessage, sender: 'bot' }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([...newMessages, { text: 'Sorry, there was an error processing your request.', sender: 'bot' }]);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleLinkPress = (id) => {
    console.log('Navigating with id:', id);
    navigation.navigate('QueryResults', { id });
  };

  const handlePromptClick = (prompt) => {
    setMessage(prompt);
    handleSend(prompt);
  };

  const renderItem = ({ item }) => {
    console.log("ITEM", item);
    
    let id = null;
    if (item.sender === 'bot') {
      const idRegex = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;
      const match = item.text.match(idRegex);
      id = match ? match[1] : null;
    }
    
    console.log("ID", id);

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
          item.sender === 'user' ? styles.userMessage : styles.botMessage
        ]}
      >
        {item.sender === 'bot' && id ? (
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
          <Text style={styles.messageText}>{item.text}</Text>
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

  const handleNewChat = async () => {
    try {
      await createNewThread();
      setMessages([]);
      setShowIntro(true);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={[
          styles.contentContainer, 
          keyboardVisible && styles.contentContainerKeyboardVisible
        ]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>UZI AI</Text>
            </View>
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.chatListContainer}>
            {showIntro && messages.length === 0 ? (
              renderIntro()
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={[
                  styles.chatContainer,
                  { paddingBottom: keyboardHeight + 16 }
                ]}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
            )}
          </View>
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
            <TouchableOpacity onPress={() => handleSend()} style={styles.sendButton}>
              <Ionicons name="send" size={24} color="#fff" />
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
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainerKeyboardVisible: {
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(18, 18, 20, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatListContainer: {
    flex: 1,
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
    backgroundColor: '#195de6',
  },
  botMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
    backgroundColor: '#333333',
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
    alignItems: 'flex-end',
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
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    borderRadius: 50,
    padding: 10,
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
  newChatButton: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
  },
});

export default ChatScreen;
