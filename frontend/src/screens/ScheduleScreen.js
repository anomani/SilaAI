// // import React, { useState } from 'react';
// // import { View, Text, TextInput, Button, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
// // import { sendMessage } from '../services/api';  // Import sendMessage function

// // const ScheduleScreen = () => {
// //   const [messages, setMessages] = useState([]);
// //   const [input, setInput] = useState('');

// //   const handleSendMessage = async () => {
// //     if (input.trim().length === 0) return;

// //     const userMessage = { sender: 'user', text: input };
// //     setMessages((prevMessages) => [...prevMessages, userMessage]);
// //     setInput('');

// //     try {
// //       const responseMessage = await sendMessage(input);  // Use sendMessage function
// //       const botMessage = { sender: 'bot', text: responseMessage };
// //       setMessages((prevMessages) => [...prevMessages, botMessage]);
// //     } catch (error) {
// //       console.error('Error sending message:', error);
// //       const errorMessage = { sender: 'bot', text: 'Something went wrong. Please try again.' };
// //       setMessages((prevMessages) => [...prevMessages, errorMessage]);
// //     }
// //   };

// //   const renderMessage = ({ item }) => (
// //     <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
// //       <Text style={styles.messageText}>{item.text}</Text>
// //     </View>
// //   );

// //   return (
// //     <KeyboardAvoidingView
// //       style={styles.container}
// //       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
// //       keyboardVerticalOffset={90}
// //     >
// //       <FlatList
// //         data={messages}
// //         renderItem={renderMessage}
// //         keyExtractor={(item, index) => index.toString()}
// //         contentContainerStyle={styles.messageList}
// //       />
// //       <View style={styles.inputContainer}>
// //         <TextInput
// //           style={styles.input}
// //           value={input}
// //           onChangeText={setInput}
// //           placeholder="Type a message..."
// //         />
// //         <Button title="Send" onPress={handleSendMessage} />
// //       </View>
// //     </KeyboardAvoidingView>
// //   );
// // };

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#fff',
// //   },
// //   messageList: {
// //     padding: 10,
// //   },
// //   messageContainer: {
// //     marginVertical: 5,
// //     padding: 10,
// //     borderRadius: 5,
// //   },
// //   userMessage: {
// //     alignSelf: 'flex-end',
// //     backgroundColor: '#dcf8c6',
// //   },
// //   botMessage: {
// //     alignSelf: 'flex-start',
// //     backgroundColor: '#f1f0f0',
// //   },
// //   messageText: {
// //     fontSize: 16,
// //   },
// //   inputContainer: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     padding: 10,
// //     borderTopWidth: 1,
// //     borderTopColor: '#ccc',
// //   },
// //   input: {
// //     flex: 1,
// //     borderColor: '#ccc',
// //     borderWidth: 1,
// //     borderRadius: 20,
// //     paddingHorizontal: 10,
// //     marginRight: 10,
// //   },
// // });

// // export default ScheduleScreen;
// import React, { useState } from 'react';
// import { View, Text, TextInput, Button, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
// import { sendMessage } from '../services/api';

// const ScheduleScreen = () => {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');

//   const handleSendMessage = async () => {
//     if (input.trim().length === 0) return;

//     const userMessage = { sender: 'user', text: input };
//     setMessages((prevMessages) => [...prevMessages, userMessage]);
//     setInput('');

//     try {
//       const responseMessage = await sendMessage(input);
//       const botMessage = { sender: 'bot', text: responseMessage };
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
//         <Button title="Send" onPress={handleSendMessage} />
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

// export default ScheduleScreen;
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, SafeAreaView } from 'react-native';
import { sendMessage } from '../services/api';

const ScheduleScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSendMessage = async () => {
    if (input.trim().length === 0) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');

    try {
      const responseMessage = await sendMessage(input);
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Client Dashboard</Text>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => navigation.navigate('ClientList')}>
            <Text style={styles.navLink}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ScheduleAppointment')}>
            <Text style={styles.navLink}>Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.navLink}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.navLink}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <Text style={styles.title}>Schedule Appointment</Text>
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
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 Client Dashboard. All rights reserved.</Text>
        <View style={styles.footerNav}>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#333',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  nav: {
    flexDirection: 'row',
  },
  navLink: {
    color: '#fff',
    marginLeft: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  footer: {
    backgroundColor: '#333',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
  },
  footerNav: {
    flexDirection: 'row',
  },
  footerLink: {
    color: '#fff',
    marginLeft: 16,
  },
});

export default ScheduleScreen;
