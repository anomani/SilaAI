import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MetricCard = ({ title, value, icon, color, subtitle }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
  </View>
);

const MetricsGrid = ({ todayMetrics }) => {
  const {
    outreachSent = 0,
    outreachResponses = 0,
    outreachBookings = 0,
    outreachRevenue = 0,
    responseRate = 0,
    // Legacy fallbacks
    messagesSent = 0,
    responsesReceived = 0,
    appointmentsBooked = 0,
    revenueGenerated = 0
  } = todayMetrics || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Use the backend-calculated response rate, or fallback to legacy calculation
  const displayResponseRate = responseRate > 0 ? `${responseRate}%` : 
    (outreachSent || messagesSent) > 0 ? 
    `${Math.round(((outreachResponses || responsesReceived) / (outreachSent || messagesSent)) * 100)}%` : 
    '0%';

  const getResponseSubtitle = () => {
    const totalSent = outreachSent || messagesSent;
    const totalResponses = outreachResponses || responsesReceived;
    
    if (totalSent === 0) {
      return 'No outreach sent';
    } else if (totalResponses === 0) {
      return `${displayResponseRate} (7-day rate)`;
    } else {
      return `${displayResponseRate} response rate`;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Fill My Calendar Performance</Text>
      <View style={styles.grid}>
        <MetricCard
          title="Outreach Sent"
          value={(outreachSent || messagesSent).toString()}
          icon="send"
          color="#3498db"
          subtitle="Today's outreach"
        />
        <MetricCard
          title="Responses"
          value={(outreachResponses || responsesReceived).toString()}
          icon="chatbubble"
          color="#4CAF50"
          subtitle={getResponseSubtitle()}
        />
        <MetricCard
          title="Bookings"
          value={(outreachBookings || appointmentsBooked).toString()}
          icon="calendar"
          color="#FF9800"
          subtitle="From outreach"
        />
        <MetricCard
          title="Revenue"
          value={formatCurrency(outreachRevenue || revenueGenerated)}
          icon="cash"
          color="#9C27B0"
          subtitle="Outreach attributed"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  metricCard: {
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    flex: 1,
    minWidth: '42%',
    maxWidth: '48%',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    color: '#aaa',
    fontSize: 12,
  },
});

export default MetricsGrid; 