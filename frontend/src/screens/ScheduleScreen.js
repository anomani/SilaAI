// // frontend/src/screens/ChatScreen.js
// import React, { useState } from 'react';
// import { View, Text, TextInput, Button, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
// import axios from 'axios';

// const ChatScreen = () => {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');

//   const sendMessage = async () => {
//     if (input.trim().length === 0) return;

//     const userMessage = { sender: 'user', text: input };
//     setMessages((prevMessages) => [...prevMessages, userMessage]);
//     setInput('');

//     try {
//       const response = await axios.post('http://localhost:3000/api/chat', { message: input });
//       const botMessage = { sender: 'bot', text: response.data.message };
//       setMessages((prevMessages) => [...prevMessages, botMessage]);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       const errorMessage = { sender: 'bot', text: 'Something went wrong. Please try again.' };
//       setMessages((prevMessages) => [...prevMessages, errorMessage]);
//     }
//   };

//   const renderMessage = ({ item }) => (
//     <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
//       <Text style={styles.messageText}>{item.text}</Text>
//     </View>
//   );

//   return (
//     <KeyboardAvoidingView
//       style={styles.container}
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       keyboardVerticalOffset={90}
//     >
//       <FlatList
//         data={messages}
//         renderItem={renderMessage}
//         keyExtractor={(item, index) => index.toString()}
//         contentContainerStyle={styles.messageList}
//       />
//       <View style={styles.inputContainer}>
//         <TextInput
//           style={styles.input}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Type a message..."
//         />
//         <Button title="Send" onPress={sendMessage} />
//       </View>
//     </KeyboardAvoidingView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   messageList: {
//     padding: 10,
//   },
//   messageContainer: {
//     marginVertical: 5,
//     padding: 10,
//     borderRadius: 5,
//   },
//   userMessage: {
//     alignSelf: 'flex-end',
//     backgroundColor: '#dcf8c6',
//   },
//   botMessage: {
//     alignSelf: 'flex-start',
//     backgroundColor: '#f1f0f0',
//   },
//   messageText: {
//     fontSize: 16,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 10,
//     borderTopWidth: 1,
//     borderTopColor: '#ccc',
//   },
//   input: {
//     flex: 1,
//     borderColor: '#ccc',
//     borderWidth: 1,
//     borderRadius: 20,
//     paddingHorizontal: 10,
//     marginRight: 10,
//   },
// });

// export default ChatScreen;
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { sendMessage } from '../services/api';  // Import sendMessage function

const ScheduleScreen = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSendMessage = async () => {
    if (input.trim().length === 0) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');

    try {
      const responseMessage = await sendMessage(input);  // Use sendMessage function
      const botMessage = { sender: 'bot', text: responseMessage };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { sender: 'bot', text: 'Something went wrong. Please try again.' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={handleSendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageList: {
    padding: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 5,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f0f0',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    marginRight: 10,
  },
});

export default ScheduleScreen;
