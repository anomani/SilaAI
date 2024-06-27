import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import axios from 'axios';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Homepage from './src/screens/Homepage';
import ClientListScreen from './src/screens/ClientListScreen';
import ScheduleScreen from './src/screens/ScheduleScreen'
import CalendarScreen from './src/screens/CalendarScreen';
import AddAppointmentScreen from './src/screens/AddAppointmentScreen';
import ClientDetailsScreen from './src/screens/ClientDetailsScreen';
import AddClientScreen from './src/screens/AddClientScreen';
import SuggestedFollowUpsScreen from './src/screens/SuggestedFollowUpsScreen';
import AppointmentDetailsScreen from './src/screens/AppointmentDetailsScreen';
import ChatScreen from './src/screens/ChatScreen';
import EditClientScreen from './src/screens/EditClientScreen';
import ChatDashboard from './src/screens/ChatDashboard';
import ClientMessagesScreen from './src/screens/ClientMessagesScreen';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { savePushToken } from './src/services/api';

const Stack = createStackNavigator();

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        savePushToken('+18446480598', token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Handle received notification
      console.log(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification response (e.g., when user taps the notification)
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Homepage" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Homepage" component={Homepage} />
        <Stack.Screen name="ClientList" component={ClientListScreen} />
        <Stack.Screen name="ScheduleScreen" component={ScheduleScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
        <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
        <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
        <Stack.Screen name="AddClient" component={AddClientScreen} />
        <Stack.Screen name="SuggestedFollowUps" component={SuggestedFollowUpsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="EditClient" component={EditClientScreen} />
        <Stack.Screen name="ChatDashboard" component={ChatDashboard} />
        <Stack.Screen name="ClientMessages" component={ClientMessagesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
  },
});

async function registerForPushNotificationsAsync() {
  let token;
  
  // Check if the app is running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';

  if (Constants.isDevice || isExpoGo) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return null;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push Token:', token);
  } else {
    alert('Push notifications are only available on physical devices.');
  }

  return token;
}
