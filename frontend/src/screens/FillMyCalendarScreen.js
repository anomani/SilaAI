import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import { getFillMyCalendarStatus, setFillMyCalendarStatus, runFillMyCalendar, getFillMyCalendarData } from '../services/api';
import ClientOutreachCard from '../components/ClientOutreachCard';

const FillMyCalendarScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [strategy, setStrategy] = useState('');
  const [emptySlots, setEmptySlots] = useState({});
  const [totalEmptySlots, setTotalEmptySlots] = useState(0);
  const [clientsToContact, setClientsToContact] = useState([]);
  const [upcomingClients, setUpcomingClients] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframeDays, setTimeframeDays] = useState(7);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch feature status
      const statusResponse = await getFillMyCalendarStatus();
      setFeatureEnabled(statusResponse.status);
      
      // If the feature is enabled, fetch data
      if (statusResponse.status) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const data = await getFillMyCalendarData();
      
      // Update state with fetched data
      if (data) {
        setStrategy(data.recommendedStrategy || 'No active strategy');
        setEmptySlots(data.appointmentData?.slotsByGroup || {});
        setTotalEmptySlots(data.appointmentData?.totalEmptySpots || 0);
        setClientsToContact(data.clientsToContact || []);
        setUpcomingClients(data.upcomingClients || []);
        setRecentResults(data.recentResults || []);
        setTimeframeDays(data.appointmentData?.timeframeDays || 7);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleToggleFeature = async (value) => {
    try {
      setFeatureEnabled(value);
      await setFillMyCalendarStatus(value);
      
      if (value) {
        // If enabling the feature, fetch data
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error toggling feature:', error);
      // Revert UI if there was an error
      setFeatureEnabled(!value);
    }
  };

  const handleRunNow = async () => {
    try {
      setRefreshing(true);
      await runFillMyCalendar();
      await fetchDashboardData();
    } catch (error) {
      console.error('Error running Fill My Calendar:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderEmptySlotsBreakdown = () => {
    return (
      <View style={styles.sectionContent}>
        {Object.entries(emptySlots).map(([group, count]) => (
          <View key={group} style={styles.slotGroup}>
            <Text style={styles.slotGroupName}>Group {group}</Text>
            <Text style={styles.slotGroupCount}>{count}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fill My Calendar</Text>
        <View style={styles.headerControls}>
          <Text style={styles.enableText}>Enable</Text>
          <Switch
            value={featureEnabled}
            onValueChange={handleToggleFeature}
            trackColor={{ false: '#767577', true: '#3498db' }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>

      {!featureEnabled ? (
        <View style={styles.disabledView}>
          <Ionicons name="calendar-outline" size={64} color="#555" />
          <Text style={styles.disabledText}>
            Enable this feature to automatically reach out to past clients and fill your empty appointment slots.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Strategy Panel */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Strategy</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRunNow} disabled={refreshing}>
                {refreshing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="refresh" size={22} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.strategyBox}>
              <Text style={styles.strategyText}>{strategy}</Text>
              <Text style={styles.timeframeText}>Looking at the next {timeframeDays} days</Text>
            </View>
          </View>

          {/* Available Slots Panel */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Slots</Text>
            <View style={styles.slotsOverview}>
              <View style={styles.totalSlotsBox}>
                <Text style={styles.totalSlotsCount}>{totalEmptySlots}</Text>
                <Text style={styles.totalSlotsLabel}>Empty Slots</Text>
              </View>
              {renderEmptySlotsBreakdown()}
            </View>
          </View>

          {/* Clients Being Contacted */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clients Being Contacted</Text>
            {clientsToContact.length > 0 ? (
              clientsToContact.map((client) => (
                <ClientOutreachCard
                  key={client.id}
                  client={client}
                  onEdit={() => navigation.navigate('ClientMessages', { clientId: client.id })}
                />
              ))
            ) : (
              <Text style={styles.emptyStateText}>No clients currently selected for outreach</Text>
            )}
          </View>

          {/* Next Up Clients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Up</Text>
            {upcomingClients.length > 0 ? (
              upcomingClients.map((client) => (
                <ClientOutreachCard 
                  key={client.id} 
                  client={client} 
                  isUpcoming={true}
                />
              ))
            ) : (
              <Text style={styles.emptyStateText}>No clients in the queue</Text>
            )}
          </View>

          {/* Results & Feedback */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Results</Text>
            {recentResults.length > 0 ? (
              <View style={styles.resultsContainer}>
                {recentResults.map((result, index) => (
                  <View key={index} style={styles.resultItem}>
                    <Text style={styles.resultName}>{result.clientName}</Text>
                    <Text style={styles.resultStatus}>{result.outcome}</Text>
                    <Text style={styles.resultDate}>{result.date}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyStateText}>No recent results to display</Text>
            )}
          </View>
        </ScrollView>
      )}

      <Footer navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enableText: {
    color: '#fff',
    marginRight: 8,
  },
  disabledView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  disabledText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#3498db',
  },
  strategyBox: {
    backgroundColor: '#2a2a2c',
    borderRadius: 8,
    padding: 16,
  },
  strategyText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  timeframeText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
  },
  slotsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  totalSlotsBox: {
    backgroundColor: '#2a2a2c',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
  },
  totalSlotsCount: {
    color: '#3498db',
    fontSize: 28,
    fontWeight: 'bold',
  },
  totalSlotsLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  sectionContent: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: '#2a2a2c',
    borderRadius: 8,
    padding: 12,
  },
  slotGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  slotGroupName: {
    color: '#fff',
    fontSize: 14,
  },
  slotGroupCount: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyStateText: {
    color: '#aaa',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },
  resultsContainer: {
    backgroundColor: '#2a2a2c',
    borderRadius: 8,
    padding: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  resultName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  resultStatus: {
    color: '#3498db',
    fontSize: 14,
    marginHorizontal: 8,
  },
  resultDate: {
    color: '#aaa',
    fontSize: 12,
  },
});

export default FillMyCalendarScreen; 