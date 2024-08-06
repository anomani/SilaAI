import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Autocomplete from 'react-native-autocomplete-input';
import { bookAppointmentWithAcuity, searchClients, addAppointment } from '../services/api';
import { Modal, FlatList } from 'react-native';

// Add these temporary definitions
const appointmentTypes = [
  { value: "Adult - (Full Service)", label: "Adult - (Full Service)" },
  { value: "OFF DAY/EMERGENCY - (Full Service)", label: "OFF DAY/EMERGENCY - (Full Service)" },
  { value: "Adult Cut", label: "Adult Cut" },
  { value: "High-School Cut", label: "High-School Cut" },
  { value: "Kids Cut - (12 & Under)", label: "Kids Cut - (12 & Under)" },
  { value: "Lineup + Taper", label: "Lineup + Taper" },
  { value: "Beard Grooming Only", label: "Beard Grooming Only" },
];

const addOns = {
  "Beard Grooming": { id: 187938, price: 20, duration: 15 },
  "Beard Grooming for Lineup + Taper": { id: 1128808, price: 0, duration: 0 },
  "Colour Enhancement": { id: 187944, price: 20, duration: 15 },
  "Hot Towel + Black Mask Treatment for Clogged Pores": { id: 187941, price: 10, duration: 0 },
  "Wax - Hair Removal": { id: 1128727, price: 5, duration: 0 }
};

const AddAppointmentScreen = ({ navigation }) => {
  const [appointment, setAppointment] = useState({
    appointmentType: '',
    clientName: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    details: '',
    price: ''
  });
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAppointmentTypePicker, setShowAppointmentTypePicker] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [showAddOnsPicker, setShowAddOnsPicker] = useState(false);

  const handleInputChange = async (field, value) => {
    setAppointment({ ...appointment, [field]: value });
    if (field === 'clientName') {
      const data = await searchClients(value);
      setFilteredClients([{ id: 'new', firstname: 'New', lastname: 'Client' }, ...data]);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || appointment.date;
    setShowDatePicker(Platform.OS === 'ios');
    setAppointment({ ...appointment, date: currentDate });
  };

  const handleStartTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || appointment.startTime;
    setShowStartTimePicker(Platform.OS === 'ios');
    setAppointment({ ...appointment, startTime: currentTime });
  };

  const handleEndTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || appointment.endTime;
    setShowEndTimePicker(Platform.OS === 'ios');
    setAppointment({ ...appointment, endTime: currentTime });
  };

  const handleSelectClient = (item) => {
    if (item.id === 'new') {
      navigation.navigate('AddClient');
    } else {
      setAppointment({ ...appointment, clientName: `${item.firstname} ${item.lastname}` });
      setSelectedClientId(item.id);
      setSelectedClient(item);
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

      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };

      const formatTime = (date) => {
        return date.toTimeString().split(' ')[0].slice(0, 5);
      };
      if(!selectedClient.email) {
        selectedClient.email = ''
      }
      const appointmentData = {
        date: formatDate(appointment.date),
        startTime: formatTime(appointment.startTime),
        fname: selectedClient.firstname,
        lname: selectedClient.lastname,
        phone: selectedClient.phonenumber,
        email: selectedClient.email,
        appointmentType: appointment.appointmentType,
        price: parseFloat(appointment.price),
        addOnArray: selectedAddOns.map(addOn => ({
          id: addOns[addOn].id,
          price: addOns[addOn].price,
          duration: addOns[addOn].duration
        }))
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

  const handleAddOnChange = (selectedAddOn) => {
    setSelectedAddOns(prevAddOns => {
      if (prevAddOns.includes(selectedAddOn)) {
        return prevAddOns.filter(addon => addon !== selectedAddOn);
      } else {
        return [...prevAddOns, selectedAddOn];
      }
    });
  };

  const addOnOptions = Object.keys(addOns).map(key => ({
    label: key,
    value: key,
    price: addOns[key].price,
    duration: addOns[key].duration
  }));

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

  const renderAddOnsPicker = () => (
    <Modal
      visible={showAddOnsPicker}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <FlatList
            data={addOnOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => handleAddOnChange(item.value)}
              >
                <Text style={[
                  styles.pickerItemText,
                  selectedAddOns.includes(item.value) && styles.selectedPickerItemText
                ]}>
                  {item.label} (${item.price}, {item.duration} min)
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowAddOnsPicker(false)}
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
      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <Text style={[styles.input, styles.inputText]}>
          {appointment.date.toLocaleDateString('en-US')}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          testID="datePicker"
          value={appointment.date}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={handleDateChange}
          themeVariant="dark"
        />
      )}
      <Text style={styles.label}>Starts at</Text>
      <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
        <Text style={[styles.input, styles.inputText]}>
          {appointment.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
      {showStartTimePicker && (
        <DateTimePicker
          testID="startTimePicker"
          value={appointment.startTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleStartTimeChange}
          themeVariant="dark"
        />
      )}
      <Text style={styles.label}>Ends at</Text>
      <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
        <Text style={[styles.input, styles.inputText]}>
          {appointment.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
      {showEndTimePicker && (
        <DateTimePicker
          testID="endTimePicker"
          value={appointment.endTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleEndTimeChange}
          themeVariant="dark"
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
      <Text style={styles.label}>Add-ons</Text>
      <TouchableOpacity 
        style={styles.input}
        onPress={() => setShowAddOnsPicker(true)}
      >
        <Text style={[styles.inputText, { color: '#fff' }]}>
          {selectedAddOns.length > 0 ? selectedAddOns.join(', ') : 'Select Add-ons'}
        </Text>
      </TouchableOpacity>
      {renderAddOnsPicker()}
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
    paddingTop: 50,
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
  selectedPickerItemText: {
    color: '#007AFF',
  },
});

export default AddAppointmentScreen;