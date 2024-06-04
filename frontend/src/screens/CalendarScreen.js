import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { getAppointmentsByDay } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const CalendarScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchAppointments();
  }, [date]);

  const fetchAppointments = async () => {
    try {
      const estDate = new Date(date);
      estDate.setHours(estDate.getHours() - 4); // Convert to EST
      const year = estDate.getFullYear();
      const month = String(estDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
      const day = String(estDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const response = await getAppointmentsByDay(formattedDate);
      const adjustedAppointments = response.map(appointment => ({
        ...appointment,
        startTime: convertTo12HourFormat(appointment.startTime),
        endTime: convertTo12HourFormat(appointment.endTime)
      }));
      setAppointments(adjustedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const convertTo12HourFormat = (time) => {
    const [hours, minutes] = time.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes} ${period}`;
  };

  const formatDate = (date) => {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatDay = (date) => {
    const options = { weekday: 'short' };
    return date.toLocaleDateString('en-US', options).toUpperCase();
  };

  const changeDate = (days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => navigation.navigate('AppointmentDetails', { appointment: item })}
    >
      <Ionicons name={item.icon} size={24} color="white" style={styles.icon} />
      <View style={styles.itemText}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.time}>{item.startTime} - {item.endTime}</Text>
      </View>
      <Text style={styles.type}>{item.appointmentType}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerDay}>{formatDay(date)}</Text>
        <View style={styles.headerDateContainer}>
          <Text style={styles.headerDate}>{formatDate(date)}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddAppointment')}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={appointments}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
      />
      <View style={styles.navigation}>
        <TouchableOpacity style={styles.navButton} onPress={() => changeDate(-1)}>
          <Text style={styles.navButtonText}>Previous Day</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToToday}>
          <Text style={styles.navButtonText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => changeDate(1)}>
          <Text style={styles.navButtonText}>Next Day</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Homepage')}>
          <Ionicons name="home" size={24} color="#fff" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('ClientList')}>
          <Ionicons name="people" size={24} color="#fff" />
          <Text style={styles.footerText}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Calendar')}>
          <Ionicons name="calendar" size={24} color="#fff" />
          <Text style={styles.footerText}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings" size={24} color="#fff" />
          <Text style={styles.footerText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#1c1c1e' },
  header: { alignItems: 'center', marginBottom: 20 },
  headerDay: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  headerDateContainer: { backgroundColor: '#007AFF', borderRadius: 50, padding: 10, marginTop: 5 },
  headerDate: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  icon: { marginRight: 10 },
  itemText: { flex: 1 },
  name: { fontSize: 18, color: 'white' },
  time: { fontSize: 14, color: '#aaa' },
  type: { fontSize: 14, color: '#aaa' },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  navButton: { padding: 10, backgroundColor: '#333', borderRadius: 5 },
  navButtonText: { color: 'white', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#333' },
  footerItem: { alignItems: 'center' },
  footerText: { color: '#fff', fontSize: 12, marginTop: 4 },
  addButton: { position: 'absolute', top: 10, right: 10 },
});

export default CalendarScreen;
