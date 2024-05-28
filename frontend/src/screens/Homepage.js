// frontend/src/screens/Homepage.js
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const Homepage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Appointment Management System</Text>
      <Button
        title="Manage Clients"
        onPress={() => navigation.navigate('ClientList')}
      />
      <Button
        title="Schedule Appointment"
        onPress={() => navigation.navigate('ScheduleAppointment')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default Homepage;
