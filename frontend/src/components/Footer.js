import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSuggestedResponseCount } from '../services/api';

const Footer = ({ navigation }) => {
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = async () => {
    try {
      const count = await getSuggestedResponseCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error updating pending messages count:', error);
    }
  };

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Homepage')}>
        <Ionicons name="home" size={24} color="#fff" />
        <Text style={styles.footerText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Calendar')}>
        <Ionicons name="calendar" size={24} color="#fff" />
        <Text style={styles.footerText}>Calendar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('ChatDashboard')}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles" size={24} color="#fff" />
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.footerText}>Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('ClientList')}>
        <Ionicons name="people" size={24} color="#fff" />
        <Text style={styles.footerText}>Clients</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerItem: {
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Footer;