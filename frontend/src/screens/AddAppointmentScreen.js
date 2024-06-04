import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addAppointment } from '../services/api';

const AddAppointmentScreen = ({ navigation }) => {
  const [appointment, setAppointment] = useState({
    appointmentType: '',
    clientId: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    details: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const handleInputChange = (field, value) => {
    setAppointment({ ...appointment, [field]: value });
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || appointment.date;
    setShowDatePicker(false);
    setAppointment({ ...appointment, date: currentDate });
  };

  const handleStartTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || appointment.startTime;
    setShowStartTimePicker(false);
    setAppointment({ ...appointment, startTime: currentTime });
  };

  const handleEndTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || appointment.endTime;
    setShowEndTimePicker(false);
    setAppointment({ ...appointment, endTime: currentTime });
  };

  const handleAddAppointment = async () => {
    const adjustTime = (date) => {
      const adjustedDate = new Date(date);
      adjustedDate.setHours(adjustedDate.getHours() - 4);
      return adjustedDate;
    };

    const appointmentToSubmit = {
      appointmentType: appointment.appointmentType.toString(),
      clientId: appointment.clientId.toString(),
      date: appointment.date.toISOString().split('T')[0], // YYYY-MM-DD
      startTime: adjustTime(appointment.startTime).toISOString().split('T')[1].slice(0, 5), // HH:MM
      endTime: adjustTime(appointment.endTime).toISOString().split('T')[1].slice(0, 5), // HH:MM
      details: appointment.details.toString()
    };

    try {
      await addAppointment(appointmentToSubmit);
      navigation.goBack();
    } catch (error) {
      console.error('Error adding appointment:', error);
    }
  };

  // Add a function to format the date
  const formatDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Client</Text>
      <TextInput
        style={styles.input}
        value={appointment.clientId}
        onChangeText={(value) => handleInputChange('clientId', value)}
        placeholder="Client"
        placeholderTextColor="#888"
      />
      <Text style={styles.label}>Date</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <Text style={styles.input}>
          {formatDate(appointment.date)}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={appointment.date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      <Text style={styles.label}>Starts at</Text>
      <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
        <Text style={styles.input}>
          {appointment.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
      {showStartTimePicker && (
        <DateTimePicker
          value={appointment.startTime}
          mode="time"
          display="default"
          onChange={handleStartTimeChange}
        />
      )}
      <Text style={styles.label}>Ends at</Text>
      <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
        <Text style={styles.input}>
          {appointment.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
      {showEndTimePicker && (
        <DateTimePicker
          value={appointment.endTime}
          mode="time"
          display="default"
          onChange={handleEndTimeChange}
        />
      )}
      <Text style={styles.label}>Appointment Type</Text>
      <TextInput
        style={styles.input}
        value={appointment.appointmentType}
        onChangeText={(value) => handleInputChange('appointmentType', value)}
        placeholder="Appointment Type"
        placeholderTextColor="#888"
      />
      <Text style={styles.label}>Add details</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={appointment.details}
        onChangeText={(value) => handleInputChange('details', value)}
        placeholder="Notes"
        placeholderTextColor="#888"
        multiline
      />
      <Button title="Add Appointment" onPress={handleAddAppointment} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1c1c1e'
  },
  label: {
    fontSize: 16,
    marginVertical: 8,
    color: '#fff'
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    padding: 8,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    color: '#fff'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  }
});

export default AddAppointmentScreen;