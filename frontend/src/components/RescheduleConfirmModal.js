import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from 'react-native';

const RescheduleConfirmModal = ({ isVisible, appointment, newTime, onConfirm, onCancel }) => {
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (newTime) {
      const [time, period] = newTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(period === 'PM' && hours !== 12 ? hours + 12 : hours === 12 && period === 'AM' ? 0 : hours);
      date.setMinutes(minutes);
      setSelectedDateTime(date);
    }
  }, [newTime]);

  const handleTimeChange = (event, selected) => {
    if (selected) {
      setSelectedDateTime(selected);
    }
  };

  const handleConfirm = () => {
    const hours = selectedDateTime.getHours();
    const minutes = selectedDateTime.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    onConfirm(formattedTime);
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
            Reschedule {appointment?.clientName}'s appointment to:
          </Text>
          <DateTimePicker
            value={selectedDateTime}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handleTimeChange}
            style={styles.timePicker}
            themeVariant={colorScheme}
            textColor="white"
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