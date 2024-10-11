import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { login } from '../services/api';
import { storeToken } from '../utils/auth';

const Login = ({ route, navigation }) => {
  const { handleLogin } = route.params;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginPress = async () => {
    try {
      const response = await login(email, password);
      await storeToken(response.token);
      console.log('Login successful', response);
      handleLogin(); // Call the handleLogin function passed from App.tsx
    } catch (error) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleLoginPress}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.secondaryButtonText}>Register</Text>
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

export default Login;