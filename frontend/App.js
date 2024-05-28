// frontend/App.js
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import axios from 'axios';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Homepage from './src/screens/Homepage';
import ClientListScreen from './src/screens/ClientListScreen';
import ScheduleScreen from './src/screens/ScheduleScreen'


const Stack = createStackNavigator();

export default function App() {
  // useEffect(() => {
  //   const updateClientData = async () => {
  //     try {
  //       await axios.get('http://localhost:3000/api/followup/update-clients');
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
