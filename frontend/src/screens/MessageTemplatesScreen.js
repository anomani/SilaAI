import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getReminderMessageTemplate,
  setReminderMessageTemplate,
  getFirstMessageTemplate,
  setFirstMessageTemplate,
  getNextDayRemindersStatus,
  setNextDayRemindersStatus
} from '../services/api';

const MessageTemplatesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [reminderTemplate, setReminderTemplate] = useState('');
  const [firstMessageTemplate, setFirstMessageTemplateState] = useState('');
  const [isEditingReminder, setIsEditingReminder] = useState(false);
  const [isEditingFirst, setIsEditingFirst] = useState(false);
  const [nextDayReminders, setNextDayReminders] = useState(false);
  const [nextDayRemindersLoading, setNextDayRemindersLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reminder, first, remindersStatus] = await Promise.all([
        getReminderMessageTemplate(),
        getFirstMessageTemplate(),
        getNextDayRemindersStatus()
      ]);
      setReminderTemplate(reminder.value);
      setFirstMessageTemplateState(first.value);
      setNextDayReminders(remindersStatus.status);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminders = async () => {
    try {
      setNextDayRemindersLoading(true);
      await setNextDayRemindersStatus(!nextDayReminders);
      setNextDayReminders(!nextDayReminders);
    } catch (error) {
      Alert.alert('Error', 'Failed to update reminders status');
    } finally {
      setNextDayRemindersLoading(false);
    }
  };

  const handleSaveReminderTemplate = async () => {
    try {
      await setReminderMessageTemplate(reminderTemplate);
      setIsEditingReminder(false);
      Alert.alert('Success', 'Reminder template updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update reminder template');
    }
  };

  const handleSaveFirstTemplate = async () => {
    try {
      console.log('Attempting to save first message template:', firstMessageTemplate);
      await setFirstMessageTemplate(firstMessageTemplate);
      console.log('Successfully saved first message template');
      setIsEditingFirst(false);
      Alert.alert('Success', 'First message template updated successfully');
    } catch (error) {
      console.error('Error saving first message template:', error);
      Alert.alert('Error', 'Failed to update first message template');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Message Templates</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.setting}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#81b0ff" />
              <Text style={styles.label}>Next Day Reminders</Text>
            </View>
            <Switch
              value={nextDayReminders}
              onValueChange={handleToggleReminders}
              trackColor={{ false: '#2c2c2e', true: '#81b0ff' }}
              thumbColor={nextDayReminders ? '#ffffff' : '#767577'}
              ios_backgroundColor="#2c2c2e"
              disabled={nextDayRemindersLoading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Regular Reminder Template</Text>
            <TouchableOpacity 
              onPress={() => setIsEditingReminder(!isEditingReminder)}
              style={styles.editButton}
            >
              <Ionicons 
                name={isEditingReminder ? "close" : "create-outline"} 
                size={24} 
                color="#81b0ff" 
              />
            </TouchableOpacity>
          </View>
          
          {isEditingReminder ? (
            <View style={styles.templateEditContainer}>
              <TextInput
                style={styles.templateInput}
                value={reminderTemplate}
                onChangeText={setReminderTemplate}
                multiline
                placeholder="Enter reminder template..."
                placeholderTextColor="#666"
              />
              <Text style={styles.templateHint}>
                Available variables: {'{firstname}'}, {'{time}'}
              </Text>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveReminderTemplate}
              >
                <Text style={styles.saveButtonText}>Save Template</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.templatePreview}>{reminderTemplate}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>First Message Template</Text>
            <TouchableOpacity 
              onPress={() => setIsEditingFirst(!isEditingFirst)}
              style={styles.editButton}
            >
              <Ionicons 
                name={isEditingFirst ? "close" : "create-outline"} 
                size={24} 
                color="#81b0ff" 
              />
            </TouchableOpacity>
          </View>
          
          {isEditingFirst ? (
            <View style={styles.templateEditContainer}>
              <TextInput
                style={styles.templateInput}
                value={firstMessageTemplate}
                onChangeText={text => setFirstMessageTemplateState(text)}
                multiline
                placeholder="Enter first message template..."
                placeholderTextColor="#666"
              />
              <Text style={styles.templateHint}>
                Available variables: {'{firstname}'}, {'{time}'}
              </Text>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveFirstTemplate}
              >
                <Text style={styles.saveButtonText}>Save Template</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.templatePreview}>{firstMessageTemplate}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  templateEditContainer: {
    marginTop: 8,
  },
  templateInput: {
    backgroundColor: '#3a3a3c',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  templateHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  templatePreview: {
    color: '#fff',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#81b0ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3a3a3c',
    padding: 16,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
});

export default MessageTemplatesScreen; 