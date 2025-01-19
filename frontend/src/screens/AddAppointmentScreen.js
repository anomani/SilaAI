import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform, Keyboard, Modal, FlatList, SafeAreaView, TouchableWithoutFeedback, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Autocomplete from 'react-native-autocomplete-input';
import { addAppointment, searchClients, getAppointmentTypesList, getAddOns } from '../services/api';
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
  
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [addOnsList, setAddOnsList] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAppointmentTypePicker, setShowAppointmentTypePicker] = useState(false);
  const [showAddOnsPicker, setShowAddOnsPicker] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [inputLayout, setInputLayout] = useState({ y: 0, height: 0 });

  useEffect(() => {
    const fetchAppointmentData = async () => {
      try {
        // Only fetch appointment types initially
        const typesResponse = await getAppointmentTypesList();
        
        // Format appointment types from the response
        const formattedTypes = typesResponse.map(type => ({
          id: type.id,
          name: type.name,
          price: type.price,
          duration: type.duration,
          availability: type.availability || {}
        }));
        
        setAppointmentTypes(formattedTypes);
      } catch (error) {
        console.error('Error fetching appointment data:', error);
        Alert.alert('Error', 'Failed to load appointment types');
      }
    };
    
    fetchAppointmentData();
  }, []);

  const calculateEndTime = (startTime, appointmentTypeId) => {
    const selectedType = appointmentTypes.find(type => type.id === appointmentTypeId);
    if (selectedType && selectedType.duration) {
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + selectedType.duration);
      return endTime;
    }
    return startTime;
  };

  const handleInputChange = async (field, value) => {
    if (field === 'appointmentType') {
      const selectedType = appointmentTypes.find(type => type.id === value);
      if (selectedType) {
        const newEndTime = calculateEndTime(appointment.startTime, selectedType.id);
        
        setAppointment(prev => ({
          ...prev,
          [field]: value,
          price: selectedType.price.toString(),
          endTime: newEndTime,
          addOns: []
        }));

        try {
          const addOnsResponse = await getAddOns(selectedType.id);
          const formattedAddOns = addOnsResponse.map(addon => ({
            id: addon.id,
            name: addon.name,
            price: addon.price,
            duration: addon.duration
          }));
          setAddOnsList(formattedAddOns);
          setShowAddOnsPicker(true);
        } catch (error) {
          console.error('Error fetching add-ons:', error);
          Alert.alert('Error', 'Failed to load compatible add-ons');
        }
      }
    } else if (field === 'startTime') {
      const newEndTime = calculateEndTime(value, appointment.appointmentType);
      setAppointment(prev => ({
        ...prev,
        startTime: value,
        endTime: newEndTime
      }));
    } else if (field === 'clientName') {
      const data = await searchClients(value);
      setFilteredClients([{ id: 'new', firstname: 'New', lastname: 'Client' }, ...data]);
      setAppointment(prev => ({ ...prev, [field]: value }));
    } else {
      setAppointment(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setAppointment({ ...appointment, date: selectedDate });
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      setAppointment({ ...appointment, startTime: selectedTime });
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setAppointment({ ...appointment, endTime: selectedTime });
    }
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

      if (!appointment.appointmentType) {
        throw new Error('No appointment type selected');
      }

      const formatDate = (date) => {
        const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
        const localDate = new Date(date.getTime() - tzOffset);
        return localDate.toISOString().split('T')[0];
      };

      const formatTime = (date) => {
        return date.toTimeString().split(' ')[0].slice(0, 5);
      };

      const selectedAppointmentType = appointmentTypes.find(type => type.id === appointment.appointmentType);
      if (!selectedAppointmentType) {
        throw new Error('Invalid appointment type');
      }

      const appointmentData = {
        date: formatDate(appointment.date),
        startTime: formatTime(appointment.startTime),
        endTime: formatTime(appointment.endTime),
        clientId: selectedClient.id,
        appointmentTypeId: selectedAppointmentType.id,
        details: appointment.details,
        price: parseFloat(appointment.price),
        paid: null,
        tipAmount: null,
        paymentMethod: null,
        addOnIds: appointment.addOns
      };

      await addAppointment(appointmentData);
      console.log('Appointment added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding appointment:', error);
      Alert.alert('Booking Error', error.message || 'Failed to add appointment. Please try again.');
    }
  };

  const handleAppointmentTypeChange = (itemValue) => {
    handleInputChange('appointmentType', itemValue);
    setShowAppointmentTypePicker(false);
  };

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
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  handleInputChange('appointmentType', item.id);
                  setShowAppointmentTypePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item.name}</Text>
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

  const handleAddOnToggle = (addOn) => {
    setAppointment(prevState => {
      const updatedAddOns = prevState.addOns.includes(addOn)
        ? prevState.addOns.filter(item => item !== addOn)
        : [...prevState.addOns, addOn];
      return { ...prevState, addOns: updatedAddOns };
    });
  };

  const renderAddOnsPicker = () => {
    const basePrice = parseFloat(appointment.price) || 0;
    const addOnsPrice = appointment.addOns.reduce((total, addonId) => {
      const addon = addOnsList.find(a => a.id === addonId);
      return total + (addon ? parseFloat(addon.price) : 0);
    }, 0);

    return (
      <Modal
        visible={showAddOnsPicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={[styles.pickerItemText, styles.totalPrice]}>
              Total Price: ${(basePrice + addOnsPrice).toFixed(2)}
            </Text>
            <FlatList
              data={addOnsList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => handleAddOnToggle(item.id)}
                >
                  <View style={styles.pickerItemContent}>
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                    <Text style={styles.pickerItemPrice}>${parseFloat(item.price).toFixed(2)}</Text>
                  </View>
                  <Checkbox
                    checked={appointment.addOns.includes(item.id)}
                    onPress={() => handleAddOnToggle(item.id)}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Text style={[styles.pickerItemText, { textAlign: 'center', padding: 20 }]}>
                  No add-ons available for this service
                </Text>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddOnsPicker(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add Appointment</Text>
    </View>
  );

  const dismissSearch = useCallback(() => {
    setShowClientSearch(false);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Client Name</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            value={appointment.clientName}
            onChangeText={(value) => {
              handleInputChange('clientName', value);
              setShowClientSearch(true);
            }}
            onFocus={() => setShowClientSearch(true)}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setInputLayout({ y, height });
            }}
            placeholder="Search client name"
            placeholderTextColor="#888"
          />
          {showClientSearch && (
            <>
              <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={dismissSearch}
              />
              <View style={styles.searchResults}>
                <FlatList
                  data={filteredClients}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.suggestionItem}
                      onPress={() => {
                        handleSelectClient(item);
                        dismissSearch();
                      }}
                    >
                      <Text style={styles.suggestionText}>{item.firstname} {item.lastname}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={[styles.suggestionText, { padding: 12 }]}>No results found</Text>
                  )}
                  keyboardShouldPersistTaps="always"
                />
              </View>
            </>
          )}
        </View>
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
        <Text style={styles.label}>Appointment Type</Text>
        <TouchableOpacity 
          style={styles.input}
          onPress={() => setShowAppointmentTypePicker(true)}
        >
          <Text style={[styles.inputText, { color: '#fff' }]}>
            {appointmentTypes.find(type => type.id === appointment.appointmentType)?.name || 'Select Appointment Type'}
          </Text>
        </TouchableOpacity>
        {renderAppointmentTypePicker()}
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
        <Text style={[styles.input, styles.inputText]}>
          {appointment.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.label}>Price</Text>
        <Text style={[styles.input, styles.inputText]}>
          ${appointment.price}
        </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 150,
  },
  modalContent: {
    backgroundColor: '#2c2c2e',
    marginHorizontal: 16,
    borderRadius: 8,
    maxHeight: '70%',
    overflow: 'hidden',
    padding: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  pickerItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 10,
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 16,
  },
  pickerItemPrice: {
    color: '#8e8e93',
    fontSize: 16,
  },
  totalPrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  suggestionList: {
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    marginTop: 4,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 16,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  searchContainer: {
    position: 'relative',
    zIndex: 9999,
    elevation: 9999, // for Android
  },
  overlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
  searchResults: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    maxHeight: 600,
    zIndex: 9999,
    elevation: 9999, // for Android
    shadowColor: '#000', // for iOS
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default AddAppointmentScreen;