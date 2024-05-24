// frontend/src/screens/HomeScreen.js
import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { sendFollowUpMessages } from '../services/api';
import SampleComponent from '../components/SampleComponent';

const HomeScreen = () => {
  const handleSendMessages = async () => {
    try {
      await sendFollowUpMessages();
      Alert.alert('Success', 'Messages sent successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to send messages');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barbershop Follow-Up</Text>
      <SampleComponent />
      <Button title="Send Follow-Up Messages" onPress={handleSendMessages} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default HomeScreen;
