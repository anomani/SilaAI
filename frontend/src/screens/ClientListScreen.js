import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Button, SafeAreaView, Keyboard } from 'react-native';
import { getClients } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Footer from '../components/Footer'; // Import Footer component

const ClientListScreen = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const navigation = useNavigation();

  const fetchClients = useCallback(async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      // Optionally, you could show an error message to the user here
    }
  }, []);

  // Use useFocusEffect to refresh the client list when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [fetchClients])
  );

  const filteredClients = clients.filter(client =>
    `${client.firstname} ${client.lastname}`.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ClientDetails', { client: item })}>
      <View style={styles.item}>
        <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
        <Text style={styles.details}>{item.phonenumber} | {item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleSearchSubmit = () => {
    // Dismiss the keyboard
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search"
            placeholderTextColor="white"
            value={search}
            onChangeText={setSearch}
            returnKeyType="done"
            onSubmitEditing={handleSearchSubmit}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddClient')}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchClients}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredClients}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      </View>
      <Footer navigation={navigation} /> 
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1c1c1e' },
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e', paddingTop: 0 }, // Add paddingTop
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchBar: { flex: 1, padding: 10, backgroundColor: '#333', borderRadius: 5, color: 'white', marginRight: 10 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  name: { fontSize: 18, color: 'white' },
  details: { fontSize: 14, color: '#aaa' },
  addButton: { marginRight: 10 },
  refreshButton: { marginRight: 10 },
  followUpButton: { marginRight: 10 },
  chatButton: { marginRight: 10 },
});

export default ClientListScreen;