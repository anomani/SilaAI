import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert, Animated, Vibration } from 'react-native';
import { getAppointmentsByDay, getClientById, createBlockedTime, deleteAppointment, rescheduleAppointment } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import RescheduleConfirmModal from '../components/RescheduleConfirmModal';
import BlockTimeModal from '../components/BlockTimeModal';
import ClientCardView from '../components/ClientCardView';


const CalendarScreen = ({ navigation }) => {
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

  // Add this constant at the top of the component
  const HOUR_HEIGHT = 100; // Height of each hour slot in pixels
  const TOTAL_HOURS = 12; // Number of hours to display (9 AM to 9 PM)

  // Calculate the total height
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

  useEffect(() => {
    fetchAppointments();
  }, [date]);

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
      
      const start = parseInt(startHour) % 12 + (appointment.startTime.includes('PM') ? 12 : 0) + parseInt(startMinute) / 60;
      const end = parseInt(endHour) % 12 + (appointment.endTime.includes('PM') ? 12 : 0) + parseInt(endMinute) / 60;
      
      const duration = end - start;
      const topPosition = (start - 9) * 100; // 100px per hour

      const isBlockedTime = appointment.appointmenttype === 'BLOCKED_TIME';

      const animatedStyle = {
        transform: [
          {
            translateY: panY.interpolate({
              inputRange: [-1000, 0, 1000],
              outputRange: [-1000, 0, 1000],
              extrapolate: 'clamp',
            }),
          },
        ],
      };

      appointmentBlocks.push(
        <PanGestureHandler
          key={appointment.id}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={(event) => onPanHandlerStateChange(event, appointment)}
          minDist={10} // Minimum distance to start the gesture
        >
          <Animated.View style={[
            { zIndex: activeDragId === appointment.id ? 1000 : 1 },
            activeDragId === appointment.id ? {
              transform: [{ translateY: dragPositions[appointment.id] || 0 }]
            } : null
          ]}>
            <TouchableOpacity
              onPress={() => {
                if (isBlockedTime) {
                  Alert.alert(
                    "Delete Blocked Time",
                    "Are you sure you want to delete this blocked time?",
                    [
                      {
                        text: "Cancel",
                        style: "cancel"
                      },
                      { 
                        text: "OK", 
                        onPress: async () => {
                          try {
                            await deleteAppointment(appointment.id);
                            fetchAppointments(); // Refresh the appointments list
                          } catch (error) {
                            console.error('Failed to delete blocked time:', error);
                            Alert.alert('Error', 'Failed to delete blocked time. Please try again.');
                          }
                        }
                      }
                    ]
                  );
                } else {
                  navigation.navigate('AppointmentDetails', { appointment });
                }
              }}
            >
              <Animated.View
                style={[
                  styles.appointmentBlock,
                  {
                    top: topPosition,
                    height: Math.max(duration * 100, 50), // Minimum height of 50px
                    backgroundColor: isBlockedTime ? 'rgba(255, 149, 0, 0.7)' : '#007AFF', // Semi-transparent orange for blocked time
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
                  <Text style={styles.appointmentType} numberOfLines={1} ellipsizeMode="tail">
                    {isBlockedTime ? (appointment.details || 'No Details') : (appointment.appointmenttype || 'No Type')}
                  </Text>
                </View>
                <Text style={styles.appointmentTime}>
                  {activeDragId === appointment.id && dragTimes[appointment.id]
                    ? `${dragTimes[appointment.id].startTime} - ${dragTimes[appointment.id].endTime}`
                    : `${appointment.startTime || 'No Start'} - ${appointment.endTime || 'No End'}`}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
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

  const handleBlockTimeSubmit = async (blockedTimeData) => {
    try {
      await createBlockedTime(blockedTimeData);
      Alert.alert('Success', 'Time blocked successfully');
      setIsBlockTimeModalVisible(false);
      fetchAppointments(); // Refresh the appointments list
    } catch (error) {
      Alert.alert('Error', 'Failed to block time');
    }
  };

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
        appointments.length === 0 ? (
          <View style={styles.noAppointmentsContainer}>
            <Text style={styles.noAppointmentsText}>No appointments scheduled today</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.calendarContainer}
            contentContainerStyle={{ height: totalHeight }}
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
        )
      ) : (
        <View style={styles.cardView}>
          {appointments.length > 0 ? (
            <>
              <ClientCardView
                appointment={appointments[currentAppointmentIndex]}
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

      <BlockTimeModal
        isVisible={isBlockTimeModalVisible}
        onClose={() => setIsBlockTimeModalVisible(false)}
        onSubmit={handleBlockTimeSubmit}
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
});

export default CalendarScreen;