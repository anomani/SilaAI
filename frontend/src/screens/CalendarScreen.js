import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { getAppointmentsByDay, getClientById } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import Swiper from 'react-native-swiper';

const CalendarScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');

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
      const adjustedAppointments = await Promise.all(response.map(async (appointment) => {
        const client = await getClientById(appointment.clientid); // Use 'clientid' instead of 'clientId'
        return {
          ...appointment,
          clientName: `${client.firstname} ${client.lastname}`,
          startTime: convertTo12HourFormat(appointment.starttime), // Use 'starttime' instead of 'startTime'
          endTime: convertTo12HourFormat(appointment.endtime) // Use 'endtime' instead of 'endTime'
        };
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

  const calculateDailyTotal = () => {
    if (!appointments || appointments.length === 0) {
      return '0.00';
    }
    return appointments.reduce((total, appointment) => total + (Number(appointment.price) || 0), 0).toFixed(2);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => navigation.navigate('AppointmentDetails', { appointment: item })}
    >
      <Ionicons name={item.icon} size={24} color="white" style={styles.icon} />
      <View style={styles.itemText}>
        <Text style={styles.name}>{item.clientName}</Text>
        <Text style={styles.time}>{item.startTime} - {item.endTime}</Text>
      </View>
      <Text style={styles.type}>{item.appointmenttype}</Text>
    </TouchableOpacity>
  );

  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'card' : 'list');
  };

  const renderClientCard = (appointment) => (
    <View style={styles.cardContainer}>
      <Image
        source={{ uri: appointment.clientImage || 'https://via.placeholder.com/150' }}
        style={styles.clientImage}
      />
      <Text style={styles.cardClientName}>{appointment.clientName}</Text>
      <Text style={styles.cardDate}>{formatDate(new Date(appointment.date))}</Text>
      <Text style={styles.cardTime}>{appointment.startTime} - {appointment.endTime}</Text>
      <Text style={styles.cardType}>{appointment.appointmenttype}</Text>
      <Text style={styles.cardPrice}>${appointment.price}</Text>
      <Text style={styles.cardNote}>{appointment.note || 'See the doctor from the comfort of your home'}</Text>
      <TouchableOpacity style={styles.addNoteButton} onPress={() => {/* Add note functionality */}}>
        <Text style={styles.addNoteButtonText}>Add note</Text>
      </TouchableOpacity>
    </View>
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
        <TouchableOpacity style={styles.refreshButton} onPress={fetchAppointments}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewToggleButton} onPress={toggleViewMode}>
          <Ionicons name={viewMode === 'list' ? 'card' : 'list'} size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {viewMode === 'list' ? (
        appointments.length > 0 ? (
          <FlatList
            data={appointments} 
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
          />
        ) : (
          <View style={styles.noAppointmentsContainer}>
            <Text style={styles.noAppointmentsText}>No appointments scheduled today</Text>
          </View>
        )
      ) : (
        <Swiper 
          style={styles.swiper}
          showsPagination={false}
          loop={false}
          showsButtons={true}
          nextButton={<Text style={styles.buttonText}>›</Text>}
          prevButton={<Text style={styles.buttonText}>‹</Text>}
        >
          {appointments.map((appointment) => (
            <View key={appointment.id.toString()}>
              {renderClientCard(appointment)}
            </View>
          ))}
        </Swiper>
      )}
      
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Daily Total: ${calculateDailyTotal()}</Text>
      </View>
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
      <Footer navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    paddingTop: 0, // Ensure no top padding
    backgroundColor: '#1c1c1e' 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 80, // Increase top margin to move the header further down
  },
  headerDay: { 
    color: '#007AFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  headerDateContainer: { 
    backgroundColor: '#007AFF', 
    borderRadius: 50, 
    padding: 10, 
    marginTop: 5 
  },
  headerDate: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  addButton: { 
    position: 'absolute', 
    top: 10, 
    right: 10 
  },
  refreshButton: { 
    position: 'absolute', 
    top: 10, 
    right: 60 
  },
  viewToggleButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  item: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  icon: { marginRight: 10 },
  itemText: { flex: 1 },
  name: { fontSize: 18, color: 'white' },
  time: { fontSize: 14, color: '#aaa' },
  type: { fontSize: 14, color: '#aaa' },
  clientName: { fontSize: 16, color: '#aaa' }, // Added this line
  navigation: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  navButton: { padding: 10, backgroundColor: '#333', borderRadius: 5 },
  navButtonText: { color: 'white', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#333' },
  footerItem: { alignItems: 'center' },
  footerText: { color: '#fff', fontSize: 12, marginTop: 4 },
  addButton: { position: 'absolute', top: 10, right: 10 },
  refreshButton: { position: 'absolute', top: 10, right: 60 },
  noAppointmentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAppointmentsText: {
    fontSize: 18,
    color: '#aaa',
    textAlign: 'center',
  },
  totalContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cardContainer: {
    backgroundColor: '#2c2c2e',
    borderRadius: 15,
    padding: 20,
    margin: 10,
    alignItems: 'center',
  },
  clientImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 15,
  },
  cardClientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 5,
  },
  cardTime: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 5,
  },
  cardType: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 5,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  cardNote: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 15,
  },
  addNoteButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  addNoteButtonText: {
    color: 'white',
    fontSize: 16,
  },
  swiper: {
    flex: 1,
  },
  buttonText: {
    fontSize: 24,
    color: '#007AFF',
  },
});

export default CalendarScreen;