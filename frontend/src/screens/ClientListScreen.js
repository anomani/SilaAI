// frontend/src/screens/ClientListScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert, SafeAreaView } from 'react-native';
import Checkbox from 'expo-checkbox';
import { getClients, sendFollowUpMessages } from '../services/api';

const ClientListScreen = () => {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(response);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const toggleClientSelection = (client) => {
    setSelectedClients((prevSelectedClients) => {
      if (prevSelectedClients.includes(client)) {
        return prevSelectedClients.filter((c) => c !== client);
      } else {
        return [...prevSelectedClients, client];
      }
    });
  };

  const handleSendMessages = async () => {
    try {
      await sendFollowUpMessages(selectedClients);
      Alert.alert('Success', 'Messages sent successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to send messages');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.checkboxCell}>
        <Checkbox
          value={selectedClients.includes(item)}
          onValueChange={() => toggleClientSelection(item)}
        />
      </View>
      <Text style={styles.cell}>{`${item["First Name"]} ${item["Last Name"]}`}</Text>
      <Text style={styles.cell}>{item.Phone}</Text>
      <Text style={styles.cell}>{item["Days Since Last Appointment"]}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Manage Clients</Text>
        <View style={styles.tableHeader}>
          <View style={styles.checkboxCell}></View>
          <Text style={styles.headerCell}>Name</Text>
          <Text style={styles.headerCell}>Phone</Text>
          <Text style={styles.headerCell}>Days Since Last Appointment</Text>
        </View>
        <FlatList
          data={clients}
          renderItem={renderItem}
          keyExtractor={(item) => item.Email} // Using email as the unique key
          contentContainerStyle={styles.listContent}
        />
        <Button title="Send Follow-Up Messages" onPress={handleSendMessages} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  checkboxCell: {
    width: 40, // Adjust width as needed
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
  },
});

export default ClientListScreen;
