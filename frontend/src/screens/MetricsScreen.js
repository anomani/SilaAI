import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MessageMetrics from '../components/MessageMetrics';
import AppointmentMetrics from '../components/AppointmentMetrics';
import { getMessageMetrics, getAppointmentMetrics } from '../services/api';

const Tab = createBottomTabNavigator();

const MetricsScreen = () => {
  const [messageMetrics, setMessageMetrics] = useState(null);
  const [appointmentMetrics, setAppointmentMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const messageData = await getMessageMetrics();
      const appointmentData = await getAppointmentMetrics();
      setMessageMetrics(messageData);
      setAppointmentMetrics(appointmentData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Metrics</Text>
      </View>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Messages') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Appointments') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#195de6',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: { backgroundColor: '#111318' },
        })}
      >
        <Tab.Screen name="Messages" options={{ headerShown: false }}>
          {() => <MessageMetrics metrics={messageMetrics} loading={loading} />}
        </Tab.Screen>
        <Tab.Screen name="Appointments" options={{ headerShown: false }}>
          {() => <AppointmentMetrics metrics={appointmentMetrics} loading={loading} />}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111318',
    borderBottomWidth: 1,
    borderBottomColor: '#292e38',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MetricsScreen;
