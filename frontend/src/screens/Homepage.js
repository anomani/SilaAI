import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import { useNavigation, useRoute } from '@react-navigation/native';

const Homepage = ({ navigation }) => {
  const route = useRoute();
  const { handleLogout } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SilaAI</Text>
      </View>
      <View style={styles.main}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChatDashboard')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Chat Dashboard</Text>
            <Text style={styles.menuSubtitle}>View all your clients and their chats</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClientList')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Clients</Text>
            <Text style={styles.menuSubtitle}>See all your clients and manage them</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Calendar')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Calendar</Text>
            <Text style={styles.menuSubtitle}>View all your appointments</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Chat')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>SilaAI</Text>
            <Text style={styles.menuSubtitle}>Chat with AI to assist with your day to day operations</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('FillMyCalendar')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Fill My Calendar</Text>
            <Text style={styles.menuSubtitle}>Automatically reach out to clients to fill empty slots</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
        {/* <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Metrics')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Metrics</Text>
            <Text style={styles.menuSubtitle}>View message and appointment analytics</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DailyAppointments')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Daily Appointments</Text>
            <Text style={styles.menuSubtitle}>View and manage appointments for each day</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Account</Text>
            <Text style={styles.menuSubtitle}>Manage your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Footer navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    marginTop: 50, // Added this line
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  main: {
    flex: 1,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuSubtitle: {
    color: '#8e8e93',
    fontSize: 14,
  },
});

export default Homepage;