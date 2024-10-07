import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Button } from 'react-native';
import { getFillMyCalendarStatus, setFillMyCalendarStatus, getCurrentUser } from '../services/api';
import { Ionicons } from '@expo/vector-icons'; // Make sure to import this
import Footer from '../components/Footer'; // Import the Footer component
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <SafeAreaView style={styles.pageContainer}>
        <ActivityIndicator size="large" color="#ffffff" style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.pageContainer}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
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
      </View>
      <Footer navigation={navigation} />
    </SafeAreaView>
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
  userInfo: {
    marginBottom: 20,
    padding: 10,
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