import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { addClient } from '../services/api';

const AddClientScreen = ({ navigation }) => {
  const [client, setClient] = useState({ firstname: '', lastname: '', phonenumber: '', email: '' });
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [errors, setErrors] = useState({});
  
  const handleInputChange = (field, value) => {
    setClient({ ...client, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const formatPhoneNumber = (input) => {
    const cleaned = input.replace(/\D/g, '').slice(0, 10);
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += '(' + cleaned.slice(0, 3);
      if (cleaned.length > 3) {
        formatted += ')-' + cleaned.slice(3, 6);
        if (cleaned.length > 6) {
          formatted += '-' + cleaned.slice(6);
        }
      }
    }
    return formatted;
  };

  const handlePhoneNumberChange = (value) => {
    const formattedNumber = formatPhoneNumber(value);
    setFormattedPhoneNumber(formattedNumber);
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    handleInputChange('phonenumber', numericValue);
  };

  const validateForm = () => {
    let newErrors = {};
    if (!client.firstname.trim()) newErrors.firstname = 'First name is required';
    if (!client.lastname.trim()) newErrors.lastname = 'Last name is required';
    if (client.phonenumber.length !== 10) newErrors.phonenumber = 'Phone number must be 10 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddClient = async () => {
    if (validateForm()) {
      try {
        const newClient = await addClient(client);
        console.log('New client added:', newClient);
        navigation.goBack();
      } catch (error) {
        console.error('Error adding client:', error);
        Alert.alert('Error', 'Failed to add client. Please try again.');
      }
    }
  };

  const handleSubmitEditing = (nextField) => {
    if (nextField) {
      nextField.focus();
    } else {
      handleAddClient();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>First Name *</Text>
      <TextInput
        style={[styles.input, errors.firstname && styles.inputError]}
        value={client.firstname}
        onChangeText={(value) => handleInputChange('firstname', value)}
        returnKeyType="next"
        onSubmitEditing={() => handleSubmitEditing(this.lastnameInput)}
      />
      {errors.firstname && <Text style={styles.errorText}>{errors.firstname}</Text>}
      
      <Text style={styles.label}>Last Name *</Text>
      <TextInput
        ref={(input) => { this.lastnameInput = input; }}
        style={[styles.input, errors.lastname && styles.inputError]}
        value={client.lastname}
        onChangeText={(value) => handleInputChange('lastname', value)}
        returnKeyType="next"
        onSubmitEditing={() => handleSubmitEditing(this.phonenumberInput)}
      />
      {errors.lastname && <Text style={styles.errorText}>{errors.lastname}</Text>}
      
      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        ref={(input) => { this.phonenumberInput = input; }}
        style={[styles.input, errors.phonenumber && styles.inputError]}
        value={formattedPhoneNumber}
        onChangeText={handlePhoneNumberChange}
        placeholder="(XXX)-XXX-XXXX"
        keyboardType="phone-pad"
        returnKeyType="next"
        onSubmitEditing={() => handleSubmitEditing(this.emailInput)}
      />
      {errors.phonenumber && <Text style={styles.errorText}>{errors.phonenumber}</Text>}
      
      <Text style={styles.label}>Email</Text>
      <TextInput
        ref={(input) => { this.emailInput = input; }}
        style={styles.input}
        value={client.email}
        onChangeText={(value) => handleInputChange('email', value)}
        returnKeyType="done"
        onSubmitEditing={() => handleSubmitEditing()}
      />
      <Button title="Add Client" onPress={handleAddClient} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60, backgroundColor: '#1c1c1e' },
  label: { fontSize: 16, marginVertical: 8, color: '#fff' },
  input: { borderWidth: 1, borderColor: '#444', padding: 8, marginVertical: 8, borderRadius: 8, backgroundColor: '#2c2c2e', color: '#fff' },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginBottom: 8 },
});

export default AddClientScreen;