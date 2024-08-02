import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, ActivityIndicator, Modal, Alert, TextInput, TouchableWithoutFeedback, Keyboard, Switch, Animated } from 'react-native';
import { getAppointmentsByDay, getClientById, getAppointmentsByClientId, getMessagesByClientId, setMessagesRead, createBlockedTime, getClientAppointmentsAroundCurrent, getNotesByClientId, createNote, updateAppointmentPayment, deleteAppointment, rescheduleAppointment } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import Swiper from 'react-native-swiper';
import avatarImage from '../../assets/avatar.png'; // Adjust the path as needed
import Icon from 'react-native-vector-icons/FontAwesome';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import RescheduleConfirmModal from '../components/RescheduleConfirmModal';
import { Picker } from '@react-native-picker/picker';


const CalendarScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');
  const [currentAppointmentIndex, setCurrentAppointmentIndex] = useState(0);
  const [previousAppointments, setPreviousAppointments] = useState([]);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draggedAppointment, setDraggedAppointment] = useState(null);
  const [newAppointmentTime, setNewAppointmentTime] = useState(null);
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isBlockTimeModalVisible, setIsBlockTimeModalVisible] = useState(false);
  const [blockedTimeData, setBlockedTimeData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    reason: ''
  });
  const [clientAppointments, setClientAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [isAddNoteModalVisible, setIsAddNoteModalVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paid: false,
    paymentMethod: 'cash',
    tipAmount: '0',
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragPosition = useRef(new Animated.ValueXY()).current;

  const scrollViewRef = useRef(null);
  const messagesScrollViewRef = useRef(null);

  useEffect(() => {
    fetchAppointments();
  }, [date]);

  useEffect(() => {
    if (currentClientId) {
      fetchPreviousAppointments(currentClientId);
      fetchMessages(currentClientId);
      fetchNotes(currentClientId);
    }
  }, [currentClientId]);

  useEffect(() => {
    if (messagesScrollViewRef.current) {
      messagesScrollViewRef.current.scrollToEnd({ animated: false });
    }
  }, [messages]);

  useEffect(() => {
    if (currentClientId && appointments[currentAppointmentIndex]) {
      fetchClientAppointmentsAroundCurrent(currentClientId, appointments[currentAppointmentIndex].id);
    }
  }, [currentClientId, currentAppointmentIndex, appointments]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setAppointments([]); // Clear existing appointments
    try {
      const estDate = new Date(date);
      estDate.setHours(estDate.getHours() - 4); // Convert to EST
      const year = estDate.getFullYear();
      const month = String(estDate.getMonth() + 1).padStart(2, '0');
      const day = String(estDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const response = await getAppointmentsByDay(formattedDate);
      const adjustedAppointments = await Promise.all(response.map(async (appointment) => {
        if (appointment.appointmenttype === 'BLOCKED_TIME') {
          return {
            ...appointment,
            clientName: 'Blocked Time',
            startTime: convertTo12HourFormat(appointment.starttime),
            endTime: convertTo12HourFormat(appointment.endtime)
          };
        } else {
          const client = await getClientById(appointment.clientid);
          return {
            ...appointment,
            clientName: `${client.firstname} ${client.lastname}`,
            startTime: convertTo12HourFormat(appointment.starttime),
            endTime: convertTo12HourFormat(appointment.endtime)
          };
        }
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

  const fetchClientAppointmentsAroundCurrent = async (clientId, currentAppointmentId) => {
    try {
      const data = await getClientAppointmentsAroundCurrent(clientId, currentAppointmentId);
      setClientAppointments(data);
    } catch (error) {
      console.error('Error fetching client appointments around current:', error);
    }
  };

  const fetchNotes = async (clientId) => {
    try {
      const data = await getNotesByClientId(clientId);
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const addNote = async () => {
    try {
      const data = await createNote(currentClientId, newNote);
      setNotes([data, ...notes]);
      setNewNote('');
      setIsAddNoteModalVisible(false);
    } catch (error) {
      console.error('Error adding note:', error);
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

  const formatNoteDate = (dateString) => {
    if (!dateString) {
      console.error('Date string is undefined or null');
      return 'No date';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString);
      return 'Invalid Date';
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };
  const convertToEST = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours()); // Convert to EST
    date.setDate(date.getDate() + 1);
    return date;
  };

  const formatAppointmentDate = (dateString) => {
    const date = convertToEST(dateString);
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString);
      return 'Invalid Date';
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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
            {/* Payment Status and Tip Amount */}
            {appointment.paid && (
              <View style={styles.paymentInfoContainer}>
                <View style={styles.paidStatusContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.paidStatusText}>Paid</Text>
                </View>
                {appointment.tipamount != null && (
                  <View style={styles.tipContainer}>
                    <Text style={styles.tipLabel}>Tip:</Text>
                    <Text style={styles.tipAmount}>${Number(appointment.tipamount).toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}

            <Image
              source={avatarImage}
              style={styles.clientImage}
            />
            <Text style={styles.cardClientName}>{appointment.clientName}</Text>
            
            <Text style={styles.cardDate}>{formatAppointmentDate(appointment.date)}</Text>
            <Text style={styles.cardTime}>{appointment.startTime} - {appointment.endTime}</Text>
            <Text 
              style={styles.cardType} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {appointment.appointmenttype}
            </Text>
            <Text style={styles.cardPrice}>${appointment.price}</Text>
            
            {/* Payment Button */}
            <TouchableOpacity 
              style={styles.paymentButton} 
              onPress={() => handlePaymentPress(appointment)}
            >
              <Text style={styles.paymentButtonText}>
                {appointment.paid ? 'Update Payment' : 'Log Payment'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Notes</Text>
              {notes.length > 0 && (
                <View style={styles.noteItem}>
                  <Text style={styles.noteContent}>{notes[0].content}</Text>
                  <Text style={styles.noteDate}>{formatNoteDate(notes[0].createdat)}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.addNoteButton} 
                onPress={() => setIsAddNoteModalVisible(true)}
              >
                <Text style={styles.addNoteButtonText}>Add Note</Text>
              </TouchableOpacity>
              {notes.length > 1 && (
                <TouchableOpacity onPress={() => setShowAllNotes(!showAllNotes)}>
                  <Text style={styles.seeMoreText}>{showAllNotes ? 'See Less' : 'See More'}</Text>
                </TouchableOpacity>
              )}
              {showAllNotes && notes.slice(1).map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteDate}>{formatNoteDate(note.createdat)}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.clientAppointmentsContainer}>
              <Text style={styles.clientAppointmentsTitle}>Appointments</Text>
              {clientAppointments.map((app, index) => (
                <View key={index} style={[
                  styles.clientAppointmentItem,
                  app.id === appointment.id ? styles.currentAppointment : null
                ]}>
                  <Text style={styles.appDate}>{formatAppointmentDate(app.date)}</Text>
                  <Text 
                    style={styles.appType} 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {app.appointmenttype}
                  </Text>
                  <Text style={styles.appPrice}>${app.price}</Text>
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

  const onGestureEvent = (event, appointment) => {
    const { translationY } = event.nativeEvent;
    console.log(appointment.startTime);
    const [time, period] = appointment.startTime.split(' ');
    const [hours, minutes] = time.split(':');
    const startTimeIn24 = `${period === 'PM' && hours !== '12' ? parseInt(hours) + 12 : hours}:${minutes}`;
    const newStartTime = calculateNewTime(startTimeIn24, translationY);
    // Convert back to 12-hour format
    const [newHours, newMinutes] = newStartTime.split(':');
    const newPeriod = parseInt(newHours, 10) >= 12 ? 'PM' : 'AM';
    const adjustedNewHours = parseInt(newHours, 10) % 12 || 12;
    setNewAppointmentTime(`${adjustedNewHours}:${newMinutes} ${newPeriod}`);
  };

  const onHandlerStateChange = (event, appointment) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      setIsDragging(false);
      const newStartTime = calculateNewTime(appointment.startTime, event.nativeEvent.translationY);
      setDraggedAppointment({ ...appointment, newStartTime });
      setIsRescheduleModalVisible(true);
    } else if (event.nativeEvent.state === State.BEGAN) {
      setIsDragging(true);
      dragPosition.setValue({ x: 0, y: 0 });
    }
  };

  const calculateNewTime = (startTime, translationY) => {
    const [hours, minutes] = startTime.split(':');
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const newMinutes = totalMinutes + Math.round(translationY / (100 / 60)); // 100px per hour
    const newHours = Math.floor(newMinutes / 60);
    const newMinutesRemainder = newMinutes % 60;
    console.log(`${newHours.toString().padStart(2, '0')}:${newMinutesRemainder.toString().padStart(2, '0')}`)
    return `${newHours.toString().padStart(2, '0')}:${newMinutesRemainder.toString().padStart(2, '0')}`;
  };

  const confirmReschedule = async () => {
    if (!draggedAppointment || !newAppointmentTime) {
      console.error('No appointment or new time set for rescheduling');
      return;
    }

    try {
      // Convert 12-hour time to 24-hour time
      const convertTo24Hour = (time12h) => {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') {
          hours = '00';
        }
        if (modifier === 'PM') {
          hours = parseInt(hours, 10) + 12;
        }
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      };

      // Use newAppointmentTime directly
      const formattedStartTime = newAppointmentTime;
      const originalStartTime = convertTo24Hour(draggedAppointment.startTime);
      const originalEndTime = convertTo24Hour(draggedAppointment.endTime);
      
      // Calculate duration in minutes
      const getDurationMinutes = (start, end) => {
        const [startHours, startMinutes] = start.split(':').map(Number);
        const [endHours, endMinutes] = end.split(':').map(Number);
        return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
      };

      const durationMinutes = getDurationMinutes(originalStartTime, originalEndTime);

      // Calculate new end time
      const addMinutes = (time, minutes) => {
        const [hours, mins] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
      };

      const formattedEndTime = addMinutes(formattedStartTime, durationMinutes);

      console.log(`Rescheduling appointment ${draggedAppointment.id} to ${formattedStartTime} - ${formattedEndTime}`);

      // Uncomment this line when ready to actually reschedule
      await rescheduleAppointment(
        draggedAppointment.id,
        draggedAppointment.date, // Keep the original date
        formattedStartTime,
        formattedEndTime
      );
      // Refresh appointments after rescheduling
      await fetchAppointments();

      setIsRescheduleModalVisible(false);
      setDraggedAppointment(null);
      setNewAppointmentTime(null);

      // Show a success message
      Alert.alert('Success', 'Appointment rescheduled successfully');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'Failed to reschedule appointment. Please try again.');
    }
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
    return appointments.map((appointment, index) => {
      const [startHour, startMinute] = appointment.startTime.split(':');
      const startPeriod = appointment.startTime.split(' ')[1];
      const start = (parseInt(startHour) % 12 + (startPeriod === 'PM' ? 12 : 0)) + parseInt(startMinute) / 60;
      const topPosition = (start - 9) * 100; // 100px per hour

      const appointmentStyle = {
        ...styles.appointmentBlock,
        top: topPosition,
        height: calculateAppointmentHeight(appointment.startTime, appointment.endTime),
      };

      const animatedStyle = isDragging && draggedAppointment?.id === appointment.id
        ? { transform: dragPosition.getTranslateTransform() }
        : {};

      return (
        <PanGestureHandler
          key={appointment.id}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={(event) => onHandlerStateChange(event, appointment)}
        >
          <Animated.View style={[appointmentStyle, animatedStyle]}>
            <TouchableOpacity 
              style={styles.appointmentContent} 
              onPress={() => navigation.navigate('AppointmentDetails', { appointment: appointment })}
            >
              <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentName} numberOfLines={1} ellipsizeMode="tail">
                  {appointment.clientName}
                </Text>
                <Text style={styles.appointmentType} numberOfLines={1} ellipsizeMode="tail">
                  {appointment.appointmenttype}
                </Text>
              </View>
              <View style={styles.appointmentFooter}>
                <Text style={styles.appointmentTime}>{appointment.startTime} - {appointment.endTime}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      );
    });
  };

  const calculateAppointmentHeight = (startTime, endTime) => {
    const [startHour, startMinute] = startTime.split(':');
    const [endHour, endMinute] = endTime.split(':');
    const startPeriod = startTime.split(' ')[1];
    const endPeriod = endTime.split(' ')[1];
    
    const start = (parseInt(startHour) % 12 + (startPeriod === 'PM' ? 12 : 0)) + parseInt(startMinute) / 60;
    const end = (parseInt(endHour) % 12 + (endPeriod === 'PM' ? 12 : 0)) + parseInt(endMinute) / 60;
    
    return (end - start) * 100; // 100px per hour
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
    return colors[type] || '#007AFF'; // Default color
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

  const handleAddButtonPress = () => {
    setIsDropdownVisible(true);
  };

  const handleBlockTime = () => {
    setIsDropdownVisible(false);
    setIsBlockTimeModalVisible(true);
  };

  const handleCreateAppointment = () => {
    setIsDropdownVisible(false);
    navigation.navigate('AddAppointment');
  };

  const handleBlockTimeInputChange = (field, value) => {
    setBlockedTimeData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const handleBlockTimeSubmit = async () => {
    try {
      await createBlockedTime(blockedTimeData);
      Alert.alert('Success', 'Time blocked successfully');
      setIsBlockTimeModalVisible(false);
      fetchAppointments(); // Refresh the appointments list
    } catch (error) {
      Alert.alert('Error', 'Failed to block time');
    }
  };

  const handlePaymentPress = (appointment) => {
    setPaymentData({
      paid: false,
      paymentMethod: 'cash',
      tipAmount: '0',
    });
    setIsPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async () => {
    if (appointments[currentAppointmentIndex]) {
      try {
        await updateAppointmentPayment(
          appointments[currentAppointmentIndex].id,
          paymentData.paid,
          paymentData.tipAmount ? parseFloat(paymentData.tipAmount) : 0,
          paymentData.paymentMethod
        );
        // Refresh appointments after updating payment
        fetchAppointments();
        setIsPaymentModalVisible(false);
      } catch (error) {
        console.error('Error updating payment:', error);
        Alert.alert('Error', 'Failed to update payment. Please try again.');
      }
    }
  };

  const renderPaymentModal = () => (
    <Modal
      transparent={true}
      visible={isPaymentModalVisible}
      onRequestClose={() => setIsPaymentModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.paymentModalContent}>
          <Text style={styles.paymentModalTitle}>Log Payment</Text>
          
          <View style={styles.paymentOption}>
            <Text style={styles.paymentOptionLabel}>Paid:</Text>
            <Switch
              value={paymentData.paid}
              onValueChange={(value) => setPaymentData({ ...paymentData, paid: value })}
            />
          </View>

          {paymentData.paid && (
            <>
              <View style={styles.paymentOption}>
                <Text style={styles.paymentOptionLabel}>Payment Method:</Text>
                <Picker
                  selectedValue={paymentData.paymentMethod}
                  style={styles.paymentMethodPicker}
                  onValueChange={(itemValue) => setPaymentData({ ...paymentData, paymentMethod: itemValue })}
                >
                  <Picker.Item label="Cash" value="cash" />
                  <Picker.Item label="E-Transfer" value="e-transfer" />
                </Picker>
              </View>

              <View style={styles.paymentOption}>
                <Text style={styles.paymentOptionLabel}>Tip Amount:</Text>
                <TextInput
                  style={styles.tipInput}
                  value={paymentData.tipAmount}
                  onChangeText={(value) => setPaymentData({ ...paymentData, tipAmount: value })}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            </>
          )}

          <View style={styles.paymentModalButtons}>
            <TouchableOpacity 
              style={[styles.paymentModalButton, styles.cancelButton]} 
              onPress={() => setIsPaymentModalVisible(false)}
            >
              <Text style={styles.paymentModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.paymentModalButton, styles.submitButton]} 
              onPress={handlePaymentSubmit}
            >
              <Text style={styles.paymentModalButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAddNoteModal = () => (
    <Modal
      transparent={true}
      visible={isAddNoteModalVisible}
      onRequestClose={() => setIsAddNoteModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View style={styles.addNoteModalContent}>
            <Text style={styles.addNoteModalTitle}>Add New Note</Text>
            <TextInput
              style={styles.addNoteModalInput}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Enter your note here..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
            <View style={styles.addNoteModalButtons}>
              <TouchableOpacity 
                style={[styles.addNoteModalButton, styles.cancelButton]} 
                onPress={() => setIsAddNoteModalVisible(false)}
              >
                <Text style={styles.addNoteModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addNoteModalButton, styles.submitButton]} 
                onPress={addNote}
              >
                <Text style={styles.addNoteModalButtonText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerDay}>{formatDay(date)}</Text>
        <View style={styles.headerDateContainer}>
          <Text style={styles.headerDate}>{formatDate(date)}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddButtonPress}>
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
                <TouchableOpacity onPress={() => setCurrentAppointmentIndex(Math.max(0, currentAppointmentIndex - 1))} style={styles.navButton}>
                  <Text style={styles.navButtonText}>‹</Text>
                </TouchableOpacity>
                <View style={styles.appointmentCounterContainer}>
                  <Text style={styles.appointmentCounter}>
                    {currentAppointmentIndex + 1} / {appointments.length}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCurrentAppointmentIndex(Math.min(appointments.length - 1, currentAppointmentIndex + 1))} style={styles.navButton}>
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

      {/* Dropdown Modal */}
      <Modal
        transparent={true}
        visible={isDropdownVisible}
        onRequestClose={() => setIsDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setIsDropdownVisible(false)}
        >
          <View style={styles.dropdown}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleBlockTime}>
              <Text style={styles.dropdownItemText}>Block Time</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleCreateAppointment}>
              <Text style={styles.dropdownItemText}>Create Appointment</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Block Time Modal */}
      <Modal
        transparent={true}
        visible={isBlockTimeModalVisible}
        onRequestClose={() => setIsBlockTimeModalVisible(false)}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => setIsBlockTimeModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.blockTimeModal}>
                <Text style={styles.blockTimeModalTitle}>Block Time</Text>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>Date:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.date}
                    onChangeText={(value) => handleBlockTimeInputChange('date', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>Start Time:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.startTime}
                    onChangeText={(value) => handleBlockTimeInputChange('startTime', value)}
                    placeholder="HH:MM AM/PM"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>End Time:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.endTime}
                    onChangeText={(value) => handleBlockTimeInputChange('endTime', value)}
                    placeholder="HH:MM AM/PM"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>Reason:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.reason}
                    onChangeText={(value) => handleBlockTimeInputChange('reason', value)}
                    placeholder="Reason for blocking time"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.blockTimeModalButtons}>
                  <TouchableOpacity 
                    style={[styles.blockTimeModalButton, styles.blockTimeCancelButton]} 
                    onPress={() => setIsBlockTimeModalVisible(false)}
                  >
                    <Text style={styles.blockTimeModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.blockTimeModalButton, styles.blockTimeSubmitButton]} 
                    onPress={handleBlockTimeSubmit}
                  >
                    <Text style={styles.blockTimeModalButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {renderAddNoteModal()}
      {renderPaymentModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    paddingTop: 0,
    backgroundColor: '#1c1c1e' 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 80,
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
  clientName: { fontSize: 16, color: '#aaa' },
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
    width: Dimensions.get('window').width - 40,
    maxWidth: 400,
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
    maxWidth: '100%',
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
    paddingTop: 2,
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
    borderColor: '#0056b3',
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
    width: '100%',
  },
  prevAppDate: {
    color: '#aaa',
    fontSize: 14,
    width: '30%',
  },
  prevAppType: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
    marginHorizontal: 5,
  },
  prevAppPrice: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'right',
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
    backgroundColor: '#4a4a4a',
    borderRadius: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  dayNavButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 10,
    width: '80%',
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
  },
  blockTimeModal: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 5,
    padding: 10,
    color: '#fff',
  },
  clientAppointmentsContainer: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 10,
  },
  clientAppointmentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  clientAppointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: '100%',
  },
  currentAppointment: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 5,
  },
  appDate: {
    color: '#aaa',
    fontSize: 14,
    width: '30%',
  },
  appType: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
    marginHorizontal: 5,
  },
  appPrice: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'right',
  },
  notesContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  noteItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#3a3a3c',
    borderRadius: 5,
  },
  noteContent: {
    color: '#fff',
    fontSize: 14,
  },
  noteDate: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 5,
  },
  noteInput: {
    backgroundColor: '#3a3a3c',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  addNoteButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  seeMoreText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNoteModalContent: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  addNoteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  addNoteModalInput: {
    backgroundColor: '#3a3a3c',
    borderRadius: 5,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addNoteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  addNoteModalButton: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  addNoteModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentModalContent: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  paymentOptionLabel: {
    color: '#fff',
    fontSize: 16,
  },
  paymentMethodPicker: {
    width: 150,
    color: '#fff',
  },
  tipInput: {
    backgroundColor: '#3a3a3c',
    borderRadius: 5,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    width: 100,
  },
  paymentModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  paymentModalButton: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  paymentModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentInfoContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  paidStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 5,
    borderRadius: 15,
    marginBottom: 5,
  },
  paidStatusText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 5,
    borderRadius: 15,
  },
  tipLabel: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 5,
  },
  tipAmount: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addNoteModalInput: {
    backgroundColor: '#3a3a3c',
    borderRadius: 5,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addNoteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  addNoteModalButton: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  addNoteModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentModalContent: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  paymentOptionLabel: {
    color: '#fff',
    fontSize: 16,
  },
  paymentMethodPicker: {
    width: 150,
    color: '#fff',
  },
  tipInput: {
    backgroundColor: '#3a3a3c',
    borderRadius: 5,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    width: 100,
  },
  paymentModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  paymentModalButton: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  paymentModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentInfoContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  paidStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 5,
    borderRadius: 15,
    marginBottom: 5,
  },
  paidStatusText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 5,
    borderRadius: 15,
  },
  tipLabel: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 5,
  },
  tipAmount: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CalendarScreen;