import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { updateClient, getClientById } from '../services/api';

const EditClientScreen = ({ route, navigation }) => {
  const { clientId } = route.params;
  const [client, setClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (clientId) {
      getClientById(clientId).then(data => setClient(data));
    }
  }, [clientId]);

  const handleChange = (name, value) => {
    setClient(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      await updateClient(clientId, client);
      navigation.goBack(); // Navigate back after updating
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={client.firstname}
        onChangeText={(value) => handleChange('firstname', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={client.lastname}
        onChangeText={(value) => handleChange('lastname', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={client.email}
        onChangeText={(value) => handleChange('email', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={client.phonenumber}
        onChangeText={(value) => handleChange('phonenumber', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Notes"
        value={client.notes}
        onChangeText={(value) => handleChange('notes', value)}
      />
      <Button title="Save" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e', paddingTop: 100 }, // Add paddingTop
  input: { backgroundColor: 'white', padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default EditClientScreen;
