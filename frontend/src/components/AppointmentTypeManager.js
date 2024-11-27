import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getAppointmentTypesList, 
  updateAppointmentType,
  createAppointmentType,
  deleteAppointmentType,
  updateAppointmentTypeAvailability
} from '../services/api';
import EditAvailabilityModal from './EditAvailabilityModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AppointmentTypeManager = () => {
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newAppointmentType, setNewAppointmentType] = useState({
    name: '',
    duration: '',
    price: '',
    availability: DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: []
    }), {})
  });
  const [editingAvailability, setEditingAvailability] = useState(null);

  useEffect(() => {
    fetchAppointmentTypes();
  }, []);

  const fetchAppointmentTypes = async () => {
    try {
      const types = await getAppointmentTypesList();
      setAppointmentTypes(types);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch appointment types');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type, field) => {
    setEditingId(type.id);
    setEditingField(field);
    setEditingValue(type[field].toString());
  };

  const handleSave = async (type) => {
    try {
      let value = editingValue;
      if (editingField === 'duration' || editingField === 'price') {
        value = parseFloat(editingValue);
        if (isNaN(value) || value <= 0) {
          Alert.alert('Error', `Please enter a valid ${editingField}`);
          return;
        }
      }

      const updates = { [editingField]: value };
      await updateAppointmentType(type.id, updates);
      
      setAppointmentTypes(types => 
        types.map(t => t.id === type.id ? { ...t, [editingField]: value } : t)
      );
      
      setEditingId(null);
      setEditingField(null);
      setEditingValue('');
    } catch (error) {
      Alert.alert('Error', `Failed to update ${editingField}`);
    }
  };

  const handleCreate = async () => {
    try {
      const duration = parseFloat(newAppointmentType.duration);
      const price = parseFloat(newAppointmentType.price);

      if (!newAppointmentType.name) {
        Alert.alert('Error', 'Please enter a name');
        return;
      }
      if (isNaN(duration) || duration <= 0) {
        Alert.alert('Error', 'Please enter a valid duration');
        return;
      }
      if (isNaN(price) || price <= 0) {
        Alert.alert('Error', 'Please enter a valid price');
        return;
      }

      const createdType = await createAppointmentType(newAppointmentType);
      setAppointmentTypes(prev => [...prev, createdType]);
      setShowAddNew(false);
      setNewAppointmentType({
        name: '',
        duration: '',
        price: '',
        availability: DAYS.reduce((acc, day) => ({
          ...acc,
          [day]: []
        }), {})
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create appointment type');
    }
  };

  const handleDelete = async (typeId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this appointment type?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointmentType(typeId);
              setAppointmentTypes(types => types.filter(t => t.id !== typeId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete appointment type');
            }
          }
        }
      ]
    );
  };

  const handleUpdateAvailability = async (typeId, availability) => {
    try {
      await updateAppointmentTypeAvailability(typeId, availability);
      setAppointmentTypes(types =>
        types.map(t => t.id === typeId ? { ...t, availability } : t)
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleSaveAvailability = async (typeId, updates) => {
    try {
      await updateAppointmentType(typeId, updates);
      setAppointmentTypes(types =>
        types.map(t => t.id === typeId ? { ...t, ...updates } : t)
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update appointment type');
    }
  };

  const formatTimeRange = (timeSlot) => {
    const [start, end] = timeSlot.split('-');
    return `${start} - ${end}`;
  };

  const renderAvailability = (type) => (
    <View style={styles.availabilityContainer}>
      <View style={styles.availabilityHeader}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditingAvailability(type)}
        >
          <Ionicons name="pencil" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.daysGrid}>
        {DAYS.map((day) => {
          const timeSlots = type.availability?.[day] || [];
          const hasAvailability = timeSlots.length > 0;
          
          return (
            <View key={day} style={styles.dayCard}>
              <Text style={styles.dayName}>{day}</Text>
              {hasAvailability ? (
                <View style={styles.timeSlotsContainer}>
                  {timeSlots.map((slot, index) => (
                    <Text key={index} style={styles.timeSlot}>
                      {formatTimeRange(slot)}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.unavailable}>Unavailable</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.appointmentTypeContainer}>
      <View style={styles.header}>
        <View style={styles.title}>
          {editingId === item.id && editingField === 'name' ? (
            <TextInput
              style={styles.input}
              value={editingValue}
              onChangeText={setEditingValue}
              onBlur={() => handleSave(item)}
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => handleEdit(item, 'name')}>
              <Text style={styles.name}>{item.name}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detail}>
          <Text style={styles.label}>Duration (minutes):</Text>
          <Text style={styles.value}>{item.duration}</Text>
        </View>

        <View style={styles.detail}>
          <Text style={styles.label}>Price ($):</Text>
          <Text style={styles.value}>{item.price}</Text>
        </View>
      </View>

      {renderAvailability(item)}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddNew(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
        <Text style={styles.addButtonText}>Add New Appointment Type</Text>
      </TouchableOpacity>

      {showAddNew && (
        <View style={styles.appointmentTypeContainer}>
          <TextInput
            style={styles.input}
            value={newAppointmentType.name}
            onChangeText={(text) => setNewAppointmentType(prev => ({ ...prev, name: text }))}
            placeholder="Name"
            placeholderTextColor="#666"
          />
          <TextInput
            style={styles.input}
            value={newAppointmentType.duration}
            onChangeText={(text) => setNewAppointmentType(prev => ({ ...prev, duration: text }))}
            placeholder="Duration (minutes)"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={newAppointmentType.price}
            onChangeText={(text) => setNewAppointmentType(prev => ({ ...prev, price: text }))}
            placeholder="Price ($)"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowAddNew(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleCreate}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={appointmentTypes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
      />

      <EditAvailabilityModal
        visible={editingAvailability !== null}
        appointmentType={editingAvailability}
        onClose={() => setEditingAvailability(null)}
        onSave={handleSaveAvailability}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentTypeContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: '#888',
  },
  value: {
    fontSize: 16,
    color: '#fff',
  },
  input: {
    fontSize: 16,
    color: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    padding: 4,
    minWidth: 60,
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  availabilityContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    padding: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCard: {
    width: '48%',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  timeSlotsContainer: {
    gap: 4,
  },
  timeSlot: {
    color: '#007AFF',
    fontSize: 14,
  },
  unavailable: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default AppointmentTypeManager;
