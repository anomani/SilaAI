import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform, Keyboard, Modal, FlatList, SafeAreaView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Autocomplete from 'react-native-autocomplete-input';
import { addAppointment, searchClients } from '../services/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const Checkbox = ({ checked, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
  </TouchableOpacity>
);

const AddAppointmentScreen = ({ navigation }) => {
  const [appointment, setAppointment] = useState({
    appointmentType: '',
    clientName: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    details: '',
    price: '',
    addOns: []
  });
  
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAppointmentTypePicker, setShowAppointmentTypePicker] = useState(false);
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

      const appointmentData = {
        date: formatDate(appointment.date),
        startTime: formatTime(appointment.startTime),
        endTime: formatTime(appointment.endTime),
        clientId: selectedClient.id,
        appointmentType: appointment.appointmentType,
        details: appointment.details,
        price: parseFloat(appointment.price),
        paid: null,
        tipAmount: null,
        paymentMethod: null,
        addOns: appointment.addOns
      };
      await addAppointment(appointmentData);

      console.log('Appointment added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding appointment:', error);
      Alert.alert('Booking Error', 'Failed to add appointment. Please try again.');
    }
  };

  const handleAppointmentTypeChange = (itemValue) => {
    handleInputChange('appointmentType', itemValue);
    setShowAppointmentTypePicker(false);
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

  const addOns = [
    "Beard Grooming",
    "Beard Grooming for Lineup + Taper",
    "Colour Enhancement",
    "Hot Towel + Black Mask Treatment for Clogged Pores",
    "Wax - Hair Removal"
  ];

  const handleAddOnToggle = (addOn) => {
    setAppointment(prevState => {
      const updatedAddOns = prevState.addOns.includes(addOn)
        ? prevState.addOns.filter(item => item !== addOn)
        : [...prevState.addOns, addOn];
      return { ...prevState, addOns: updatedAddOns };
    });
  };

  const renderAddOnsPicker = () => (
    <Modal
      visible={showAddOnsPicker}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <FlatList
            data={addOns}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => handleAddOnToggle(item)}
              >
                <Text style={styles.pickerItemText}>{item}</Text>
                <Checkbox
                  checked={appointment.addOns.includes(item)}
                  onPress={() => handleAddOnToggle(item)}
                />
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add Appointment</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
      >
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
        <Text style={styles.label}>Add details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={appointment.details}
          onChangeText={(value) => handleInputChange('details', value)}
          placeholder="Notes"
          placeholderTextColor="#888"
          multiline
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <Text style={styles.label}>Price</Text>
        <TextInput
          style={styles.input}
          value={appointment.price}
          onChangeText={(value) => handleInputChange('price', value)}
          placeholder="Price"
          placeholderTextColor="#888"
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Add-ons</Text>
        <TouchableOpacity 
          style={styles.input}
          onPress={() => setShowAddOnsPicker(true)}
        >
          <Text style={[styles.inputText, { color: '#fff' }]}>
            {appointment.addOns.length > 0 ? appointment.addOns.join(', ') : 'Select Add-ons'}
          </Text>
        </TouchableOpacity>
        {renderAddOnsPicker()}

        <Button title="Add Appointment" onPress={handleAddAppointment} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginRight: 10,
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
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
  },
});

export default AddAppointmentScreen;