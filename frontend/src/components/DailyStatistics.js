import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DailyStatistics = ({ appointments }) => {
  const paidAppointments = appointments.filter(app => app.paid);
  const pendingAppointments = appointments.filter(app => !app.paid && app.paymentmethod === 'e-transfer');
  const unpaidAppointments = appointments.filter(app => !app.paid && app.paymentmethod !== 'e-transfer');
  const totalEarnings = appointments.reduce((sum, app) => sum + (app.paid ? parseFloat(app.price) + parseFloat(app.tipamount || 0) : 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Paid:</Text>
        <Text style={styles.statValue}>{paidAppointments.length}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Pending:</Text>
        <Text style={styles.statValue}>{pendingAppointments.length}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Unpaid:</Text>
        <Text style={styles.statValue}>{unpaidAppointments.length}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Total:</Text>
        <Text style={styles.statValue}>${totalEarnings.toFixed(2)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2c2c2e',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#8e8e93',
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DailyStatistics;