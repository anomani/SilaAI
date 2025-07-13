import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert, Animated, Vibration, TextInput, RefreshControl, Dimensions } from 'react-native';
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
  const TOTAL_HOURS = 14;

  const totalHeight = HOUR_HEIGHT * TOTAL_HOURS;

  const [activeDragId, setActiveDragId] = useState(null);
  const panY = useRef(new Animated.Value(0)).current;

  const [dragPositions, setDragPositions] = useState({});
  const [dragTimes, setDragTimes] = useState({});

  const visibleHeight = HOUR_HEIGHT * 14; // 14 hours visible (8 AM to 9 PM)

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
      // Format date directly without timezone adjustment
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
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
    return appointments.reduce((total, appointment) => {
      const price = Number(appointment.price) || 0;
      const tip = Number(appointment.tipamount) || 0;
      return total + price + tip;
    }, 0).toFixed(2);
  };


  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'card' : 'list');
  };




  const renderTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
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

  const getColorForAppointmentType = (type) => {
    if (type === 'BLOCKED_TIME') {
      return 'rgba(72, 72, 74, 0.7)';
    }

    // Generate a consistent color based on the appointment type string
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
      hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate HSL color with muted saturation and lightness for less brightness
    const hue = Math.abs(hash % 360);
    return `hsla(${hue}, 50%, 40%, 0.85)`; // Reduced saturation and lightness for softer colors
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

    // Helper function to check if two appointments overlap
    const appointmentsOverlap = (app1, app2) => {
      const convertToMinutes = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const app1Start = convertToMinutes(app1.startTime);
      const app1End = convertToMinutes(app1.endTime);
      const app2Start = convertToMinutes(app2.startTime);
      const app2End = convertToMinutes(app2.endTime);

      return app1Start < app2End && app2Start < app1End;
    };

    // Calculate overlapping groups
    const overlappingGroups = [];
    const processedAppointments = new Set();

    sortedAppointments.forEach((appointment, index) => {
      if (processedAppointments.has(appointment.id)) return;

      const overlappingGroup = [appointment];
      processedAppointments.add(appointment.id);

      // Find all appointments that overlap with this one
      for (let i = index + 1; i < sortedAppointments.length; i++) {
        const otherAppointment = sortedAppointments[i];
        if (processedAppointments.has(otherAppointment.id)) continue;

        // Check if it overlaps with any appointment in the current group
        const overlapsWithGroup = overlappingGroup.some(groupApp => 
          appointmentsOverlap(groupApp, otherAppointment)
        );

        if (overlapsWithGroup) {
          overlappingGroup.push(otherAppointment);
          processedAppointments.add(otherAppointment.id);
        }
      }

      overlappingGroups.push(overlappingGroup);
    });

    // Calculate screen dimensions
    const screenWidth = Dimensions.get('window').width;
    const timelineWidth = 50; // Reduced timeline width
    const containerPadding = 0; // No container padding now
    const availableWidth = screenWidth - timelineWidth - containerPadding;

    // Render each group
    overlappingGroups.forEach(group => {
      const groupSize = group.length;
      const columnWidth = availableWidth / groupSize;
      const minWidth = Math.max(columnWidth - 4, 120); // Minimum width with minimal spacing

      group.forEach((appointment, columnIndex) => {
        const [startHour, startMinute] = appointment.startTime.split(':');
        const [endHour, endMinute] = appointment.endTime.split(':');
        
        const start = parseInt(startHour) % 12 + (appointment.startTime.includes('PM') ? 12 : 0) + parseInt(startMinute) / 60;
        const end = parseInt(endHour) % 12 + (appointment.endTime.includes('PM') ? 12 : 0) + parseInt(endMinute) / 60;
        
        const startPosition = (start - 8) * HOUR_HEIGHT;
        const endPosition = (end - 8) * HOUR_HEIGHT;
        const duration = endPosition - startPosition;

        const isBlockedTime = appointment.appointmenttype === 'BLOCKED_TIME';
        
        // Calculate width and position - start right at the edge of timeline
        const width = groupSize === 1 ? availableWidth - 8 : minWidth; // Full width if no overlaps
        const left = groupSize === 1 ? 4 : columnIndex * columnWidth + 2; // Start right next to timeline

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
                    isBlockedTime && styles.blockedTimeBlock,
                    {
                      top: startPosition,
                      height: Math.max(duration, 60), // Minimum height increased
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
                  <Text style={styles.appointmentTime} numberOfLines={1}>
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
    });

    return (
      <View style={{ width: '100%' }}>
        {appointmentBlocks}
      </View>
    );
  };

  const renderCurrentTimeLine = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timePosition = ((hours - 8) + minutes / 60) * 100;

    // Check if the selected date is today
    const isToday = date.toDateString() === now.toDateString();

    if (isToday && hours >= 8 && hours < 21) {
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
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: '#ffffff',
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#007AFF',
                dayTextColor: '#ffffff',
                textDisabledColor: '#48484a',
                monthTextColor: '#ffffff',
                arrowColor: '#007AFF',
                indicatorColor: '#007AFF',
                textDayFontWeight: '600',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
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
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.actionButton} onPress={toggleViewMode}>
          <Ionicons 
            name={viewMode === 'list' ? 'apps' : 'calendar'} 
            size={20} 
            color="#ffffff" 
          />
        </TouchableOpacity>
        
        <View style={styles.dateSection}>
          <TouchableOpacity onPress={() => setShowCustomDatePicker(true)} style={styles.dateButton}>
            <Text style={styles.dayLabel}>{formatDay(date)}</Text>
            <Text style={styles.dateLabel}>{formatDate(date)}</Text>
            <Ionicons name="chevron-down" size={16} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleAddButtonPress}>
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>


      {/* Day Navigation - Only show in list view */}
      {viewMode === 'list' && (
        <View style={styles.dayNavigation}>
          <TouchableOpacity style={styles.navArrow} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={20} color="#8e8e93" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navArrow} onPress={() => changeDate(1)}>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {renderCustomDatePicker()}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        ) : viewMode === 'list' ? (
          appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#48484a" />
              <Text style={styles.emptyStateTitle}>No appointments today</Text>
              <Text style={styles.emptyStateSubtitle}>Tap the + button to create your first appointment</Text>
            </View>
          ) : (
            <>
              <ScrollView 
                style={styles.timelineScrollView}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#007AFF"
                    colors={["#007AFF"]}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.timelineWrapper}>
                  <View style={styles.timelineContainer}>
                    <View style={styles.timeline}>
                      {renderTimeSlots()}
                    </View>
                    <View style={styles.appointmentsContainer}>
                      {renderAppointments()}
                      {renderCurrentTimeLine()}
                    </View>
                  </View>
                </View>
              </ScrollView>
              
              {/* Quick Stats - Show below appointments in list view */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{appointments.length}</Text>
                  <Text style={styles.statLabel}>Appts</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>${calculateDailyTotal()}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
            </>
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
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#48484a" />
                <Text style={styles.emptyStateTitle}>No appointments today</Text>
                <Text style={styles.emptyStateSubtitle}>Tap the + button to create your first appointment</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Footer navigation={navigation} />
      
      {/* Modals */}
      <RescheduleConfirmModal
        isVisible={isRescheduleModalVisible}
        appointment={draggedAppointment}
        newTime={newAppointmentTime}
        onConfirm={confirmReschedule}
        onCancel={() => setIsRescheduleModalVisible(false)}
      />

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
              <Ionicons name="time-outline" size={20} color="#ffffff" style={styles.dropdownIcon} />
              <Text style={styles.dropdownItemText}>Block Time</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleCreateAppointment}>
              <Ionicons name="person-add-outline" size={20} color="#ffffff" style={styles.dropdownIcon} />
              <Text style={styles.dropdownItemText}>New Appointment</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <BlockTimeModal
        isVisible={isBlockTimeModalVisible}
        onClose={() => setIsBlockTimeModalVisible(false)}
        onSubmit={handleBlockTimeSubmit}
      />

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
    backgroundColor: '#000000',
  },
  
  // New Top Bar Design
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.3)',
  },
  
  dateSection: {
    flex: 1,
    alignItems: 'center',
  },
  
  dateButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  dayLabel: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  
  dateLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16, // Add padding back here since we removed it from mainContent
    paddingVertical: 8,
    gap: 8,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.15)',
  },
  
  statNumber: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  
  statLabel: {
    color: '#8e8e93',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  
  // Day Navigation
  dayNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16, // Add padding back here since we removed it from mainContent
    paddingVertical: 6,
    gap: 16,
  },
  
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  todayButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  
  todayButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Main Content Area
  mainContent: {
    flex: 1,
    paddingHorizontal: 0, // Remove horizontal padding
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  
  loadingText: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  
  emptyStateTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  
  emptyStateSubtitle: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Card View Styles
  cardView: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 16, // Add padding for card view
  },
  
  cardNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 20,
  },
  
  cardNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.3)',
  },
  
  disabledButton: {
    opacity: 0.5,
  },
  
  cardCounter: {
    flex: 1,
    alignItems: 'center',
  },
  
  cardCounterText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Timeline Styles
  timelineScrollView: {
    flex: 1,
  },
  
  timelineWrapper: {
    paddingBottom: 40,
  },
  
  timelineContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    borderRadius: 20,
    marginHorizontal: 0, // Remove horizontal margins
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.1)',
  },
  
  timeline: {
    width: 50, // Reduced from 60
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(84, 84, 88, 0.15)',
  },
  
  timeSlot: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(84, 84, 88, 0.1)',
    paddingHorizontal: 4, // Reduced padding
  },
  
  timeText: {
    color: '#8e8e93',
    fontSize: 10, // Slightly smaller to fit better
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  appointmentsContainer: {
    position: 'relative',
    flex: 1,
    minHeight: 1400,
    paddingLeft: 0, // Remove left padding
    paddingRight: 4, // Minimal right padding
  },
  
  appointmentBlock: {
    position: 'absolute',
    padding: 12, // Reduced padding for better text fit
    borderRadius: 14,
    backgroundColor: '#007AFF',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden', // Prevent text overflow
  },
  
  blockedTimeBlock: {
    borderWidth: 2,
    borderColor: 'rgba(142, 142, 147, 0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(72, 72, 74, 0.7)',
    shadowOpacity: 0.1,
  },
  
  appointmentHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 4, // Reduced margin
    flex: 1,
  },
  
  appointmentName: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 3, // Reduced margin
    letterSpacing: 0.2,
    flexShrink: 1, // Allow text to shrink
  },
  
  appointmentType: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11, // Slightly smaller font
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 14, // Tighter line height
    flexShrink: 1, // Allow text to shrink
    flex: 1,
  },
  
  appointmentTime: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2, // Reduced margin
    letterSpacing: 0.2,
    flexShrink: 0, // Don't shrink time text
  },
  
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#ff453a',
    zIndex: 1000,
    shadowColor: '#ff453a',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 12,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  dropdown: {
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 20,
    padding: 12,
    width: '80%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    marginVertical: 4,
    backgroundColor: 'rgba(44, 44, 46, 0.3)',
  },
  
  dropdownIcon: {
    marginRight: 12,
  },
  
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Calendar Modal
  calendarModal: {
    backgroundColor: 'rgba(18, 18, 18, 0.98)',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.2)',
  },
});

export default CalendarScreen;