import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { deleteAppointment, rescheduleAppointment, getClientById } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';

const AppointmentDetailsScreen = ({ route, navigation }) => {
  const { appointment } = route.params;
  console.log(appointment.id)
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const fetchClientName = async () => {
      try {
        const clientDetails = await getClientById(appointment.clientid);
        setClientName(`${clientDetails.firstname} ${clientDetails.lastname}`);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch client details');
      }
    };

    fetchClientName();
  }, [appointment.clientid]);

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

  const formatTime = (time) => {
    return moment(time, 'HH:mm').format('h:mm A');
  };

  const formatDate = (date) => {
    return moment(date).format('MMMM D, YYYY');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Appointment Details</Text>
        <View style={styles.infoRow}>
          <Icon name="person" size={24} color="#007AFF" />
          <Text style={styles.label}>Client: <Text style={styles.value}>{clientName}</Text></Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="event" size={24} color="#007AFF" />
          <Text style={styles.label}>Date: <Text style={styles.value}>{formatDate(appointment.date)}</Text></Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="access-time" size={24} color="#007AFF" />
          <Text style={styles.label}>Time: <Text style={styles.value}>{formatTime(appointment.starttime)} - {formatTime(appointment.endtime)}</Text></Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="category" size={24} color="#007AFF" />
          <Text style={styles.label}>Type: <Text style={styles.value}>{appointment.appointmenttype}</Text></Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="attach-money" size={24} color="#007AFF" />
          <Text style={styles.label}>Price: <Text style={styles.value}>${appointment.price}</Text></Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="notes" size={24} color="#007AFF" />
          <Text style={styles.label}>Details: <Text style={styles.value}>{appointment.details}</Text></Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.rescheduleButton]} onPress={handleReschedule}>
          <Icon name="edit" size={24} color="#fff" />
          <Text style={styles.buttonText}>Reschedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
          <Icon name="delete" size={24} color="#fff" />
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1c1c1e', 
    paddingTop: 60 
  },
  card: { 
    backgroundColor: '#2c2c2e', 
    borderRadius: 15, 
    padding: 20, 
    margin: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  label: { 
    fontSize: 16, 
    color: '#8e8e93', 
    marginLeft: 10 
  },
  value: { 
    fontSize: 16, 
    color: '#fff', 
    fontWeight: '500' 
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginTop: 20, 
    marginBottom: 40 
  },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 8, 
    width: '40%' 
  },
  rescheduleButton: { 
    backgroundColor: '#007AFF' 
  },
  deleteButton: { 
    backgroundColor: '#FF3B30' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600', 
    marginLeft: 8 
  },
});

export default AppointmentDetailsScreen;