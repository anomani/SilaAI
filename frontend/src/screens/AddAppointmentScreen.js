import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
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

  const handleInputChange = async (field, value) => {
    setAppointment({ ...appointment, [field]: value });
    if (field === 'clientName') {
      const data = await searchClients(value);
      setFilteredClients([{ id: 'new', firstName: 'New', lastName: 'Client' }, ...data]);
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
      setAppointment({ ...appointment, clientName: `${item.firstName} ${item.lastName}` });
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
              <Text style={styles.itemText}>{item.firstName} {item.lastName}</Text>
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
      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <Text style={styles.input}>
          {appointment.date.toLocaleDateString('en-US')}
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
  }
});

export default AddAppointmentScreen;
