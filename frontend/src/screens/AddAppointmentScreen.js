import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Autocomplete from 'react-native-autocomplete-input';
import { addAppointment, searchClients } from '../services/api';
import CustomTimePicker from '../components/CustomTimePicker';

const AddAppointmentScreen = ({ navigation }) => {
  const [appointment, setAppointment] = useState({
    appointmentType: '',
    clientName: '',
    date: new Date(),
    startTime: '00:00',
    endTime: '00:00',
    details: ''
  });
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [showAppointmentTypePicker, setShowAppointmentTypePicker] = useState(false);

  const handleInputChange = async (field, value) => {
    setAppointment({ ...appointment, [field]: value });
    if (field === 'clientName') {
      const data = await searchClients(value);
      setFilteredClients([{ id: 'new', firstname: 'New', lastname: 'Client' }, ...data]);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || appointment.date;
    setShowDatePicker(false);
    setAppointment({ ...appointment, date: currentDate });
  };

  const handleStartTimeChange = (time) => {
    setAppointment({ ...appointment, startTime: time });
    setShowStartTimePicker(false);
  };

  const handleEndTimeChange = (time) => {
    setAppointment({ ...appointment, endTime: time });
    setShowEndTimePicker(false);
  };

  const handleSelectClient = (item) => {
    if (item.id === 'new') {
      navigation.navigate('AddClient'); // Navigate to the add client screen
    } else {
      setAppointment({ ...appointment, clientName: `${item.firstname} ${item.lastname}` });
      setSelectedClientId(item.id); // Store the selected client ID
    }
    setFilteredClients([]); // Clear the dropdown
  };

  const handleClientAdded = (clientId, clientName) => {
    setSelectedClientId(clientId);
    setAppointment({ ...appointment, clientName });
  };

  const handleAddAppointment = async () => {
    const formatDate = (date) => {
      return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    };

    const appointmentToSubmit = {
      appointmentType: appointment.appointmentType.toString(),
      clientName: appointment.clientName.toString(),
      clientId: selectedClientId, // Include the selected client ID
      date: formatDate(appointment.date), // YYYY-MM-DD
      startTime: appointment.startTime, // HH:MM
      endTime: appointment.endTime, // HH:MM
      details: appointment.details.toString()
    };

    try {
      await addAppointment(appointmentToSubmit);
      navigation.goBack();
    } catch (error) {
      console.error('Error adding appointment:', error);
    }
  };

  const handleAppointmentTypeChange = (itemValue) => {
    handleInputChange('appointmentType', itemValue);
    setShowAppointmentTypePicker(false);
  };

  const handleDatePress = () => {
    if (Platform.OS === 'ios') {
      setShowDatePicker(true);
    } else {
      showAndroidDatePicker();
    }
  };

  const showAndroidDatePicker = async () => {
    try {
      const { action, year, month, day } = await DateTimePicker.open({
        value: appointment.date,
        mode: 'date',
      });
      if (action !== DateTimePicker.dismissedAction) {
        const selectedDate = new Date(year, month, day);
        handleDateChange(null, selectedDate);
      }
    } catch (error) {
      console.warn('Error opening date picker', error);
    }
  };

  const appointmentTypes = [
    { label: 'Adult Cut', value: 'adultCut' },
    { label: 'High-School Cut', value: 'highSchoolCut' },
    { label: 'Kids Cut', value: 'kidsCut' },
    { label: 'Lineup + Taper', value: 'lineupTaper' },
    { label: 'Beard Grooming Only', value: 'beardGroomingOnly' },
    { label: 'Adult - (Full Service)', value: 'adultFullService' },
    { label: 'OFF DAY/EMERGENCY - (Full Service)', value: 'offDayEmergency' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Client Name</Text>
      <Autocomplete
        data={filteredClients}
        defaultValue={appointment.clientName}
        onChangeText={(value) => handleInputChange('clientName', value)}
        flatListProps={{
          keyExtractor: item => item.id,
          renderItem: ({ item }) => (
            <TouchableOpacity onPress={() => handleSelectClient(item)}>
              <Text style={styles.itemText}>{item.firstname} {item.lastname}</Text>
            </TouchableOpacity>
          ),
        }}
        inputContainerStyle={[styles.inputContainer, { backgroundColor: '#2c2c2e', borderColor: '#444', borderWidth: 1, borderRadius: 8 }]}
        placeholder="Client Name"
        placeholderTextColor="#888"
        renderTextInput={(props) => (
          <TextInput
            {...props}
            style={[styles.input, { color: '#fff' }]}
          />
        )}
        listStyle={styles.listStyle}
      />
      <Text style={styles.label}>Date</Text>
      <TouchableOpacity onPress={handleDatePress}>
        <Text style={[styles.input, styles.inputText]}>
          {appointment.date.toLocaleDateString('en-US')}
        </Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={appointment.date}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          themeVariant="dark"
        />
      )}
      <Text style={styles.label}>Starts at</Text>
      <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
        <Text style={styles.input}>
          {appointment.startTime}
        </Text>
      </TouchableOpacity>
      {showStartTimePicker && (
        <CustomTimePicker
          visible={showStartTimePicker}
          onClose={() => setShowStartTimePicker(false)}
          onSelect={handleStartTimeChange}
        />
      )}
      <Text style={styles.label}>Ends at</Text>
      <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
        <Text style={styles.input}>
          {appointment.endTime}
        </Text>
      </TouchableOpacity>
      {showEndTimePicker && (
        <CustomTimePicker
          visible={showEndTimePicker}
          onClose={() => setShowEndTimePicker(false)}
          onSelect={handleEndTimeChange}
        />
      )}
      <Text style={styles.label}>Appointment Type</Text>
      <TouchableOpacity 
        style={styles.input}
        onPress={() => setShowAppointmentTypePicker(true)}
      >
        <Text style={[styles.inputText, { color: '#fff' }]}>
          {appointmentTypes.find(type => type.value === appointment.appointmentType)?.label || 'Select Appointment Type'}
        </Text>
      </TouchableOpacity>
      {showAppointmentTypePicker && (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={appointment.appointmentType}
            style={styles.picker}
            onValueChange={handleAppointmentTypeChange}
            dropdownIconColor="#fff"
          >
            {appointmentTypes.map((type) => (
              <Picker.Item key={type.value} label={type.label} value={type.value} color="#fff" />
            ))}
          </Picker>
        </View>
      )}
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
    backgroundColor: '#1c1c1e',
    paddingTop: 50, // Add paddingTop
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
  },
  inputContainer: {
    marginVertical: 8
  },
  itemText: {
    fontSize: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    color: '#333'
  },
  listStyle: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 5
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    marginVertical: 8,
  },
  picker: {
    color: '#fff',
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default AddAppointmentScreen;
