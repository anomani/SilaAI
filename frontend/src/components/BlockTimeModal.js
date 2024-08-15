import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const BlockTimeModal = ({ isVisible, onClose, onSubmit }) => {
  // Helper functions for formatting
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const formatTimeForDisplay = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // hh:mm AM/PM
  };

  const convertTo24Hour = (timeString) => {
    const [time, modifier] = timeString.split(' ');
    let [hours, minutes] = time.split(':');
    
    hours = parseInt(hours, 10);
    
    if (hours === 12) {
      hours = modifier === 'PM' ? 12 : 0;
    } else if (modifier === 'PM') {
      hours += 12;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const [blockedTimeData, setBlockedTimeData] = useState({
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    reason: ''
  });

  const [pickerType, setPickerType] = useState(null);

  const openPicker = useCallback((type) => {
    setPickerType(type);
  }, []);

  const closePicker = useCallback(() => {
    setPickerType(null);
  }, []);

  const [errorMessage, setErrorMessage] = useState('');

  const handleDateChange = (event, selectedDate) => {
    closePicker();
    if (selectedDate) {
      setBlockedTimeData(prevData => ({
        ...prevData,
        date: selectedDate
      }));
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    closePicker();
    if (selectedTime) {
      setBlockedTimeData(prevData => ({
        ...prevData,
        startTime: selectedTime
      }));
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    closePicker();
    if (selectedTime) {
      setBlockedTimeData(prevData => ({
        ...prevData,
        endTime: selectedTime
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setBlockedTimeData(prevData => ({
      ...prevData,
      [field]: value
    }));
    setErrorMessage('');
  };

  const handleSubmit = () => {
    if (!blockedTimeData.reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }

    const submissionData = {
      ...blockedTimeData,
      date: formatDate(blockedTimeData.date),
      startTime: convertTo24Hour(formatTimeForDisplay(blockedTimeData.startTime)),
      endTime: convertTo24Hour(formatTimeForDisplay(blockedTimeData.endTime))
    };
    onSubmit(submissionData);
    console.log('Blocked time data:', submissionData);
    setBlockedTimeData({
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      reason: ''
    });
    setErrorMessage('');
  };

  const handleDonePress = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContent}>
            <View style={styles.blockTimeModal}>
              <Text style={styles.blockTimeModalTitle}>Block Time</Text>
              
              <View style={styles.blockTimeInputContainer}>
                <Text style={styles.blockTimeInputLabel}>Date:</Text>
                <TouchableOpacity onPress={() => openPicker('date')} style={styles.dateTimeButton}>
                  <Text>{formatDate(blockedTimeData.date)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.blockTimeInputContainer}>
                <Text style={styles.blockTimeInputLabel}>Start Time:</Text>
                <TouchableOpacity onPress={() => openPicker('startTime')} style={styles.dateTimeButton}>
                  <Text>{formatTimeForDisplay(blockedTimeData.startTime)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.blockTimeInputContainer}>
                <Text style={styles.blockTimeInputLabel}>End Time:</Text>
                <TouchableOpacity onPress={() => openPicker('endTime')} style={styles.dateTimeButton}>
                  <Text>{formatTimeForDisplay(blockedTimeData.endTime)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.blockTimeInputContainer}>
                <Text style={styles.blockTimeInputLabel}>Reason: <Text style={styles.requiredAsterisk}>*</Text></Text>
                <TextInput
                  style={[styles.blockTimeInput, styles.reasonInput, errorMessage ? styles.inputError : null]}
                  value={blockedTimeData.reason}
                  onChangeText={(value) => {
                    handleInputChange('reason', value);
                    setErrorMessage('');
                  }}
                  placeholder="Reason for blocking time"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                  onSubmitEditing={handleDonePress}
                  multiline={true}
                  numberOfLines={3}
                />
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
              </View>

              <View style={styles.blockTimeModalButtons}>
                <TouchableOpacity 
                  style={[styles.blockTimeModalButton, styles.blockTimeCancelButton]} 
                  onPress={onClose}
                >
                  <Text style={styles.blockTimeModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.blockTimeModalButton, styles.blockTimeSubmitButton]} 
                  onPress={handleSubmit}
                >
                  <Text style={styles.blockTimeModalButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockTimeModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 450,
    minHeight: 550,
  },
  blockTimeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  blockTimeInputContainer: {
    marginBottom: 20,
  },
  blockTimeInputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  blockTimeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  blockTimeModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  blockTimeModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  blockTimeCancelButton: {
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  blockTimeSubmitButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  blockTimeModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
  },
  reasonInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  requiredAsterisk: {
    color: 'red',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
});

export default BlockTimeModal;