import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert, Animated, Vibration, TextInput, RefreshControl } from 'react-native';
import { getAppointmentsByDay, getClientById, createBlockedTime, deleteAppointment, rescheduleAppointment, updateBlockedTime, deleteBlockedTime } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import RescheduleConfirmModal from '../components/RescheduleConfirmModal';
import BlockTimeModal from '../components/BlockTimeModal';
import ClientCardView from '../components/ClientCardView';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import EditBlockedTimeModal from '../components/EditBlockedTimeModal';


const CalendarScreen = ({ navigation }) => {
  const route = useRoute();
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');
  const [currentAppointmentIndex, setCurrentAppointmentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState(null);
  const [newAppointmentTime, setNewAppointmentTime] = useState(null);
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isBlockTimeModalVisible, setIsBlockTimeModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDraggable, setIsDraggable] = useState(false);

  // Add this constant at the top of the component
  const HOUR_HEIGHT = 100;
  const TOTAL_HOURS = 12;

  const totalHeight = HOUR_HEIGHT * TOTAL_HOURS;

  const [activeDragId, setActiveDragId] = useState(null);
  const panY = useRef(new Animated.Value(0)).current;

  const [dragPositions, setDragPositions] = useState({});
  const [dragTimes, setDragTimes] = useState({});

  const visibleHeight = HOUR_HEIGHT * 12; // Assuming 12 hours are visible at once

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        if (activeDragId) {
          const appointment = appointments.find(a => a.id === activeDragId);
          if (appointment) {
            const newPosition = event.nativeEvent.translationY;
            
            setDragPositions(prev => ({ ...prev, [appointment.id]: newPosition }));

            // Calculate new times only for display purposes
            const newStartTime = calculateNewTime(appointment.startTime, newPosition);
            const duration = getDurationMinutes(appointment.startTime, appointment.endTime);
            const newEndTime = calculateEndTime(newStartTime, duration);
            setDragTimes(prev => ({ ...prev, [appointment.id]: { startTime: newStartTime, endTime: newEndTime } }));
          }
        }
      }
    }
  );

  const onPanHandlerStateChange = (event, appointment) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // End of pan gesture
      setActiveDragId(null);
      setIsDraggable(false);
      panY.setValue(0);
      setDraggedAppointment(appointment);
      const newTime = calculateNewTime(appointment.startTime, event.nativeEvent.translationY);
      setNewAppointmentTime(newTime);
      setIsRescheduleModalVisible(true);
      
      // Reset the drag position
      setDragPositions(prev => ({ ...prev, [appointment.id]: 0 }));
    } else if (event.nativeEvent.state === State.BEGAN) {
      // Start of pan gesture
      setActiveDragId(appointment.id);
    }
  };

  const calculateNewTime = (startTime, translationY) => {

    // Convert to 24-hour format
    const [time, period] = startTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;


    // Calculate new time in minutes, rounding to nearest 15-minute interval
    let totalMinutes = hours * 60 + minutes;
    let dragMinutes = Math.round(translationY * 0.6); // Adjust this multiplier as needed
    dragMinutes = Math.round(dragMinutes / 15) * 15; // Round to nearest 15 minutes
    totalMinutes = (totalMinutes + dragMinutes + 1440) % 1440; // Ensure it's within 24 hours


    // Convert back to hours and minutes
    let newHours = Math.floor(totalMinutes / 60);
    let newMinutes = totalMinutes % 60;

    // Convert to 12-hour format
    const newPeriod = newHours >= 12 ? 'PM' : 'AM';
    newHours = newHours % 12 || 12;

    const result = `${newHours}:${newMinutes.toString().padStart(2, '0')} ${newPeriod}`;

    return result;
  };

  const calculateEndTime = (startTime, durationMinutes) => {
    const [time, period] = startTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    let totalMinutes = hours * 60 + minutes + durationMinutes;
    let newHours = Math.floor(totalMinutes / 60) % 24;
    let newMinutes = totalMinutes % 60;

    // Convert back to 12-hour format
    const newPeriod = newHours >= 12 ? 'PM' : 'AM';
    newHours = newHours % 12 || 12;

    return `${newHours}:${newMinutes.toString().padStart(2, '0')} ${newPeriod}`;
  };

  const getDurationMinutes = (startTime, endTime) => {
    const convertToMinutes = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const startMinutes = convertToMinutes(startTime);
    const endMinutes = convertToMinutes(endTime);
    return endMinutes - startMinutes;
  };

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [date])
  );

  useEffect(() => {
    console.log('Route params changed:', route.params);
    if (route.params?.openAppointmentForClient) {
      const clientId = route.params.openAppointmentForClient;
      console.log('Attempting to open appointment for clientId:', clientId);
      if (appointments.length > 0) {
        openAppointmentForClient(clientId);
      } else {
        console.log('Appointments not loaded yet. Current appointments:', appointments);
      }
    }
  }, [route.params?.openAppointmentForClient, appointments]);

  const openAppointmentForClient = (clientId) => {
    console.log('openAppointmentForClient called with clientId:', clientId);
    console.log('Current appointments:', appointments);

    // Convert clientId to a number if it's a string
    const numericClientId = Number(clientId);

    const appointment = appointments.find(app => app.clientid === numericClientId);
    console.log('Found appointment:', appointment);

    if (appointment) {
      console.log('Setting selected appointment:', appointment);
      setSelectedAppointment(appointment);
      console.log('Changing view mode to card');
      setViewMode('card');
      const index = appointments.indexOf(appointment);
      console.log('Setting current appointment index to:', index);
      setCurrentAppointmentIndex(index);
    } else {
      console.log('No appointment found for clientId:', clientId);
      console.log('ClientIds in appointments:', appointments.map(app => app.clientid));
    }
  };

  const fetchAppointments = async () => {
    console.log('Fetching appointments for date:', date);
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
      console.log('Fetched appointments:', response);
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
      console.log('Adjusted appointments:', adjustedAppointments);
      setAppointments(adjustedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
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


  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'card' : 'list');
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

  const confirmReschedule = async (confirmedTime) => {
    if (!draggedAppointment || !confirmedTime) {
      console.error('No appointment or confirmed time set for rescheduling');
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
        const result = `${hours.toString().padStart(2, '0')}:${minutes}`;
        return result;
      };

      const formattedStartTime = convertTo24Hour(confirmedTime);
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

  const [selectedBlockedTime, setSelectedBlockedTime] = useState(null);

  const handleBlockedTimePress = (appointment) => {
    if (appointment.appointmenttype === 'BLOCKED_TIME') {
      setSelectedBlockedTime({
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        reason: appointment.details || ''
      });
      setIsEditBlockTimeModalVisible(true);
    } else {
      // Find the index of the appointment in the appointments array
      const index = appointments.findIndex(app => app.id === appointment.id);
      setSelectedAppointment(appointment);
      setCurrentAppointmentIndex(index);
      setViewMode('card');
    }
  };

  const handleAppointmentPress = (appointment) => {
    handleBlockedTimePress(appointment);
  };

  const handleBlockTimeSubmit = async (blockedTimeData) => {
    try {
      if (selectedBlockedTime) {
        // Update existing blocked time
        await updateBlockedTime(selectedBlockedTime.id, blockedTimeData);
        Alert.alert('Success', 'Blocked time updated successfully');
      } else {
        // Create new blocked time
        await createBlockedTime(blockedTimeData);
        Alert.alert('Success', 'Time blocked successfully');
      }
      setIsBlockTimeModalVisible(false);
      fetchAppointments(); // Refresh the appointments list
    } catch (error) {
      Alert.alert('Error', 'Failed to block time');
    }
  };

  const handleBlockTimeDelete = async () => {
    try {
      if (selectedBlockedTime) {
        await deleteAppointment(selectedBlockedTime.id);
        Alert.alert('Success', 'Blocked time deleted successfully');
        setIsEditBlockTimeModalVisible(false);
        fetchAppointments(); // Refresh the appointments list
      }
    } catch (error) {
      console.error('Error deleting blocked time:', error);
      Alert.alert('Error', 'Failed to delete blocked time');
    }
  };

  // Add this function near the top of the component
  const getColorForAppointmentType = (type) => {
    // Skip if it's a blocked time appointment
    if (type === 'BLOCKED_TIME') {
      return 'rgba(255, 149, 0, 0.7)'; // Keep existing blocked time color
    }

    // Generate a consistent color based on the appointment type string
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
      hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate HSL color with consistent saturation and lightness
    const hue = Math.abs(hash % 360);
    return `hsla(${hue}, 70%, 45%, 0.9)`; // Adjusted saturation and lightness for better visibility
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
    const timeSlots = {};

    // Sort appointments by start time
    const sortedAppointments = [...appointments].sort((a, b) => {
      return new Date('1970/01/01 ' + a.startTime) - new Date('1970/01/01 ' + b.startTime);
    });

    let maxColumn = 0;

    sortedAppointments.forEach((appointment, index) => {
      const [startHour, startMinute] = appointment.startTime.split(':');
      const [endHour, endMinute] = appointment.endTime.split(':');
      
      const start = parseInt(startHour) % 12 + (appointment.startTime.includes('PM') ? 12 : 0) + parseInt(startMinute) / 60;
      const end = parseInt(endHour) % 12 + (appointment.endTime.includes('PM') ? 12 : 0) + parseInt(endMinute) / 60;
      
      const startPosition = (start - 9) * HOUR_HEIGHT;
      const endPosition = (end - 9) * HOUR_HEIGHT;
      const duration = endPosition - startPosition;

      let column = 0;
      while (timeSlots[`${startPosition}-${column}`]) {
        column++;
      }
      maxColumn = Math.max(maxColumn, column);

      for (let i = startPosition; i < endPosition; i += HOUR_HEIGHT / 4) {
        timeSlots[`${i}-${column}`] = appointment.id;
      }

      const isBlockedTime = appointment.appointmenttype === 'BLOCKED_TIME';
      const width = 350; // Fixed width for all appointments
      const left = column * 210; // 210 to add some space between appointments

      // Create formatted service text that includes add-ons
      const getFormattedServiceText = (appointment) => {
        if (appointment.appointmenttype === 'BLOCKED_TIME') {
          return appointment.details || 'No Details';
        }
        
        let serviceText = appointment.appointmenttype || 'No Type';
        if (appointment.addons && appointment.addons.length > 0) {
          // Split addons string if it's not already an array
          const addonArray = Array.isArray(appointment.addons) 
            ? appointment.addons 
            : appointment.addons.split(',');
          
          // Add each addon to the service text
          serviceText += addonArray.map(addon => ` + ${addon.trim()}`).join('');
        }
        return serviceText;
      };

      appointmentBlocks.push(
        <TouchableOpacity
          key={appointment.id}
          onPress={() => handleAppointmentPress(appointment)}
          onLongPress={() => {
            Vibration.vibrate(50);
            setIsDraggable(true);
            setActiveDragId(appointment.id);
          }}
          delayLongPress={300}
        >
          <PanGestureHandler
            enabled={isDraggable}
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={(event) => onPanHandlerStateChange(event, appointment)}
            minDist={10}
          >
            <Animated.View
              style={[
                { zIndex: activeDragId === appointment.id ? 1000 : 1 },
                activeDragId === appointment.id ? {
                  transform: [{ translateY: dragPositions[appointment.id] || 0 }]
                } : null
              ]}
            >
              <Animated.View
                style={[
                  styles.appointmentBlock,
                  {
                    top: startPosition,
                    height: Math.max(duration, 50),
                    backgroundColor: getColorForAppointmentType(appointment.appointmenttype),
                    width: width,
                    left: left,
                  },
                  activeDragId === appointment.id && {
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 4,
                    },
                    shadowOpacity: 0.3,
                    shadowRadius: 4.65,
                    elevation: 8,
                  }
                ]}
              >
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentName} numberOfLines={1} ellipsizeMode="tail">
                    {isBlockedTime ? 'Blocked Time' : (appointment.clientName || 'No Name')}
                  </Text>
                  <Text style={styles.appointmentType} numberOfLines={2} ellipsizeMode="tail">
                    {getFormattedServiceText(appointment)}
                  </Text>
                </View>
                <Text style={styles.appointmentTime}>
                  {activeDragId === appointment.id && dragTimes[appointment.id]
                    ? `${dragTimes[appointment.id].startTime} - ${dragTimes[appointment.id].endTime}`
                    : `${appointment.startTime || 'No Start'} - ${appointment.endTime || 'No End'}`}
                </Text>
              </Animated.View>
            </Animated.View>
          </PanGestureHandler>
        </TouchableOpacity>
      );
    });

    // Calculate the total width needed for all appointments
    const totalWidth = (maxColumn + 1) * 210; // 210 is the width of each column

    return (
      <View style={{ width: Math.max(totalWidth, 350) }}>
        {appointmentBlocks}
      </View>
    );
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

  const handleAddButtonPress = () => {
    setIsDropdownVisible(true);
  };

  const handleBlockTime = () => {
    setIsDropdownVisible(false);
    setIsBlockTimeModalVisible(true);
  };

  const handleCreateAppointment = () => {
    setIsDropdownVisible(false);
    navigation.navigate('AddAppointment', { selectedDate: date });
  };

  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const handleCustomDateSelect = (day) => {
    setShowCustomDatePicker(false);
    // Create date with timezone adjustment
    const selectedDate = new Date(day.timestamp + new Date().getTimezoneOffset() * 60000);
    setDate(selectedDate);
  };

  const renderCustomDatePicker = () => {
    return (
      <Modal
        transparent={true}
        visible={showCustomDatePicker}
        onRequestClose={() => setShowCustomDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowCustomDatePicker(false)}
        >
          <View style={styles.calendarModal}>
            <Calendar
              onDayPress={handleCustomDateSelect}
              current={date.toISOString()}
              markedDates={{
                [date.toISOString().split('T')[0]]: { selected: true }
              }}
              theme={{
                backgroundColor: '#2c2c2e',
                calendarBackground: '#2c2c2e',
                textSectionTitleColor: '#fff',
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: '#fff',
                todayTextColor: '#007AFF',
                dayTextColor: '#fff',
                textDisabledColor: '#444',
                monthTextColor: '#fff',
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, [date]);

  // Add a new state variable to track which modal to show
  const [isEditBlockTimeModalVisible, setIsEditBlockTimeModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerDay}>{formatDay(date)}</Text>
        <View style={styles.headerDateContainer}>
          <TouchableOpacity onPress={() => setShowCustomDatePicker(true)}>
            <View style={styles.datePickerButton}>
              <Text style={styles.headerDate}>{formatDate(date)}</Text>
              <Ionicons name="calendar" size={24} color="white" style={styles.calendarIcon} />
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddButtonPress}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewToggleButton} onPress={toggleViewMode}>
          <Ionicons name={viewMode === 'list' ? 'card' : 'list'} size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {renderCustomDatePicker()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : viewMode === 'list' ? (
        appointments.length === 0 ? (
          <View style={styles.noAppointmentsContainer}>
            <Text style={styles.noAppointmentsText}>No appointments scheduled today</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.calendarContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#007AFF"
                colors={["#007AFF"]}
              />
            }
          >
            <View style={styles.timelineContainer}>
              <View style={styles.timeline}>
                {renderTimeSlots()}
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <View style={styles.appointmentsContainer}>
                  {renderAppointments()}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        )
      ) : (
        <View style={styles.cardView}>
          {appointments.length > 0 ? (
            <>
              <ClientCardView
                appointment={appointments[currentAppointmentIndex]}
                onDelete={fetchAppointments}
                allAppointments={appointments}
                currentIndex={currentAppointmentIndex}
                setCurrentIndex={setCurrentAppointmentIndex}
              />
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
            <View style={styles.noAppointmentsContainer}>
              <Text style={styles.noAppointmentsText}>No appointments scheduled today</Text>
            </View>
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

      {/* Modal for creating new blocked times */}
      <BlockTimeModal
        isVisible={isBlockTimeModalVisible}
        onClose={() => setIsBlockTimeModalVisible(false)}
        onSubmit={handleBlockTimeSubmit}
      />

      {/* Modal for editing existing blocked times */}
      <EditBlockedTimeModal
        isVisible={isEditBlockTimeModalVisible}
        onClose={() => setIsEditBlockTimeModalVisible(false)}
        onSubmit={handleBlockTimeSubmit}
        onDelete={handleBlockTimeDelete}
        blockedTime={selectedBlockedTime}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    paddingTop: 40, // Reduced from 0 to add some padding at the top
    backgroundColor: '#1c1c1e' 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 20, // Reduced from 80 to remove extra space
  },
  headerDay: { 
    color: '#007AFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  headerDateContainer: { 
    backgroundColor: '#007AFF', 
    borderRadius: 50, 
    padding: 8,  // Reduced from 10
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',  // Limit the width to prevent overlapping
  },
  headerDate: { 
    color: 'white', 
    fontSize: 20,  // Reduced from 24
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
    marginTop: -50, // Move the container up
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    height: '100%', // Make sure it takes full height
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
    position: 'relative',
    minWidth: '100%', // Ensure it's at least as wide as the screen
  },
  appointmentBlock: {
    position: 'absolute',
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#0056b3',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    flex: 1,  // Allow text to take up available space
    marginLeft: 4,  // Add some spacing from the name
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,  // Reduced from 15
  },
  calendarIcon: {
    marginLeft: 6,  // Reduced from 8
    size: 20,  // Reduced from 24
  },
  calendarModal: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
});

export default CalendarScreen;