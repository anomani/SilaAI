import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const EditAvailabilityModal = ({ 
  visible, 
  appointmentType, 
  onClose, 
  onSave 
}) => {
  const [availability, setAvailability] = useState({});
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (appointmentType) {
      // Set initial values
      setPrice(appointmentType.price.toString());
      setDuration(appointmentType.duration.toString());
      
      // Format availability data
      const formattedAvailability = {};
      DAYS.forEach(day => {
        formattedAvailability[day] = [];
      });

      Object.entries(appointmentType.availability || {}).forEach(([key, slots]) => {
        const formattedDay = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        if (DAYS.includes(formattedDay) && Array.isArray(slots)) {
          formattedAvailability[formattedDay] = slots;
        }
      });

      setAvailability(formattedAvailability);
    }
  }, [appointmentType]);

  const addTimeSlot = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), '09:00-17:00']
    }));
  };

  const updateTimeSlot = (day, index, value, isStart) => {
    setAvailability(prev => {
      const slots = [...(prev[day] || [])];
      const [start, end] = slots[index].split('-');
      slots[index] = isStart ? `${value}-${end}` : `${start}-${value}`;
      return { ...prev, [day]: slots };
    });
  };

  const removeTimeSlot = (day, index) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    // Validate price and duration
    const numPrice = parseFloat(price);
    const numDuration = parseInt(duration);

    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (isNaN(numDuration) || numDuration <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }

    const backendFormat = {};
    Object.entries(availability).forEach(([day, slots]) => {
      if (slots.length > 0) {
        const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
        backendFormat[capitalizedDay] = slots;
      }
    });

    onSave(appointmentType.id, {
      price: numPrice,
      duration: numDuration,
      availability: backendFormat
    });
    onClose();
  };

  // Debug logging
  useEffect(() => {
    if (appointmentType) {
      console.log('Appointment Type:', appointmentType);
      console.log('Current Availability:', availability);
    }
  }, [appointmentType, availability]);

  if (!visible || !appointmentType) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit {appointmentType?.name}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Add Price and Duration section */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price ($):</Text>
              <TextInput
                style={styles.detailInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="Enter price"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration (min):</Text>
              <TextInput
                style={styles.detailInput}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder="Enter duration"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Availability</Text>
          {DAYS.map(day => (
            <View key={day} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day}</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => addTimeSlot(day)}
                >
                  <Text style={styles.addButtonText}>Add Time Slot</Text>
                </TouchableOpacity>
              </View>

              {(availability[day] || []).map((slot, index) => {
                const [start, end] = slot.split('-');
                return (
                  <View key={index} style={styles.timeSlotRow}>
                    <TextInput
                      style={styles.timeInput}
                      value={start}
                      onChangeText={(text) => updateTimeSlot(day, index, text, true)}
                      placeholder="HH:MM"
                      placeholderTextColor="#666"
                      keyboardType="numbers-and-punctuation"
                    />
                    <Text style={styles.toText}>to</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={end}
                      onChangeText={(text) => updateTimeSlot(day, index, text, false)}
                      placeholder="HH:MM"
                      placeholderTextColor="#666"
                      keyboardType="numbers-and-punctuation"
                    />
                    <TouchableOpacity
                      onPress={() => removeTimeSlot(day, index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              {(!availability[day] || availability[day].length === 0) && (
                <Text style={styles.noTimeSlotsText}>No time slots added</Text>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.footerButton, styles.cancelButton]} 
            onPress={onClose}
          >
            <Text style={styles.footerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.footerButton, styles.saveButton]} 
            onPress={handleSave}
          >
            <Text style={styles.footerButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  daySection: {
    marginBottom: 24,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#1c1c1e',
    padding: 8,
    borderRadius: 8,
  },
  timeInput: {
    backgroundColor: '#3c3c3e',
    padding: 8,
    borderRadius: 8,
    color: '#fff',
    width: 80,
    fontSize: 16,
  },
  toText: {
    color: '#666',
    marginHorizontal: 8,
    fontSize: 16,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  noTimeSlotsText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    gap: 8,
  },
  footerButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#3c3c3e',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsSection: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  detailInput: {
    backgroundColor: '#3c3c3e',
    padding: 8,
    borderRadius: 8,
    color: '#fff',
    width: 120,
    fontSize: 16,
    textAlign: 'right',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

export default EditAvailabilityModal; 