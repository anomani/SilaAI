import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const RescheduleConfirmModal = ({ isVisible, appointment, newTime, onConfirm, onCancel }) => {
  const [selectedTime, setSelectedTime] = useState(new Date());

  useEffect(() => {
    if (newTime) {
      const [hours, minutes] = newTime.split(':');
      const newDate = new Date();
      newDate.setHours(parseInt(hours, 10));
      newDate.setMinutes(parseInt(minutes, 10));
      setSelectedTime(newDate);
    }
  }, [newTime]);

  if (!appointment) return null;

  const handleTimeChange = (event, selected) => {
    if (selected) {
      setSelectedTime(selected);
    }
  };

  const handleConfirm = () => {
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    onConfirm(`${hours}:${minutes}`);
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reschedule Appointment</Text>
          <Text style={styles.modalText}>
            Reschedule {appointment.clientName}'s appointment to:
          </Text>
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={handleTimeChange}
            style={styles.timePicker}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirm}>
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timePicker: {
    width: '100%',
    backgroundColor: '#1c1c1e',
  },
});

export default RescheduleConfirmModal;