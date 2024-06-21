import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Button, SafeAreaView } from 'react-native';
import { getClients } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Footer from '../components/Footer'; // Import Footer component

const ClientListScreen = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const data = await getClients();
    setClients(data);
  };

  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ClientDetails', { client: item })}>
      <View style={styles.item}>
        <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.details}>{item.phoneNumber} | {item.email}</Text>
      </View>
    </TouchableOpacity>
  );

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
          />
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddClient')}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchClients}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.followUpButton} onPress={() => navigation.navigate('SuggestedFollowUps')}>
            <Ionicons name="mail" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubbles" size={24} color="#007AFF" />
          </TouchableOpacity> */}
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
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e', paddingTop: 50 }, // Add paddingTop
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
