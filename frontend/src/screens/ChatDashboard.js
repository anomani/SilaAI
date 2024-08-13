import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { getAllMessagesGroupedByClient, getClientById } from '../services/api';
import Footer from '../components/Footer'; 
import { useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native'; // Add this import

const ChatDashboard = ({ navigation }) => {
  const [groupedMessages, setGroupedMessages] = useState({});
  const [clientNames, setClientNames] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [polling, setPolling] = useState(null);
  const isFocused = useIsFocused();
  const [lastUpdated, setLastUpdated] = useState(null);

  const handleBackPress = () => {
    navigation.goBack();
  };

  useEffect(() => {
    if (isFocused) {
      fetchMessages();
      
      // Start polling when the screen is focused
      const pollInterval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
      setPolling(pollInterval);
    } else {
      // Stop polling when the screen is not focused
      if (polling) {
        clearInterval(polling);
        setPolling(null);
      }
    }

    return () => {
      if (polling) {
        clearInterval(polling);
      }
    };
  }, [isFocused]);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getAllMessagesGroupedByClient();
      setGroupedMessages(prevMessages => {
        // Update lastUpdated time on every poll
        setLastUpdated(new Date());
        
        // Only update messages if there are changes
        if (JSON.stringify(prevMessages) !== JSON.stringify(data)) {
          fetchClientNames(Object.keys(data));
          return data;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

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

  const handleRefresh = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.settingsIcon}></Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#9da6b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>⟳</Text>
        </TouchableOpacity>
      </View>
      {lastUpdated && (
        <Text style={styles.lastUpdatedText}>
          Last updated: {format(lastUpdated, 'hh:mm:ss a')}
        </Text>
      )}
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
    paddingBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#292e38',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginHorizontal: 10,
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
  backButton: {
    padding: 8,
  },
  backIcon: {
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
  lastUpdatedText: {
    color: '#9da6b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: -4,
  },
});

export default React.memo(ChatDashboard);