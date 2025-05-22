import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { savePushToken, getSuggestedResponseCount } from './src/services/api';
import { ChatProvider } from './src/components/ChatContext';
import { MessageProvider } from './src/components/MessageContext';
import DailyAppointments from './src/screens/DailyAppointments';

// Import your existing screen components
import Homepage from './src/screens/Homepage';
import ClientListScreen from './src/screens/ClientListScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
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
import InitiateConversation from './src/screens/InitiateConversation';
import MetricsScreen from './src/screens/MetricsScreen';
import SettingsPage from './src/screens/SettingsPage';
import AppointmentTypesScreen from './src/screens/AppointmentTypesScreen';
import MessageTemplatesScreen from './src/screens/MessageTemplatesScreen';
import FillMyCalendarScreen from './src/screens/FillMyCalendarScreen';

// Import new login and register components
import Login from './src/components/Login';
import Register from './src/components/Register';

// Import auth utilities
import { getToken, logout } from './src/utils/auth';

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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Add function to update badge count
  const updateBadgeCount = useCallback(async () => {
    try {
      if (isLoggedIn) {
        const count = await getSuggestedResponseCount();
        setBadgeCount(count);
        await Notifications.setBadgeCountAsync(count);
      } else {
        setBadgeCount(0);
        await Notifications.setBadgeCountAsync(0);
      }
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }, [isLoggedIn]);

  // Add interval to update badge count
  useEffect(() => {
    updateBadgeCount();
    const interval = setInterval(updateBadgeCount, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      // Clear badge count on unmount
      Notifications.setBadgeCountAsync(0);
    };
  }, [updateBadgeCount]);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsLoggedIn(false);
    // Clear badge count on logout
    await Notifications.setBadgeCountAsync(0);
    setBadgeCount(0);
  }, []);

  const handleLogin = useCallback(() => {
    setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    // Check if the user is logged in and token is valid
    const checkLoginStatus = async () => {
      const token = await getToken();
      setIsLoggedIn(!!token);
      if (!token) {
        // Clear badge count if not logged in
        await Notifications.setBadgeCountAsync(0);
        setBadgeCount(0);
      }
    };

    // Check login status initially
    checkLoginStatus();

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
      
      if (data && typeof data === 'object' && isLoggedIn) {
        const { clientId, clientName, clientMessage, suggestedResponse, notificationType } = data;
        
        if (notificationType === 'suggestedResponse') {
          console.log('Navigating to ClientMessages with suggested response:', { clientId, clientName, suggestedResponse });
          navigation.navigate('ClientMessages', { 
            clientid: clientId, 
            clientName, 
            suggestedResponse 
          });
        } else if (notificationType === 'clientMessage') {
          console.log('Navigating to ClientMessages with client message:', { clientId, clientName, clientMessage });
          navigation.navigate('ClientMessages', { 
            clientid: clientId, 
            clientName, 
            clientMessage 
          });
        } else if (data.notificationType === 'unpaid_appointments') {
          navigation.navigate('DailyAppointments');
        } else if (data.notificationType === 'appointment_ended') {
          console.log('Navigating to CalendarScreen for ended appointment:', { clientId });
          navigation.navigate('Calendar', { openAppointmentForClient: clientId });
        }
      } else {
        console.warn('Invalid or missing data in notification, or user not logged in:', data);
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
  }, [navigation, isLoggedIn]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen 
            name="Homepage" 
            component={Homepage}
            initialParams={{ handleLogout }}
          />
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
          <Stack.Screen 
            name="ClientMessages" 
            component={ClientMessagesScreen} 
            initialParams={{ clientid: 0, clientName: '', suggestedResponse: false }}
          />
          <Stack.Screen name="InitiateConversation" component={InitiateConversation} />
          <Stack.Screen name="Metrics" component={MetricsScreen} /> 
          <Stack.Screen name="DailyAppointments" component={DailyAppointments} />
          <Stack.Screen name="FillMyCalendar" component={FillMyCalendarScreen} />
          <Stack.Screen 
            name="Settings" 
            component={SettingsPage}
            initialParams={{ handleLogout }}
          />
          <Stack.Screen name="AppointmentTypes" component={AppointmentTypesScreen} />
          <Stack.Screen name="MessageTemplates" component={MessageTemplatesScreen} />
        </>
      ) : (
        <>
          <Stack.Screen 
            name="Login" 
            component={Login} 
            initialParams={{ handleLogin }}
          />
          <Stack.Screen name="Register" component={Register} />
        </>
      )}
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <ChatProvider>
        <MessageProvider>
          <AppContent />
        </MessageProvider>
      </ChatProvider>
    </NavigationContainer>
  );
};

export default App;