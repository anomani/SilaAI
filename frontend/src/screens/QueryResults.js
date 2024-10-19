import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity, TextInput, SafeAreaView, ScrollView } from 'react-native';
import { getCustomList } from '../services/api';
import Checkbox from 'expo-checkbox';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const QueryResults = ({ route }) => {
  const navigation = useNavigation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClients, setSelectedClients] = useState([]);
  const [search, setSearch] = useState('');
  const { id } = route.params;

  useEffect(() => {
    fetchQueryResults();
  }, [id]);

  const fetchQueryResults = async () => {
    setLoading(true);
    try {
      console.log(id)
      const cleanId = id.replace(/[()]/g, '');
      const data = await getCustomList(cleanId);
      setClients(data);
    } catch (error) {
      console.error('Error fetching query results:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prevSelected => 
      prevSelected.includes(clientId)
        ? prevSelected.filter(id => id !== clientId)
        : [...prevSelected, clientId]
    );
  };

  const handleInitiateConversation = () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }
    navigation.navigate('InitiateConversation', {
      selectedClients,
      clientCount: selectedClients.length,
    });
  };

  const selectAllClients = () => {
    setSelectedClients(clients.map(client => client.id));
  };

  const deselectAllClients = () => {
    setSelectedClients([]);
  };

  const filteredClients = clients.filter(client =>
    `${client.firstname} ${client.lastname}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleClientPress = (client) => {
    navigation.navigate('ClientDetails', { client });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Custom List</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <>
            <View style={styles.header}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search"
                placeholderTextColor="white"
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity style={styles.refreshButton} onPress={fetchQueryResults}>
                <Ionicons name="refresh" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.selectionControls}>
              <TouchableOpacity style={styles.selectionButton} onPress={selectAllClients}>
                <Text style={styles.selectionButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.selectionButton} onPress={deselectAllClients}>
                <Text style={styles.selectionButtonText}>Deselect All</Text>
              </TouchableOpacity>
              <Text style={styles.selectedCount}>{selectedClients.length} selected</Text>
            </View>
            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleClientPress(item)}>
                  <View style={styles.clientItem}>
                    <Checkbox
                      value={selectedClients.includes(item.id)}
                      onValueChange={() => toggleClientSelection(item.id)}
                      style={styles.checkbox}
                      color={selectedClients.includes(item.id) ? '#007bff' : undefined}
                    />
                    <Image source={{ uri: item.ProfileImage }} style={styles.profileImage} />
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{item.firstname} {item.lastname}</Text>
                      <Text style={styles.clientPhone}>{item.phonenumber}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.initiateButton} onPress={handleInitiateConversation}>
              <Text style={styles.initiateButtonText}>Initiate Conversation with Selected Clients</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
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
  clientPhone: {
    fontSize: 14,
    color: '#ccc',
  },
  checkbox: {
    marginRight: 8,
  },
  initiateButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  initiateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectionButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 4,
  },
  selectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedCount: {
    color: '#fff',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    color: 'white',
    marginRight: 10,
  },
  refreshButton: {
    marginLeft: 10,
  },
});

export default QueryResults;