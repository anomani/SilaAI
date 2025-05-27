import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BlastCountdownTimer = ({ nextBlastTime, timeUntilNext, isNextBlastToday, isEnabled, isRunning }) => {
  const [timeRemaining, setTimeRemaining] = useState(timeUntilNext);

  useEffect(() => {
    setTimeRemaining(timeUntilNext);
  }, [timeUntilNext]);

  useEffect(() => {
    if (!isEnabled || isRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1000);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled, isRunning]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = () => {
    if (!isEnabled) return '#666';
    if (isRunning) return '#FF9800';
    if (timeRemaining <= 300000) return '#F44336'; // Red if less than 5 minutes
    if (timeRemaining <= 1800000) return '#FF9800'; // Orange if less than 30 minutes
    return '#4CAF50'; // Green otherwise
  };

  const getStatusText = () => {
    if (!isEnabled) return 'System Disabled';
    if (isRunning) return 'Running Now';
    if (timeRemaining <= 0) return 'Starting Soon';
    return isNextBlastToday ? 'Next Blast Today' : 'Next Blast Tomorrow';
  };

  const getStatusIcon = () => {
    if (!isEnabled) return 'pause-circle';
    if (isRunning) return 'play-circle';
    if (timeRemaining <= 300000) return 'warning';
    return 'time';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name={getStatusIcon()} 
          size={24} 
          color={getStatusColor()} 
        />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {isEnabled && !isRunning && (
        <View style={styles.countdownContainer}>
          <Text style={styles.timeText}>
            {timeRemaining > 0 ? formatTime(timeRemaining) : '00:00:00'}
          </Text>
          <Text style={styles.nextBlastText}>
            {new Date(nextBlastTime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        </View>
      )}

      {isRunning && (
        <View style={styles.runningContainer}>
          <Text style={styles.runningText}>System is currently running...</Text>
          <View style={styles.pulseContainer}>
            <View style={styles.pulse} />
          </View>
        </View>
      )}

      {!isEnabled && (
        <View style={styles.disabledContainer}>
          <Text style={styles.disabledText}>
            Enable the system to see countdown timer
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  nextBlastText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  runningContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  runningText: {
    fontSize: 16,
    color: '#FF9800',
    marginRight: 12,
  },
  pulseContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
    opacity: 0.8,
  },
  disabledContainer: {
    alignItems: 'center',
  },
  disabledText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default BlastCountdownTimer; 