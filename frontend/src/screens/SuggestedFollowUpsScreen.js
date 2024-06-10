import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { getSuggestedFollowUps } from '../services/api';

const SuggestedFollowUpsScreen = () => {
  const [clients, setClients] = useState([]);
  const [days, setDays] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSuggestedFollowUps = async () => {
    setLoading(true);
    try {
      const data = await getSuggestedFollowUps(days);
      setClients(data.suggestedFollowUps); // Corrected to match the actual data structure
    } catch (error) {
      console.error('Error fetching suggested follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Follow Up</Text>
      <Text style={styles.label}>Last Appointment</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Number of days"
          value={days}
          onChangeText={setDays}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.enterButton} onPress={fetchSuggestedFollowUps}>
          <Text style={styles.enterButtonText}>Enter</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <>
          <Text style={styles.label}>Clients</Text>
          <FlatList
            data={clients}
            keyExtractor={(item) => item._id.toString()} // Ensure _id is a string
            renderItem={({ item }) => (
              <View style={styles.clientItem}>
                <Image source={{ uri: item.ProfileImage }} style={styles.profileImage} />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{item.firstName} {item.lastName}</Text>
                  <Text style={styles.clientVisit}>last visit: {item.daysSinceLastAppointment} days ago</Text>
                </View>
                <TouchableOpacity style={styles.checkbox} />
              </View>
            )}
          />
        </>
      )}
      <Text style={styles.label}>Message</Text>
      <TextInput
        style={styles.messageInput}
        placeholder="Type a message..."
        value={message}
        onChangeText={setMessage}
      />
      <TouchableOpacity style={styles.sendButton}>
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    color: '#fff',
    backgroundColor: '#2c2c2e',
  },
  enterButton: {
    marginLeft: 8,
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    color: '#fff',
  },
  clientVisit: {
    fontSize: 14,
    color: '#ccc',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  messageInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
    color: '#fff',
    backgroundColor: '#2c2c2e',
  },
  sendButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SuggestedFollowUpsScreen;
