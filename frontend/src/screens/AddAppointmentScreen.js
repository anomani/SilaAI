import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Platform, Keyboard, Modal, FlatList, SafeAreaView, TouchableWithoutFeedback, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Autocomplete from 'react-native-autocomplete-input';
import { addAppointment, searchClients, getAppointmentTypesList, getAddOns, updateAppointmentDetails } from '../services/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const Checkbox = ({ checked, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
  </TouchableOpacity>
);

const AddAppointmentScreen = ({ navigation, route }) => {
  const isEditing = route.params?.appointment != null;
  const [searchQuery, setSearchQuery] = useState(route.params?.appointment?.clientName || '');
  const [selectedClientId, setSelectedClientId] = useState(route.params?.appointment?.clientId || null);
  const [selectedClient, setSelectedClient] = useState(route.params?.appointment ? {
    id: route.params.appointment.clientId,
    firstname: route.params.appointment.clientName.split(' ')[0],
    lastname: route.params.appointment.clientName.split(' ')[1] || '',
    phonenumber: route.params.appointment.clientPhoneNumber
  } : null);
  
  const [appointment, setAppointment] = useState({
    appointmentType: route.params?.appointment?.appointmentTypeId || '',
    clientName: route.params?.appointment?.clientName || '',
    date: (() => {
      if (route.params?.selectedDate) {
        return new Date(route.params.selectedDate);
      }
      if (route.params?.appointment?.date) {
        // Add timezone offset to prevent date shift
        const date = new Date(route.params.appointment.date);
        return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      }
      return new Date();
    })(),
    startTime: (() => {
      if (route.params?.appointment?.startTime) {
        const [hours, minutes] = route.params.appointment.startTime.split(':');
        const time = new Date();
        time.setHours(parseInt(hours), parseInt(minutes), 0);
        console.log('Setting start time:', hours, minutes, time.toLocaleTimeString());
        return time;
      }
      const time = new Date();
      time.setHours(9, 0, 0);
      return time;
    })(),
    endTime: (() => {
      if (route.params?.appointment?.endTime) {
        const [hours, minutes] = route.params.appointment.endTime.split(':');
        const time = new Date();
        time.setHours(parseInt(hours), parseInt(minutes), 0);
        console.log('Setting end time:', hours, minutes, time.toLocaleTimeString());
        return time;
      }
      const time = new Date();
      time.setHours(9, 0, 0);
      return time;
    })(),
    details: route.params?.appointment?.details || '',
    price: route.params?.appointment?.price?.toString() || '',
    addOns: route.params?.appointment?.addOnIds || []
  });
  
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [addOnsList, setAddOnsList] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showAppointmentTypePicker, setShowAppointmentTypePicker] = useState(false);
  const [showAddOnsPicker, setShowAddOnsPicker] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [inputLayout, setInputLayout] = useState({ y: 0, height: 0 });
  const [isSearching, setIsSearching] = useState(false);

  // Add debounce function to prevent too many API calls
  const debounceTimeout = useRef(null);

  useEffect(() => {
    const fetchAppointmentData = async () => {
      try {
        // Fetch appointment types
        const typesResponse = await getAppointmentTypesList();
        const formattedTypes = typesResponse.map(type => ({
          id: type.id,
          name: type.name,
          price: type.price,
          duration: type.duration,
          availability: type.availability || {}
        }));
        setAppointmentTypes(formattedTypes);

        // If editing, find the appointment type ID from the name
        if (isEditing && route.params?.appointment?.appointmentType) {
          const matchingType = formattedTypes.find(
            type => type.name === route.params.appointment.appointmentType
          );
          if (matchingType) {
            // Update the appointment with the correct type ID
            setAppointment(prev => ({
              ...prev,
              appointmentType: matchingType.id
            }));
            
            // Fetch add-ons for this appointment type
            const addOnsResponse = await getAddOns(matchingType.id);
            const formattedAddOns = addOnsResponse.map(addon => ({
              id: addon.id,
              name: addon.name,
              price: addon.price,
              duration: addon.duration
            }));
            setAddOnsList(formattedAddOns);
          }
        }
      } catch (error) {
        console.error('Error fetching appointment data:', error);
        Alert.alert('Error', 'Failed to load appointment data');
      }
    };
    
    fetchAppointmentData();
  }, [isEditing, route.params?.appointment]);

  const calculateEndTime = (startTime, appointmentTypeId, addOns = []) => {
    const selectedType = appointmentTypes.find(type => type.id === appointmentTypeId);
    if (selectedType) {
      const endTime = new Date(startTime);
      let totalDuration = selectedType.duration || 0;

      // Add duration of selected add-ons
      addOns.forEach(addOnId => {
        const addon = addOnsList.find(a => a.id === addOnId);
        if (addon && addon.duration) {
          totalDuration += addon.duration;
        }
      });

      endTime.setMinutes(endTime.getMinutes() + totalDuration);
      return endTime;
    }
    return startTime;
  };

  const handleInputChange = async (field, value) => {
    if (field === 'appointmentType') {
      const selectedType = appointmentTypes.find(type => type.id === value);
      if (selectedType) {
        const newEndTime = calculateEndTime(appointment.startTime, selectedType.id, []);
        
        setAppointment(prev => ({
          ...prev,
          [field]: value,
          price: selectedType.price.toString(),
          endTime: newEndTime,
          addOns: [] // Reset add-ons when changing appointment type
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
      const newEndTime = calculateEndTime(value, appointment.appointmentType, appointment.addOns);
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
    setShowDatePicker(false);
    if (selectedDate) {
      setAppointment({ ...appointment, date: selectedDate });
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      // Ensure we keep the 24-hour time
      const newEndTime = calculateEndTime(selectedTime, appointment.appointmentType, appointment.addOns);
      setAppointment(prev => ({
        ...prev,
        startTime: selectedTime,
        endTime: newEndTime
      }));
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setAppointment(prev => ({ ...prev, endTime: selectedTime }));
    }
  };

  // Helper function to format time in 12-hour format for display
  const formatTimeDisplay = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const handlePriceChange = (value) => {
    // Allow manual price updates while validating input
    const numericValue = value.replace(/[^0-9.]/g, '');
    if (numericValue === '' || !isNaN(parseFloat(numericValue))) {
      setAppointment(prev => ({ ...prev, price: numericValue }));
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

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleAddAppointment = async () => {
    try {
      // Validate required fields
      const missingFields = [];
      
      if (!selectedClient) {
        missingFields.push('Client Name');
      }

      if (!appointment.appointmentType) {
        missingFields.push('Appointment Type');
      }

      if (!appointment.date) {
        missingFields.push('Date');
      }

      if (!appointment.startTime) {
        missingFields.push('Start Time');
      }

      if (missingFields.length > 0) {
        Alert.alert(
          'Required Fields Missing',
          `Please fill in the following required fields:\n${missingFields.join('\n')}`,
          [{ text: 'OK' }]
        );
        return;
      }

      const formatDate = (date) => {
        // Remove timezone offset when formatting date for API
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() + tzOffset);
        return localDate.toISOString().split('T')[0];
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
        paid: route.params?.appointment?.paid || null,
        tipAmount: route.params?.appointment?.tipAmount || null,
        paymentMethod: route.params?.appointment?.paymentMethod || null,
        addOnIds: appointment.addOns
      };

      console.log('Saving appointment with times:', appointmentData.startTime, appointmentData.endTime);

      if (isEditing) {
        await updateAppointmentDetails(route.params.appointment.id, appointmentData);
        console.log('Appointment updated successfully');
      } else {
        await addAppointment(appointmentData);
        console.log('Appointment added successfully');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving appointment:', error);
      Alert.alert('Error', error.message || 'Failed to save appointment. Please try again.');
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
                style={[
                  styles.pickerItem,
                  appointment.appointmentType === item.id && styles.selectedPickerItem
                ]}
                onPress={() => {
                  handleInputChange('appointmentType', item.id);
                  setShowAppointmentTypePicker(false);
                }}
              >
                <Text style={[
                  styles.pickerItemText,
                  appointment.appointmentType === item.id && styles.selectedPickerItemText
                ]}>
                  {item.name}
                </Text>
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

  const handleAddOnToggle = (addOnId) => {
    setAppointment(prevState => {
      const updatedAddOns = prevState.addOns.includes(addOnId)
        ? prevState.addOns.filter(item => item !== addOnId)
        : [...prevState.addOns, addOnId];
      
      // Get the base price from the selected appointment type
      const selectedType = appointmentTypes.find(type => type.id === prevState.appointmentType);
      const basePrice = selectedType ? parseFloat(selectedType.price) : 0;
      
      // Calculate total add-ons price
      const addOnsPrice = updatedAddOns.reduce((total, id) => {
        const addon = addOnsList.find(a => a.id === id);
        return total + (addon ? parseFloat(addon.price) : 0);
      }, 0);

      // Calculate new end time based on updated add-ons
      const newEndTime = calculateEndTime(
        prevState.startTime,
        prevState.appointmentType,
        updatedAddOns
      );

      // Set the new total price and end time
      return {
        ...prevState,
        addOns: updatedAddOns,
        price: (basePrice + addOnsPrice).toFixed(2),
        endTime: newEndTime
      };
    });
  };

  const renderAddOnsPicker = () => {
    return (
      <Modal
        visible={showAddOnsPicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <FlatList
              data={addOnsList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => handleAddOnToggle(item.id)}
                >
                  <View style={styles.pickerItemContent}>
                    <Text style={[styles.pickerItemText, styles.addOnName]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.priceCheckboxContainer}>
                      <Text style={styles.pickerItemPrice}>${parseFloat(item.price).toFixed(2)}</Text>
                      <Checkbox
                        checked={appointment.addOns.includes(item.id)}
                        onPress={() => handleAddOnToggle(item.id)}
                      />
                    </View>
                  </View>
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
      <Text style={styles.headerTitle}>{isEditing ? 'Edit Appointment' : 'Add Appointment'}</Text>
    </View>
  );

  const handleClientSearch = useCallback(async (text) => {
    setSearchQuery(text);
    
    // Clear any existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set a new timeout for the API call
    debounceTimeout.current = setTimeout(async () => {
      if (text.trim()) {
        try {
          setIsSearching(true);
          const data = await searchClients(text);
          setFilteredClients([{ id: 'new', firstname: 'New', lastname: 'Client' }, ...data]);
        } catch (error) {
          console.error('Error searching clients:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setFilteredClients([]);
      }
    }, 300); // 300ms delay before making the API call
  }, []);

  // Clean up the timeout on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

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
            style={[styles.input, isEditing && styles.disabledInput]}
            value={searchQuery}
            onChangeText={handleClientSearch}
            onFocus={() => !isEditing && setShowClientSearch(true)}
            placeholder="Search client name"
            placeholderTextColor="#888"
            autoCorrect={false}
            autoCapitalize="words"
            editable={!isEditing}
          />
          {showClientSearch && !isEditing && (
            <>
              <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={dismissSearch}
              />
              <View style={styles.searchResults}>
                <FlatList
                  data={filteredClients}
                  keyExtractor={item => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.suggestionItem}
                      onPress={() => {
                        setSearchQuery(`${item.firstname} ${item.lastname}`);
                        handleSelectClient(item);
                        dismissSearch();
                      }}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionText}>
                          {item.firstname} {item.lastname}
                        </Text>
                        {item.id !== 'new' && item.phonenumber && (
                          <Text style={styles.phoneText}>
                            {item.phonenumber
                              .replace(/^\+1|^1/, '')
                              .replace(/\D/g, '')
                              .replace(/(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={[styles.suggestionText, { padding: 12 }]}>
                      {isSearching ? 'Searching...' : 'No results found'}
                    </Text>
                  )}
                  keyboardShouldPersistTaps="always"
                />
              </View>
            </>
          )}
          {isEditing && (
            <View style={styles.clientPhoneContainer}>
              <Text style={styles.clientPhoneText}>
                {selectedClient?.phonenumber ? selectedClient.phonenumber
                  .replace(/^\+1|^1/, '')
                  .replace(/\D/g, '')
                  .replace(/(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : ''}
              </Text>
            </View>
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
        <Text style={styles.label}>Add-ons</Text>
        <TouchableOpacity 
          style={styles.input}
          onPress={() => setShowAddOnsPicker(true)}
        >
          <Text style={[styles.inputText, { color: '#fff' }]}>
            {appointment.addOns.length > 0 
              ? appointment.addOns
                  .map(id => addOnsList.find(addon => addon.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')
              : 'Select Add-ons'
            }
          </Text>
        </TouchableOpacity>
        {renderAddOnsPicker()}
        <Text style={styles.label}>Starts at</Text>
        <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
          <Text style={[styles.input, styles.inputText]}>
            {formatTimeDisplay(appointment.startTime)}
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
            {formatTimeDisplay(appointment.endTime)}
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
        <Text style={styles.label}>Price</Text>
        <TextInput
          style={[styles.input, styles.inputText]}
          value={appointment.price}
          onChangeText={handlePriceChange}
          keyboardType="decimal-pad"
          placeholder="Enter price"
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
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <Button 
          title={isEditing ? "Update Appointment" : "Add Appointment"} 
          onPress={handleAddAppointment} 
        />
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  pickerItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addOnName: {
    flex: 1,
    marginRight: 16,
    color: '#fff',
    fontSize: 16,
  },
  priceCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'flex-end',
  },
  pickerItemPrice: {
    color: '#fff',
    fontSize: 16,
    marginRight: 12,
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
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  phoneText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
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
  pickerItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledInput: {
    backgroundColor: '#1c1c1e',
    opacity: 0.7,
  },
  selectedPickerItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  selectedPickerItemText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  clientPhoneContainer: {
    marginTop: 4,
  },
  clientPhoneText: {
    color: '#888',
    fontSize: 14,
  },
});

export default AddAppointmentScreen;