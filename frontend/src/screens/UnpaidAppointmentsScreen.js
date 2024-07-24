import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getUnpaidAppointments } from '../services/api'; // You'll need to create this API function

const UnpaidAppointmentsScreen = () => {
  const [unpaidAppointments, setUnpaidAppointments] = useState([]);

  useEffect(() => {
    fetchUnpaidAppointments();
  }, []);

  const fetchUnpaidAppointments = async () => {
    try {
      const appointments = await getUnpaidAppointments();
      setUnpaidAppointments(appointments);
    } catch (error) {
      console.error('Error fetching unpaid appointments:', error);
    }
  };

  const renderAppointment = ({ item }) => (
    <View style={styles.appointmentItem}>
      <Text>Date: {item.date}</Text>
      <Text>Time: {item.startTime} - {item.endTime}</Text>
      <Text>Client: {item.clientName}</Text>
      <Text>Price: ${item.price}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unpaid Appointments</Text>
      <FlatList
        data={unpaidAppointments}
        renderItem={renderAppointment}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  appointmentItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
});

export default UnpaidAppointmentsScreen;