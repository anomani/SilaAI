import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { addClient } from '../services/api';

const AddClientScreen = ({ navigation }) => {
  const [client, setClient] = useState({ firstname: '', lastname: '', phonenumber: '', email: '' });
  
  const handleInputChange = (field, value) => {
    setClient({ ...client, [field]: value });
  };

  const handleAddClient = async () => {
    try {
      const newClient = await addClient(client);
      console.log('New client added:', newClient);
      navigation.goBack();
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>First Name</Text>
      <TextInput style={styles.input} value={client.firstname} onChangeText={(value) => handleInputChange('firstname', value)} />
      <Text style={styles.label}>Last Name</Text>
      <TextInput style={styles.input} value={client.lastname} onChangeText={(value) => handleInputChange('lastname', value)} />
      <Text style={styles.label}>Phone Number</Text>
      <TextInput style={styles.input} value={client.phonenumber} onChangeText={(value) => handleInputChange('phonenumber', value)} />
      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={client.email} onChangeText={(value) => handleInputChange('email', value)} />
      <Button title="Add Client" onPress={handleAddClient} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e' },
  label: { fontSize: 16, marginVertical: 8, color: '#fff' },
  input: { borderWidth: 1, borderColor: '#444', padding: 8, marginVertical: 8, borderRadius: 8, backgroundColor: '#2c2c2e', color: '#fff' }
});

export default AddClientScreen;
