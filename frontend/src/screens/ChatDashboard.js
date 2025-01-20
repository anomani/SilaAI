import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image, Pressable, Alert } from 'react-native';
import { getMostRecentMessagePerClient, getClientById, sendMessage, clearSuggestedResponse } from '../services/api';
import Footer from '../components/Footer'; 
import { useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ChatDashboard = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState({ recentMessages: [], clientNames: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const isFocused = useIsFocused();
  const prevDataRef = useRef(null);
  const [activeTab, setActiveTab] = useState('all');
  const [disabledButtons, setDisabledButtons] = useState(new Set());

  const handleBackPress = () => {
    navigation.goBack();
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const recentMessages = await getMostRecentMessagePerClient();
      
      const clientNamesPromises = recentMessages.map(async (message) => {
        const client = await getClientById(message.clientid);
        return [message.clientid, `${client.firstname} ${client.lastname}`];
      });

      const clientNamesArray = await Promise.all(clientNamesPromises);
      const clientNames = Object.fromEntries(clientNamesArray);

      const newData = { recentMessages, clientNames };
      setDashboardData(newData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(); // Fetch data immediately when component mounts

    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 5000); // Fetch data every 5 seconds

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);

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

  const formatTimestamp = (dateString) => {
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [time, period] = timePart.split(' ');
    const [hours, minutes] = time.split(':');

    let adjustedHours = parseInt(hours, 10);
    let adjustedPeriod = period;

    if (adjustedHours < 0) {
      adjustedHours += 12;
      adjustedPeriod = period === 'AM' ? 'PM' : 'AM';
    } else if (adjustedHours === 0) {
      adjustedHours = 12;
    } else if (adjustedHours > 12) {
      adjustedHours -= 12;
      adjustedPeriod = 'PM';
    }

    return `${month}/${day}/${year}, ${adjustedHours}:${minutes} ${adjustedPeriod}`;
  };

  const TabSelector = () => (
    <View style={styles.tabContainer}>
      <Pressable
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => setActiveTab('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Messages</Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
        onPress={() => setActiveTab('pending')}
      >
        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
      </Pressable>
    </View>
  );

  const filteredClients = React.useMemo(() => {
    let filtered = dashboardData.recentMessages
      .filter(message =>
        dashboardData.clientNames[message.clientid]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    if (activeTab === 'pending') {
      filtered = filtered.filter(message => message.hasSuggestedResponse);
    }

    return filtered.sort((a, b) => {
      // Handle cases where there might not be a date (for clients with only suggested responses)
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB - dateA;
    });
  }, [dashboardData, searchQuery, activeTab]);

  const handleAcceptSuggestedResponse = async (clientId, suggestedResponse) => {
    // Immediately disable the button
    setDisabledButtons(prev => new Set([...prev, clientId]));
    
    try {
      console.log("Accepting suggested response for client:", clientId);
      console.log("Suggested response:", suggestedResponse);
      
      if (!suggestedResponse) {
        console.error("Suggested response is empty or undefined");
        Alert.alert('Error', 'No suggested response available.');
        setDisabledButtons(prev => {
          const next = new Set(prev);
          next.delete(clientId);
          return next;
        });
        return;
      }

      // Fetch the client's details to get the phone number
      const client = await getClientById(clientId);
      const phoneNumber = client.phonenumber;

      if (!phoneNumber) {
        console.error("Client phone number is missing");
        Alert.alert('Error', 'Client phone number is missing.');
        setDisabledButtons(prev => {
          const next = new Set(prev);
          next.delete(clientId);
          return next;
        });
        return;
      }

      console.log("Sending message to:", phoneNumber);
      await sendMessage(phoneNumber, suggestedResponse, false, false);
      
      console.log("Clearing suggested response");
      await clearSuggestedResponse(clientId);
      
      console.log('Successfully accepted suggested response for client:', clientId);
      fetchDashboardData();
    } catch (error) {
      console.error('Error accepting suggested response:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert('Error', `Failed to accept suggested response. ${error.message}`);
    } finally {
      // Re-enable the button regardless of success or failure
      setDisabledButtons(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  const handleRejectSuggestedResponse = async (clientId) => {
    try {
      await clearSuggestedResponse(clientId);
      console.log('Rejected suggested response for client:', clientId);
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting suggested response:', error);
      Alert.alert('Error', 'Failed to reject suggested response. Please try again.');
    }
  };

  const renderClient = useCallback(({ item: message }) => {
    const avatar = message.fromText === '+18446480598' ? require('../../assets/uzi.png') : require('../../assets/avatar.png');
    let senderName = message.fromText === '+18446480598' ? 'UZI' : dashboardData.clientNames[message.clientid];
    // If senderName is empty, use the client's phone number
    if (senderName === ' ') {
      if (message.fromtext === '+18446480598') {
        senderName = message.totext;
      } else {
        senderName = message.fromtext;
      }
    }
    
    let displayMessage, displayDate, clientMessage;

    if (message.hasSuggestedResponse) {
      // Show both the client's message and the suggested response
      displayMessage = message.suggestedresponse;
      clientMessage = message.body; // This will be the client's last message
      displayDate = null;
    } else {
      displayMessage = message.body;
      displayDate = message.date ? formatTimestamp(message.date) : null;
    }

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ClientMessages', { clientid: message.clientid, clientName: dashboardData.clientNames[message.clientid] })}>
        <View style={styles.clientContainer}>
          <Image source={avatar} style={styles.avatar} />
          <View style={styles.clientContent}>
            <Text style={styles.clientName}>{senderName}</Text>
            {displayDate && <Text style={styles.messageTime}>{displayDate}</Text>}
          </View>
          {message.hasSuggestedResponse && (
            <View style={styles.suggestedResponseActions}>
              <TouchableOpacity
                style={[styles.actionButton, disabledButtons.has(message.clientid) && styles.disabledButton]}
                onPress={(event) => {
                  event.stopPropagation();
                  if (!disabledButtons.has(message.clientid)) {
                    handleAcceptSuggestedResponse(message.clientid, message.suggestedresponse);
                  }
                }}
                disabled={disabledButtons.has(message.clientid)}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={disabledButtons.has(message.clientid) ? "#808080" : "#4CAF50"} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(event) => {
                  event.stopPropagation();
                  handleRejectSuggestedResponse(message.clientid);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {clientMessage && (
          <Text 
            style={styles.clientMessageText}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {senderName}: {clientMessage}
          </Text>
        )}
        {displayMessage && (
          <Text 
            style={[styles.messageText, message.hasSuggestedResponse && styles.suggestedResponseText]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {message.hasSuggestedResponse ? "Suggested: " : ""}
            {displayMessage}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [dashboardData, navigation, disabledButtons]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

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
      <TabSelector />
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id === -1 ? `sr_${item.clientid}` : item.id.toString()}
        style={styles.flatList}
        extraData={dashboardData}
        ListEmptyComponent={() => (
          activeTab === 'pending' && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No Pending Messages</Text>
            </View>
          )
        )}
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
    paddingTop: 4,
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
  suggestedResponseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ffffff',
  },
  tabText: {
    color: '#9da6b8',
    fontSize: 14,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  suggestedResponseText: {
    fontStyle: 'italic',
    color: '#4CAF50', // Green color for suggested responses
  },
  clientMessageText: {
    color: '#E0E0E0', // Changed to a lighter white/gray color
    fontSize: 16,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyStateText: {
    color: '#9da6b8',
    fontSize: 16,
    fontStyle: 'italic',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default ChatDashboard;