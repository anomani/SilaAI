import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { getAppointmentsByClientId, deleteClient, getDaysSinceLastAppointment } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const ClientDetailsScreen = ({ route, navigation }) => {
  const { client } = route.params;
  const [appointments, setAppointments] = useState([]);
  const [groupedAppointments, setGroupedAppointments] = useState({});
  const [daysSinceLastAppointment, setDaysSinceLastAppointment] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchDaysSinceLastAppointment();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await getAppointmentsByClientId(client.id);
      const grouped = groupAppointmentsByDate(response);
      setAppointments(response);
      setGroupedAppointments(grouped);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchDaysSinceLastAppointment = async () => {
    try {
      const response = await getDaysSinceLastAppointment(client.id);
      setDaysSinceLastAppointment(response.daysSinceLastAppointment);
    } catch (error) {
      console.error('Error fetching days since last appointment:', error);
    }
  };

  const convertToEST = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours()); // Convert to EST
    date.setDate(date.getDate() + 1);
    return date;
  };

  const formatDate = (dateString) => {
    const date = convertToEST(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const convertTo12HourFormat = (time) => {
    const [hours, minutes] = time.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes} ${period}`;
  };

  const formatTime = (dateString, timeString) => {
    const dateTimeString = `${dateString}T${timeString}:00`;
    const date = convertToEST(dateTimeString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return convertTo12HourFormat(`${hours}:${minutes}`);
  };

  const groupAppointmentsByDate = (appointments) => {
    return appointments.reduce((acc, appointment) => {
      const date = appointment.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(appointment);
      return acc;
    }, {});
  };

  const renderAppointment = ({ item }) => (
    <View style={styles.appointmentItem}>
      <Text style={styles.appointmentType}>{item.appointmenttype}</Text>
      <Text style={styles.appointmentTime}>{formatTime(item.date, item.starttime)} - {formatTime(item.date, item.endtime)}</Text>
    </View>
  );

  const renderDateSection = ({ item }) => (
    <View>
      <Text style={styles.dateHeader}>{formatDate(item.date)}</Text>
      <FlatList
        data={item.appointments}
        renderItem={renderAppointment}
        keyExtractor={(appointment) => appointment.id}
      />
    </View>
  );

  const groupedData = Object.keys(groupedAppointments).map(date => ({
    date,
    appointments: groupedAppointments[date]
  }));

  const deleteClientHandler = async (clientId) => {
    try {
      await deleteClient(clientId);
      navigation.goBack(); // Navigate back after deletion
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const confirmDeleteClient = (clientId) => {
    Alert.alert(
      "Delete Client",
      "Are you sure you want to delete this client?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => deleteClientHandler(clientId),
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{client.firstname} {client.lastname}</Text>
      <Text style={styles.details}>Phone: {client.phonenumber}</Text>
      <Text style={styles.details}>Email: {client.email}</Text>
      <Text style={styles.details}>Days since last appointment: {daysSinceLastAppointment}</Text>
      <Text style={styles.details}>Notes: {client.notes}</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('EditClient', { clientId: client.id })}>
        <Text style={styles.buttonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => confirmDeleteClient(client.id)}>
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
      <FlatList
        data={groupedData}
        renderItem={renderDateSection}
        keyExtractor={(item) => item.date}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e', paddingTop: 70 }, // Add paddingTop
  name: { fontSize: 24, color: 'white', marginBottom: 10 },
  details: { fontSize: 18, color: '#aaa', marginBottom: 10 },
  button: { padding: 10, backgroundColor: '#007AFF', borderRadius: 5, marginBottom: 10 },
  buttonText: { color: 'white', textAlign: 'center' },
  appointmentItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  appointmentType: { fontSize: 18, color: 'white' },
  appointmentTime: { fontSize: 14, color: '#aaa' },
  dateHeader: { fontSize: 20, color: 'white', marginTop: 20, marginBottom: 10 }
});

export default ClientDetailsScreen;
