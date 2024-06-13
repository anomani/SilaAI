import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { getAllMessagesGroupedByClient, getClientById } from '../services/api';

const ChatDashboard = ({ navigation }) => {
  const [groupedMessages, setGroupedMessages] = useState({});
  const [clientNames, setClientNames] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const data = await getAllMessagesGroupedByClient();
      setGroupedMessages(data);
      fetchClientNames(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchClientNames = async (groupedMessages) => {
    const names = {};
    for (const clientId of Object.keys(groupedMessages)) {
      const client = await getClientById(clientId);
      names[clientId] = `${client.firstName} ${client.lastName}`;
    }
    setClientNames(names);
  };

  const filteredClients = Object.keys(groupedMessages).filter(clientId =>
    clientNames[clientId]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderClient = ({ item: clientId }) => {
    const messages = groupedMessages[clientId];
    const lastMessage = messages[messages.length - 1];
    const avatar = lastMessage.from === '18446480598' ? require('../../assets/uzi.png') : require('../../assets/avatar.png');
    const senderName = lastMessage.from === '18446480598' ? 'UZI' : clientNames[clientId];

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ClientMessages', { clientId })}>
        <View style={styles.clientContainer}>
          <Image source={avatar} style={styles.avatar} />
          <View style={styles.clientContent}>
            <Text style={styles.clientName}>{senderName}</Text>
            <Text style={styles.messageTime}>{lastMessage.date}</Text>
          </View>
        </View>
        <Text style={styles.messageText}>{lastMessage.body}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Client Chat</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={fetchMessages}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#9da6b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item}
      />
      <View style={styles.sendButtonContainer}>
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111318',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshIcon: {
    color: 'white',
    fontSize: 24,
    marginRight: 16,
  },
  settingsIcon: {
    color: 'white',
    fontSize: 24,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#292e38',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  clientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111318',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  clientContent: {
    flex: 1,
  },
  clientName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageTime: {
    color: '#9da6b8',
    fontSize: 12,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sendButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sendButton: {
    backgroundColor: '#195de6',
    borderRadius: 20,
    padding: 10,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 24,
  },
});

export default ChatDashboard;
