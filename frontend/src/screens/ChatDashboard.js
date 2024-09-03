import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { getMostRecentMessagePerClient, getClientById } from '../services/api';
import Footer from '../components/Footer'; 
import { useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

const ChatDashboard = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState({ recentMessages: [], clientNames: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const isFocused = useIsFocused();
  // Remove this line:
  // const updateCount = useRef(0);
  const prevDataRef = useRef(null);

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
      setLastUpdated(new Date());
      // Remove this line:
      // updateCount.current += 1;

      // Remove this line:
      // console.log('Update count:', updateCount.current);
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

  const filteredClients = React.useMemo(() => {
    return dashboardData.recentMessages
      .filter(message =>
        dashboardData.clientNames[message.clientid]?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
      });
  }, [dashboardData, searchQuery]);

  const renderClient = useCallback(({ item: message }) => {
    const avatar = message.fromText === '+18446480598' ? require('../../assets/uzi.png') : require('../../assets/avatar.png');
    const isUzi = message.fromText === '+18446480598';
    
    // Determine the display name
    let displayName;
    if (isUzi) {
      displayName = 'UZI';
    } else {
      const clientName = dashboardData.clientNames[message.clientid];
      displayName = clientName.trim() ? clientName : message.fromText;
    }

    const formattedDateTime = formatTimestamp(message.date);

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ClientMessages', { clientid: message.clientid, clientName: displayName })}>
        <View style={styles.clientContainer}>
          <Image source={avatar} style={styles.avatar} />
          <View style={styles.clientContent}>
            <Text style={styles.clientName}>{displayName}</Text>
            <Text style={styles.messageTime}>{formattedDateTime}</Text>
          </View>
          {message.hasSuggestedResponse && (
            <View style={styles.suggestedResponseContainer}>
              <Text style={styles.suggestedResponseText}>Pending confirmation</Text>
            </View>
          )}
        </View>
        <Text style={styles.messageText}>{message.body}</Text>
      </TouchableOpacity>
    );
  }, [dashboardData, navigation]);

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
      {lastUpdated && (
        <Text style={styles.lastUpdatedText}>
          Last updated: {format(lastUpdated, 'hh:mm:ss a')}
        </Text>
      )}
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id.toString()}
        style={styles.flatList}
        extraData={dashboardData}
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
  suggestedResponseContainer: {
    backgroundColor: '#292e38',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  suggestedResponseText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatDashboard;