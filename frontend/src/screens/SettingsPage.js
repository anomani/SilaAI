import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { getFillMyCalendarStatus, setFillMyCalendarStatus } from '../services/api';
import { Ionicons } from '@expo/vector-icons'; // Make sure to import this
import Footer from '../components/Footer'; // Import the Footer component

const SettingsPage = ({ navigation }) => { // Add navigation prop
  const [fillMyCalendar, setFillMyCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await getFillMyCalendarStatus();
        setFillMyCalendar(response.status);
      } catch (err) {
        setError('Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleToggle = async () => {
    try {
      setLoading(true);
      await setFillMyCalendarStatus(!fillMyCalendar);
      setFillMyCalendar(!fillMyCalendar);
    } catch (err) {
      setError('Failed to update status');
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#ffffff" style={styles.loading} />;
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  return (
    <View style={styles.pageContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.setting}>
          <Text style={styles.label}>Fill My Calendar</Text>
          <Switch
            value={fillMyCalendar}
            onValueChange={handleToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={fillMyCalendar ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>
      <Footer navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    marginLeft: 40, // Add left margin to avoid overlapping with back button
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  label: {
    fontSize: 18,
    color: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#ff0000',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SettingsPage;