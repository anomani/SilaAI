import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Button, Linking } from 'react-native';
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
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Account</Text>
        </View>

        <View style={styles.scrollContent}>
          {user && (
            <View style={styles.section}>
              <View style={styles.userInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={20} color="#81b0ff" />
                  <Text style={styles.infoText}>Username: {user.username}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color="#81b0ff" />
                  <Text style={styles.infoText}>Phone Number: {user.phoneNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="link-outline" size={20} color="#81b0ff" />
                  <Text style={styles.infoLabel}>Booking URL: </Text>
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`https://uzicuts.netlify.app/${user.id}`)}
                  >
                    <Text style={[styles.infoText, styles.link]}>
                      https://uzicuts.netlify.app/{user.id}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.setting}>
              <View style={styles.settingLeft}>
                <Ionicons name="calendar-outline" size={24} color="#81b0ff" />
                <Text style={styles.label}>Fill My Calendar</Text>
              </View>
              <Switch
                value={fillMyCalendar}
                onValueChange={handleToggle}
                trackColor={{ false: '#2c2c2e', true: '#81b0ff' }}
                thumbColor={fillMyCalendar ? '#ffffff' : '#767577'}
                ios_backgroundColor="#2c2c2e"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Management</Text>
            <TouchableOpacity 
              style={styles.navigationButton}
              onPress={() => navigation.navigate('AppointmentTypes')}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="cut-outline" size={24} color="#81b0ff" />
                <Text style={styles.buttonText}>Manage Appointment Types</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#81b0ff" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Footer navigation={navigation} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    flex: 1,
    paddingVertical: 16,
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
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  userInfo: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
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
  link: {
    color: '#81b0ff',
    textDecorationLine: 'underline',
  },
  navigationButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#3a3a3c',
    borderRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SettingsPage;
