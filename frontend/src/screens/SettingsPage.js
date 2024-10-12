import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Button, ScrollView } from 'react-native';
import { getFillMyCalendarStatus, setFillMyCalendarStatus, getCurrentUser } from '../services/api';
import { Ionicons } from '@expo/vector-icons'; // Make sure to import this
import Footer from '../components/Footer'; // Import the Footer component
import { useRoute } from '@react-navigation/native';

const SettingsPage = ({ navigation }) => { // Add navigation prop
  const [fillMyCalendar, setFillMyCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const route = useRoute();
  const { handleLogout } = route.params;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [calendarStatus, userData] = await Promise.all([
          getFillMyCalendarStatus(),
          getCurrentUser()
        ]);
        setFillMyCalendar(calendarStatus.status);
        setUser(userData);
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" style={styles.loading} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.main}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.infoText}>Username: {user.username}</Text>
            <Text style={styles.infoText}>Phone Number: {user.phoneNumber}</Text>
          </View>
        )}
        <View style={styles.setting}>
          <Text style={styles.label}>Fill My Calendar</Text>
          <Switch
            value={fillMyCalendar}
            onValueChange={handleToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={fillMyCalendar ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        <Button title="Logout" onPress={handleLogout} />
      </ScrollView>
      <Footer navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  main: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50, // Adjust this value to match your desired top spacing
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
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
