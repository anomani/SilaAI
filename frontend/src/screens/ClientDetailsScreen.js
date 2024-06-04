import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ClientDetailsScreen = ({ route, navigation }) => {
  const { client } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{client.firstName} {client.lastName}</Text>
      <Text style={styles.details}>Phone: {client.number}</Text>
      <Text style={styles.details}>Email: {client.email}</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('EditClient', { client })}>
        <Text style={styles.buttonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ClientAppointments', { clientId: client._id })}>
        <Text style={styles.buttonText}>View Appointments</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => deleteClient(client._id)}>
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e' },
  name: { fontSize: 24, color: 'white', marginBottom: 10 },
  details: { fontSize: 18, color: '#aaa', marginBottom: 10 },
  button: { padding: 10, backgroundColor: '#007AFF', borderRadius: 5, marginBottom: 10 },
  buttonText: { color: 'white', textAlign: 'center' },
});

export default ClientDetailsScreen;
