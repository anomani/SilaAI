// // frontend/src/screens/Homepage.js
// import React from 'react';
// import { View, Text, Button, StyleSheet } from 'react-native';

// const Homepage = ({ navigation }) => {
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Client Management System</Text>
//       <Button
//         title="Manage Clients"
//         onPress={() => navigation.navigate('ClientList')}
//       />
//       <Button
//         title="Schedule Appointment"
//         onPress={() => navigation.navigate('ScheduleAppointment')}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//   },
//   title: {
//     fontSize: 24,
//     marginBottom: 20,
//   },
// });

// export default Homepage;


import React from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';

const Homepage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Client Dashboard</Text>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => navigation.navigate('ClientList')}>
            <Text style={styles.navLink}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ScheduleAppointment')}>
            <Text style={styles.navLink}>Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.navLink}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.navLink}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.main}>
        <Text style={styles.title}>Welcome to the Client Dashboard</Text>
        <Text style={styles.subtitle}>
          Manage your clients, appointments, and messages all in one place.
        </Text>
        <View style={styles.buttons}>
          <Button
            title="Manage Clients"
            onPress={() => navigation.navigate('ClientList')}
          />
          <Button
            title="Schedule Appointment"
            onPress={() => navigation.navigate('ScheduleAppointment')}
          />
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 Client Dashboard. All rights reserved.</Text>
        <View style={styles.footerNav}>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#333',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  nav: {
    flexDirection: 'row',
  },
  navLink: {
    color: '#fff',
    marginLeft: 16,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  footer: {
    backgroundColor: '#333',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
  },
  footerNav: {
    flexDirection: 'row',
  },
  footerLink: {
    color: '#fff',
    marginLeft: 16,
  },
});

export default Homepage;
