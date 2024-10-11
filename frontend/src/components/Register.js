import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { register } from '../services/api';

const Register = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      await register(username, password, email, phoneNumber);
      navigation.navigate('Login');
    } catch (error) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Register</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#999"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#333',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    color: '#fff',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#81b0ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#81b0ff',
  },
  secondaryButtonText: {
    color: '#81b0ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Register;