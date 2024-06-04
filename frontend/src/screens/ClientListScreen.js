import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { getClients } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const ClientListScreen = ({ navigation }) => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');

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
        <Text style={styles.details}>{item.number} | {item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search"
        placeholderTextColor="white"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredClients}
        renderItem={renderItem}
        keyExtractor={item => item._id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e' },
  searchBar: { padding: 10, backgroundColor: '#333', borderRadius: 5, color: 'white', marginBottom: 10 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  name: { fontSize: 18, color: 'white' },
  details: { fontSize: 14, color: '#aaa' },
});

export default ClientListScreen;
