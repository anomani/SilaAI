import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { getAllMessagesGroupedByClient, getClientById } from '../services/api';
import Footer from '../components/Footer'; 

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
      fetchClientNames(Object.keys(data));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchClientNames = async (clientIds) => {
    const namePromises = clientIds.map(async (clientId) => {
      const client = await getClientById(clientId);
      return [clientId, `${client.firstname} ${client.lastname}`];
    });

    const namesArray = await Promise.all(namePromises);
    const names = Object.fromEntries(namesArray);
    setClientNames(names);
  };

  const parseDate = (dateString) => {
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [time, period] = timePart.split(' ');
    const [hours, minutes, seconds] = time.split(':');
    
    let adjustedHours = parseInt(hours, 10);
    if (period === 'PM' && adjustedHours !== 12) {
      adjustedHours += 12;
    } else if (period === 'AM' && adjustedHours === 12) {
      adjustedHours = 0;
    }

    return new Date(year, month - 1, day, adjustedHours, minutes, seconds);
  };

  const filteredClients = Object.keys(groupedMessages)
    .filter(clientid =>
      clientNames[clientid]?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const lastMessageA = groupedMessages[a][groupedMessages[a].length - 1];
      const lastMessageB = groupedMessages[b][groupedMessages[b].length - 1];
      const dateA = parseDate(lastMessageA.date);
      const dateB = parseDate(lastMessageB.date);
      return dateB - dateA;
    });

  const renderClient = ({ item: clientid }) => {
    const messages = groupedMessages[clientid];
    const lastMessage = messages[messages.length - 1];
    const avatar = lastMessage.from === '18446480598' ? require('../../assets/uzi.png') : require('../../assets/avatar.png');
    const senderName = lastMessage.from === '18446480598' ? 'UZI' : clientNames[clientid];
    const unreadMessagesCount = messages.filter(message => !message.read).length;

    // Parse the date string and adjust by 4 hours
    const [datePart, timePart] = lastMessage.date.split(', ');
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
    }

    const adjustedDate = `${month}/${day}/${year}, ${adjustedHours.toString().padStart(2, '0')}:${minutes} ${adjustedPeriod}`;

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ClientMessages', { clientid, clientName: clientNames[clientid] })}>
        <View style={styles.clientContainer}>
          <Image source={avatar} style={styles.avatar} />
          <View style={styles.clientContent}>
            <Text style={styles.clientName}>{senderName}</Text>
            <Text style={styles.messageTime}>{adjustedDate}</Text>
          </View>
          {unreadMessagesCount > 0 && (
            <View style={styles.unreadCountContainer}>
              <Text style={styles.unreadCountText}>{unreadMessagesCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.messageText}>{lastMessage.body}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.settingsIcon}></Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#9da6b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={fetchMessages} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item}
        style={styles.flatList}
      />
      <Footer navigation={navigation} /> 
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
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#111318',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#292e38',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  refreshButton: {
    padding: 8,
  },
  refreshIcon: {
    color: 'white',
    fontSize: 24,
  },
  settingsIcon: {
    color: 'white',
    fontSize: 24,
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
    paddingBottom: 8
  },
  unreadCountContainer: {
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  flatList: {
    flex: 1,
  },
});

export default ChatDashboard;