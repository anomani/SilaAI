import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface BlockTimeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: BlockedTimeData) => void;
}

interface BlockedTimeData {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export default function BlockTimeModal({ isVisible, onClose, onSubmit }: BlockTimeModalProps) {
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showPicker, setShowPicker] = useState<'date' | 'startTime' | 'endTime' | null>(null);
  const [error, setError] = useState('');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(null);
    if (selectedDate) setDate(selectedDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowPicker(null);
    if (selectedTime) {
      if (showPicker === 'startTime') setStartTime(selectedTime);
      if (showPicker === 'endTime') setEndTime(selectedTime);
    }
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    onSubmit({
      date: format(date, 'yyyy-MM-dd'),
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      reason: reason.trim()
    });

    // Reset form
    setDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date());
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.title}>Block Time</Text>
            
            <TouchableOpacity onPress={() => setShowPicker('date')} style={styles.input}>
              <Text>{format(date, 'MMMM d, yyyy')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowPicker('startTime')} style={styles.input}>
              <Text>{format(startTime, 'h:mm a')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowPicker('endTime')} style={styles.input}>
              <Text>{format(endTime, 'h:mm a')}</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, styles.textArea, error ? styles.inputError : null]}
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for blocking time"
              multiline
              numberOfLines={3}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={[styles.button, styles.submitButton]}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showPicker && (
            <DateTimePicker
              value={showPicker === 'date' ? date : showPicker === 'startTime' ? startTime : endTime}
              mode={showPicker === 'date' ? 'date' : 'time'}
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={showPicker === 'date' ? handleDateChange : handleTimeChange}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 10,
  },
});