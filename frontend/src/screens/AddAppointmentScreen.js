import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Autocomplete from 'react-native-autocomplete-input';
import { bookAppointmentWithAcuity, searchClients } from '../services/api';
import CustomTimePicker from '../components/CustomTimePicker';
import { Modal, FlatList } from 'react-native';

const AddAppointmentScreen = ({ navigation }) => {
  const [appointment, setAppointment] = useState({
    appointmentType: '',
    clientName: '',
    date: new Date(),
    startTime: '00:00',
    endTime: '00:00',
    details: '',
    price: '' // Add price field
  });
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null); // Add these to your state declarations
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
      navigation.navigate('AddClient');
    } else {
      setAppointment({ ...appointment, clientName: `${item.firstname} ${item.lastname}` });
      setSelectedClientId(item.id);
      setSelectedClient(item); // Store the entire client object
    }
    setFilteredClients([]);
  };

  const handleClientAdded = (clientId, clientData) => {
    setSelectedClientId(clientId);
    setSelectedClient(clientData);
    setAppointment({ ...appointment, clientName: `${clientData.firstname} ${clientData.lastname}` });
  };

  const handleAddAppointment = async () => {
    try {
      if (!selectedClient) {
        throw new Error('No client selected');
      }

      const appointmentData = {
        date: appointment.date.toISOString().split('T')[0], // YYYY-MM-DD format
        startTime: appointment.startTime,
        fname: selectedClient.firstname,
        lname: selectedClient.lastname,
        phone: selectedClient.phonenumber,
        email: selectedClient.email,
        appointmentType: appointment.appointmentType,
        price: parseFloat(appointment.price),
        addOnArray: appointment.addOns || []
      };
      console.log(appointmentData)
      const result = await bookAppointmentWithAcuity(appointmentData);

      console.log('Appointment booked:', result);
      navigation.goBack();
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Booking Error', 'Failed to book appointment. Please try again.');
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
    { label: 'Adult Cut', value: 'Adult Cut' },
    { label: 'High-School Cut', value: 'High-School Cut' },
    { label: 'Kids Cut - (12 & Under)', value: 'Kids Cut - (12 & Under)' },
    { label: 'Lineup + Taper', value: 'Lineup + Taper' },
    { label: 'Beard Grooming Only', value: 'Beard Grooming Only' },
    { label: 'Adult - (Full Service)', value: 'Adult - (Full Service)' },
    { label: 'OFF DAY/EMERGENCY - (Full Service)', value: 'OFF DAY/EMERGENCY - (Full Service)' },
    { label: 'Hair Cut', value: 'Hair Cut' },
    { label: 'Hair Cut + Beard', value: 'Hair Cut + Beard' },
    { label: 'Haircut + Beard', value: 'Haircut + Beard' },
    { label: 'High-School - (Full Service)', value: 'High-School - (Full Service)' },
    { label: 'Kids - (12 & Under)/Seniors', value: 'Kids - (12 & Under)/Seniors' },
    { label: 'UziExpress Clean Up', value: 'UziExpress Clean Up' },
    { label: 'Adult Haircut (18 & Up)', value: 'Adult Haircut (18 & Up)' },
    { label: 'Adult Haircut + Beard (18 & Up)', value: 'Adult Haircut + Beard (18 & Up)' },
    { label: 'Student Haircut (17 & Under)', value: 'Student Haircut (17 & Under)' },
    { label: 'Student Haircut + Beard (17 & Under)', value: 'Student Haircut + Beard (17 & Under)' },
  ];

  const renderAppointmentTypePicker = () => (
    <Modal
      visible={showAppointmentTypePicker}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <FlatList
            data={appointmentTypes}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  handleAppointmentTypeChange(item.value);
                  setShowAppointmentTypePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowAppointmentTypePicker(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
      {renderAppointmentTypePicker()}
      <Text style={styles.label}>Add details</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={appointment.details}
        onChangeText={(value) => handleInputChange('details', value)}
        placeholder="Notes"
        placeholderTextColor="#888"
        multiline
      />
      <Text style={styles.label}>Price</Text>
      <TextInput
        style={styles.input}
        value={appointment.price}
        onChangeText={(value) => handleInputChange('price', value)}
        placeholder="Price"
        placeholderTextColor="#888"
        keyboardType="numeric"
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#444',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default AddAppointmentScreen;