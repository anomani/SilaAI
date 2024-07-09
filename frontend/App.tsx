import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { savePushToken } from './src/services/api';
import { ChatProvider } from './src/components/ChatContext';

// Import your screen components
import Homepage from './src/screens/Homepage';
import ClientListScreen from './src/screens/ClientListScreen';
import ScheduleScreen from './src/screens/ScheduleScreen'
import CalendarScreen from './src/screens/CalendarScreen';
import AddAppointmentScreen from './src/screens/AddAppointmentScreen';
import ClientDetailsScreen from './src/screens/ClientDetailsScreen';
import AddClientScreen from './src/screens/AddClientScreen';
import QueryResults from './src/screens/QueryResults';
import AppointmentDetailsScreen from './src/screens/AppointmentDetailsScreen';
import ChatScreen from './src/screens/ChatScreen';
import EditClientScreen from './src/screens/EditClientScreen';
import ChatDashboard from './src/screens/ChatDashboard';
import ClientMessagesScreen from './src/screens/ClientMessagesScreen';

const Stack = createStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;
  
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      alert('Project ID not found');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Push Token:', token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

const AppContent: React.FC = () => {
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        savePushToken('+18446480598', token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const data = response.notification.request.content.data;
      console.log('Notification data:', data);
      
      if (data && typeof data === 'object' && 'clientId' in data) {
        const clientId = data.clientId;
        const clientName = data.clientName || 'Unknown Client';
        console.log('Navigating to ClientMessages with:', { clientId, clientName });
        navigation.navigate('ClientMessages', { clientId: Number(clientId), clientName });
      } else {
        console.warn('Invalid or missing clientId in notification data:', data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation]);

  return (
    <Stack.Navigator initialRouteName="Homepage" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Homepage" component={Homepage} />
      <Stack.Screen name="ClientList" component={ClientListScreen} />
      <Stack.Screen name="ScheduleScreen" component={ScheduleScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
      <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
      <Stack.Screen name="AddClient" component={AddClientScreen} />
      <Stack.Screen name="QueryResults" component={QueryResults} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="EditClient" component={EditClientScreen} />
      <Stack.Screen name="ChatDashboard" component={ChatDashboard} />
      <Stack.Screen name="ClientMessages" component={ClientMessagesScreen} />
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </NavigationContainer>
  );
};

export default App;
