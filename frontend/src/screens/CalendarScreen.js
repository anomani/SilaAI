import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { getAppointmentsByDay, getClientById, getAppointmentsByClientId, getMessagesByClientId, setMessagesRead } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import Swiper from 'react-native-swiper';
import avatarImage from '../../assets/lebron-hair.png'; // Adjust the path as needed
import Icon from 'react-native-vector-icons/FontAwesome';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import RescheduleConfirmModal from '../components/RescheduleConfirmModal';

const CalendarScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAppointmentIndex, setCurrentAppointmentIndex] = useState(0);
  const [previousAppointments, setPreviousAppointments] = useState([]);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draggedAppointment, setDraggedAppointment] = useState(null);
  const [newAppointmentTime, setNewAppointmentTime] = useState(null);
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] = useState(false);

  const scrollViewRef = useRef(null);
  const messagesScrollViewRef = useRef(null);

  useEffect(() => {
    fetchAppointments();
  }, [date]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    updateCurrentAppointment();
  }, [currentTime, appointments]);

  useEffect(() => {
    if (currentClientId) {
      fetchPreviousAppointments(currentClientId);
      fetchMessages(currentClientId);
    }
  }, [currentClientId]);

  useEffect(() => {
    if (messagesScrollViewRef.current) {
      messagesScrollViewRef.current.scrollToEnd({ animated: false });
    }
  }, [messages]);

  const updateCurrentAppointment = () => {
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    let nextAppointmentIndex = appointments.findIndex(appointment => {
      const [startHour, startMinute] = appointment.startTime.split(':');
      const startTimeInMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
      return startTimeInMinutes > currentTimeInMinutes;
    });

    if (nextAppointmentIndex === -1) {
      // If no next appointment, show the last appointment
      nextAppointmentIndex = appointments.length - 1;
    } else if (nextAppointmentIndex > 0) {
      // Check if current time is within the previous appointment
      const prevAppointment = appointments[nextAppointmentIndex - 1];
      const [endHour, endMinute] = prevAppointment.endTime.split(':');
      const endTimeInMinutes = parseInt(endHour) * 60 + parseInt(endMinute);
      if (currentTimeInMinutes < endTimeInMinutes) {
        nextAppointmentIndex--;
      }
    }

    setCurrentAppointmentIndex(Math.max(0, nextAppointmentIndex));
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    setAppointments([]); // Clear existing appointments
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
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreviousAppointments = async (clientId) => {
    try {
      const allAppointments = await getAppointmentsByClientId(clientId);
      const sortedAppointments = allAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
      const previousAppointments = sortedAppointments.slice(1, 6); // Get up to 5 previous appointments
      setPreviousAppointments(previousAppointments);
    } catch (error) {
      console.error('Error fetching previous appointments:', error);
    }
  };

  const fetchMessages = async (clientId) => {
    try {
      const data = await getMessagesByClientId(clientId);
      // Sort messages by date, oldest first
      const sortedMessages = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMessages(sortedMessages);
      setMessagesRead(clientId);
    } catch (error) {
      console.error('Error fetching messages:', error);
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

  const formatTimestamp = (dateString) => {
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [time, period] = timePart.split(' ');
    const [hours, minutes] = time.split(':');

    let adjustedHours = parseInt(hours, 10) - 4;
    let adjustedPeriod = period;

    if (adjustedHours < 0) {
      adjustedHours += 12;
      adjustedPeriod = period === 'AM' ? 'PM' : 'AM';
    } else if (adjustedHours === 0) {
      adjustedHours = 12;
    } else if (adjustedHours > 12) {
      adjustedHours -= 12;
      adjustedPeriod = 'PM';
    }

    return `${adjustedHours}:${minutes} ${adjustedPeriod}`;
  };

  const navigateToFullMessageHistory = (clientId, clientName) => {
    navigation.navigate('ClientMessages', { clientid: clientId, clientName: clientName });
  };

  const renderClientCard = (appointment) => {
    // Update the current client ID when rendering a new card
    if (appointment.clientid !== currentClientId) {
      setCurrentClientId(appointment.clientid);
    }

    return (
      <View style={styles.cardViewContainer}>
        <ScrollView contentContainerStyle={styles.cardScrollViewContent}>
          <View style={styles.cardContainer}>
            <Image
              source={avatarImage}
              style={styles.clientImage}
            />
            <Text style={styles.cardClientName}>{appointment.clientName}</Text>
            <Text style={styles.cardDate}>{formatDate(new Date(appointment.date))}</Text>
            <Text style={styles.cardTime}>{appointment.startTime} - {appointment.endTime}</Text>
            <Text 
              style={styles.cardType} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {appointment.appointmenttype}
            </Text>
            <Text style={styles.cardPrice}>${appointment.price}</Text>
            <Text style={styles.cardNote}>{appointment.note || 'No notes available'}</Text>
            <TouchableOpacity style={styles.addNoteButton} onPress={() => {/* Add note functionality */}}>
              <Text style={styles.addNoteButtonText}>Add note</Text>
            </TouchableOpacity>
            
            <View style={styles.previousAppointmentsContainer}>
              <Text style={styles.previousAppointmentsTitle}>Previous Appointments</Text>
              {previousAppointments.map((prevApp, index) => (
                <View key={index} style={styles.previousAppointmentItem}>
                  <Text style={styles.prevAppDate}>{formatDate(new Date(prevApp.date))}</Text>
                  <Text 
                    style={styles.prevAppType} 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {prevApp.appointmenttype}
                  </Text>
                  <Text style={styles.prevAppPrice}>${prevApp.price}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.messageHistoryContainer}>
              <Text style={styles.messageHistoryTitle}>Message History</Text>
              {messages.length > 0 ? (
                <View style={styles.messagesContainer}>
                  {messages.slice(-5).map((message, index) => {
                    const isAssistant = message.fromtext === '+18446480598';
                    const avatar = isAssistant ? twilioAvatar : defaultAvatar;
                    const senderName = isAssistant ? 'Assistant' : appointment.clientName;

                    return (
                      <View 
                        key={index}
                        style={[styles.messageContainer, isAssistant ? styles.assistantMessage : styles.clientMessage]}
                      >
                        {!isAssistant && <Image source={avatar} style={styles.avatar} />}
                        <View style={styles.messageContent}>
                          <Text style={styles.messageSender}>{senderName}</Text>
                          <View style={[styles.messageBubble, isAssistant ? styles.assistantBubble : styles.clientBubble]}>
                            <Text style={[styles.messageText, isAssistant ? styles.assistantText : styles.clientText]}>
                              {message.body}
                            </Text>
                            <Text style={styles.timestamp}>{formatTimestamp(message.date)}</Text>
                          </View>
                        </View>
                        {isAssistant && <Image source={avatar} style={styles.avatar} />}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noMessagesText}>No messaging history</Text>
              )}
              <TouchableOpacity 
                style={styles.fullHistoryButton}
                onPress={() => navigateToFullMessageHistory(appointment.clientid, appointment.clientName)}
              >
                <Text style={styles.fullHistoryButtonText}>See Full Message History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
      slots.push(
        <View key={hour} style={styles.timeSlot}>
          <Text style={styles.timeText}>
            {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
          </Text>
        </View>
      );
    }
    return slots;
  };

  const onGestureEvent = (event) => {
    // Handle the gesture event without Reanimated
    const { translationY } = event.nativeEvent;
    // You can update the UI based on translationY if needed
  };

  const onHandlerStateChange = (event, appointment) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      setDraggedAppointment(appointment);
      const newStartTime = calculateNewTime(appointment.startTime, event.nativeEvent.translationY);
      setNewAppointmentTime(newStartTime);
      setIsRescheduleModalVisible(true);
    }
  };

  const calculateNewTime = (startTime, translationY) => {
    const [hours, minutes] = startTime.split(':');
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const newMinutes = totalMinutes + Math.round(translationY / (100 / 60)); // 100px per hour
    const newHours = Math.floor(newMinutes / 60);
    const newMinutesRemainder = newMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutesRemainder.toString().padStart(2, '0')}`;
  };

  const confirmReschedule = async () => {
    // Implement the API call to update the appointment time
    // For now, we'll just update the local state
    const updatedAppointments = appointments.map(app => 
      app.id === draggedAppointment.id 
        ? { ...app, startTime: newAppointmentTime, endTime: calculateEndTime(newAppointmentTime, app.endTime) }
        : app
    );
    setAppointments(updatedAppointments);
    setIsRescheduleModalVisible(false);
    setDraggedAppointment(null);
    setNewAppointmentTime(null);
  };

  const calculateEndTime = (newStartTime, oldEndTime) => {
    const [oldStartHour, oldStartMinute] = draggedAppointment.startTime.split(':');
    const [oldEndHour, oldEndMinute] = oldEndTime.split(':');
    const duration = (parseInt(oldEndHour) * 60 + parseInt(oldEndMinute)) - (parseInt(oldStartHour) * 60 + parseInt(oldStartMinute));
    
    const [newStartHour, newStartMinute] = newStartTime.split(':');
    const newEndMinutes = parseInt(newStartHour) * 60 + parseInt(newStartMinute) + duration;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMinuteRemainder = newEndMinutes % 60;
    
    return `${newEndHour.toString().padStart(2, '0')}:${newEndMinuteRemainder.toString().padStart(2, '0')}`;
  };

  const renderAppointments = () => {
    if (appointments.length === 0) {
      return (
        <View style={styles.noAppointmentsContainer}>
          <Text style={styles.noAppointmentsText}>No appointments scheduled today</Text>
        </View>
      );
    }

    const appointmentBlocks = [];
    appointments.forEach((appointment, index) => {
      const [startHour, startMinute] = appointment.startTime.split(':');
      const [endHour, endMinute] = appointment.endTime.split(':');
      
      // Convert 12-hour format to 24-hour format
      const start = (parseInt(startHour) % 12 + (appointment.startTime.includes('PM') ? 12 : 0)) + parseInt(startMinute) / 60;
      const end = (parseInt(endHour) % 12 + (appointment.endTime.includes('PM') ? 12 : 0)) + parseInt(endMinute) / 60;
      
      const duration = end - start;
      const topPosition = (start - 9) * 100; // 100px per hour


      appointmentBlocks.push(
        <PanGestureHandler
          key={appointment.id}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={(event) => onHandlerStateChange(event, appointment)}
        >
          <View
            style={[
              styles.appointmentBlock,
              {
                top: topPosition,
                height: Math.max(duration * 100, 50), // Minimum height of 50px
              },
            ]}
          >
            <View style={styles.appointmentHeader}>
              <Text style={styles.appointmentName} numberOfLines={1} ellipsizeMode="tail">
                {appointment.clientName}
              </Text>
              <Text style={styles.appointmentType} numberOfLines={1} ellipsizeMode="tail">
                {appointment.appointmenttype}
              </Text>
            </View>
            <Text style={styles.appointmentTime}>
              {`${appointment.startTime} - ${appointment.endTime}`}
            </Text>
          </View>
        </PanGestureHandler>
      );
    });

    return appointmentBlocks;
  };

  const renderCurrentTimeLine = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timePosition = ((hours - 9) + minutes / 60) * 100;

    // Check if the selected date is today
    const isToday = date.toDateString() === now.toDateString();

    if (isToday && hours >= 9 && hours < 21) {
      return (
        <View
          style={[
            styles.currentTimeLine,
            { top: timePosition }
          ]}
        />
      );
    }
    return null;
  };

  const getAppointmentColor = (type) => {
    const colors = {
      'Adult Cut': '#4CAF50',
      'Beard Grooming': '#2196F3',
      'Full Service': '#9C27B0',
      // Add more types and colors as needed
    };
    return colors[type] || '#FF9800'; // Default color
  };

  const totalHours = 21 - 9 + 1; // From 9am to 9pm, inclusive
  const totalHeight = totalHours * 100; // 100px per hour

  const goToNextAppointment = () => {
    if (currentAppointmentIndex < appointments.length - 1) {
      setCurrentAppointmentIndex(currentAppointmentIndex + 1);
    }
  };

  const goToPreviousAppointment = () => {
    if (currentAppointmentIndex > 0) {
      setCurrentAppointmentIndex(currentAppointmentIndex - 1);
    }
  };

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
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : viewMode === 'list' ? (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.calendarContainer}
          contentContainerStyle={{ minHeight: totalHeight }}
        >
          <View style={styles.timelineContainer}>
            <View style={styles.timeline}>
              {renderTimeSlots()}
            </View>
            <View style={[styles.appointmentsContainer, { height: totalHeight }]}>
              {renderAppointments()}
              {renderCurrentTimeLine()}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.cardView}>
          {appointments.length > 0 ? (
            <>
              {renderClientCard(appointments[currentAppointmentIndex])}
              <View style={styles.cardNavigation}>
                <TouchableOpacity onPress={goToPreviousAppointment} style={styles.navButton}>
                  <Text style={styles.navButtonText}>‹</Text>
                </TouchableOpacity>
                <View style={styles.appointmentCounterContainer}>
                  <Text style={styles.appointmentCounter}>
                    {currentAppointmentIndex + 1} / {appointments.length}
                  </Text>
                </View>
                <TouchableOpacity onPress={goToNextAppointment} style={styles.navButton}>
                  <Text style={styles.navButtonText}>›</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.noAppointmentsText}>No appointments scheduled today</Text>
          )}
        </View>
      )}
      
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Daily Total: ${calculateDailyTotal()}</Text>
      </View>
      <View style={styles.navigation}>
        <TouchableOpacity style={styles.dayNavButton} onPress={() => changeDate(-1)}>
          <Text style={styles.dayNavButtonText}>Previous Day</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dayNavButton} onPress={goToToday}>
          <Text style={styles.dayNavButtonText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dayNavButton} onPress={() => changeDate(1)}>
          <Text style={styles.dayNavButtonText}>Next Day</Text>
        </TouchableOpacity>
      </View>
      <Footer navigation={navigation} />
      <RescheduleConfirmModal
        isVisible={isRescheduleModalVisible}
        appointment={draggedAppointment}
        newTime={newAppointmentTime}
        onConfirm={confirmReschedule}
        onCancel={() => setIsRescheduleModalVisible(false)}
      />
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
  navigation: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
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
  cardView: {
    flex: 1,
    width: '100%',
  },
  cardViewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardScrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardContainer: {
    backgroundColor: '#2c2c2e',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: Dimensions.get('window').width - 40, // Full width minus 40px for margins
    maxWidth: 400, // Maximum width of the card
  },
  clientImage: {
    width: 150,
    height: 150,
    borderRadius: 75, // To make it circular
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
    maxWidth: '100%', // Ensure the text doesn't overflow the container
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
  calendarContainer: {
    flex: 1,
  },
  timelineContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  timeline: {
    width: 50,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  timeSlot: {
    height: 100,
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingTop: 2, // Add a small top padding
  },
  timeText: {
    color: '#aaa',
    fontSize: 12,
  },
  appointmentsContainer: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: '#333',
  },
  appointmentBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#0056b3', // A slightly darker shade of blue for the border
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  appointmentName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
    marginRight: 4,
  },
  appointmentType: {
    color: 'white',
    fontSize: 12,
    textAlign: 'right',
  },
  appointmentTime: {
    color: 'white',
    fontSize: 10,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'red',
    zIndex: 1000,
  },
  cardNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  navButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appointmentCounterContainer: {
    flex: 1,
    alignItems: 'center',
  },
  appointmentCounter: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previousAppointmentsContainer: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 10,
  },
  previousAppointmentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  previousAppointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: '100%', // Ensure full width
  },
  prevAppDate: {
    color: '#aaa',
    fontSize: 14,
    width: '30%', // Allocate 30% of the width to the date
  },
  prevAppType: {
    color: '#aaa',
    fontSize: 14,
    flex: 1, // Allow this to take up available space
    marginHorizontal: 5, // Add some horizontal margin
  },
  prevAppPrice: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%', // Allocate 20% of the width to the price
    textAlign: 'right', // Align the price to the right
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageHistoryContainer: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 10,
  },
  messageHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  messagesContainer: {
    width: '100%',
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  assistantMessage: {
    justifyContent: 'flex-end',
  },
  clientMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageContent: {
    maxWidth: '70%',
  },
  messageSender: {
    color: '#9da6b8',
    fontSize: 12,
    marginBottom: 2,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 8,
  },
  assistantBubble: {
    backgroundColor: '#195de6',
  },
  clientBubble: {
    backgroundColor: '#292e38',
  },
  messageText: {
    color: 'white',
    fontSize: 14,
  },
  assistantText: {
    color: 'white',
  },
  clientText: {
    color: 'white',
  },
  timestamp: {
    fontSize: 10,
    color: '#9da6b8',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  noMessagesText: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
  },
  fullHistoryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  fullHistoryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayNavButton: {
    padding: 10,
    backgroundColor: '#4a4a4a', // Gray color
    borderRadius: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  dayNavButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CalendarScreen;