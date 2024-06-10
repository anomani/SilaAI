// frontend/App.js
import React, { useEffect } from 'react';
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

const Stack = createStackNavigator();

export default function App() {
  // useEffect(() => {
  //   const updateClientData = async () => {
  //     try {
  //       await axios.get('https://lab-sweeping-typically.ngrok-free.app/api/followup/update-clients');
  //     } catch (error) {
  //       console.error('Error updating client data:', error);
  //     }
  //   };

  //   updateClientData();
  // }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Homepage">
        <Stack.Screen name="Homepage" component={Homepage} />
        <Stack.Screen name="ClientList" component={ClientListScreen} />
        <Stack.Screen name="ScheduleAppointment" component={ScheduleScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
        <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
        <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
        <Stack.Screen name="AddClient" component={AddClientScreen} />
        <Stack.Screen name="SuggestedFollowUps" component={SuggestedFollowUpsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
});
