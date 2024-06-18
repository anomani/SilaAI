import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { deleteAppointment, rescheduleAppointment, getClientById } from '../services/api';

const AppointmentDetailsScreen = ({ route, navigation }) => {
  const { appointment } = route.params;
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const fetchClientName = async () => {
      try {
        const clientDetails = await getClientById(appointment.clientId);
        console.log(clientDetails)
        setClientName(`${clientDetails.firstName} ${clientDetails.lastName}`);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch client details');
      }
    };

    fetchClientName();
  }, [appointment.clientId]);

  const handleDelete = async () => {
    try {
      await deleteAppointment(appointment.id);
      Alert.alert('Success', 'Appointment deleted successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete appointment');
    }
  };

  const handleReschedule = () => {
    navigation.navigate('RescheduleAppointment', { appointment });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Client Name: {clientName}</Text>
      <Text style={styles.label}>Date: {appointment.date}</Text>
      <Text style={styles.label}>Time: {appointment.startTime} - {appointment.endTime}</Text>
      <Text style={styles.label}>Details: {appointment.details}</Text>
      <Button title="Reschedule" onPress={handleReschedule} />
      <Button title="Delete" onPress={handleDelete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e' },
  label: { fontSize: 18, color: '#fff', marginBottom: 10 },
});

export default AppointmentDetailsScreen;
