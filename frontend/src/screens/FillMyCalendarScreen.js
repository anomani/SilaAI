import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';
import BlastCountdownTimer from '../components/BlastCountdownTimer';
import MetricsGrid from '../components/MetricsGrid';
import MessageApprovalCard from '../components/MessageApprovalCard';
import { 
  getFillMyCalendarStatus, 
  setFillMyCalendarStatus, 
  runFillMyCalendar, 
  getFillMyCalendarData,
  getFillMyCalendarSystemStatus,
  approveOutreachMessage,
  rejectOutreachMessage,
  bulkApproveOutreachMessages,
  updateOutreachMessage,
  getClientById
} from '../services/api';
import ClientOutreachCard from '../components/ClientOutreachCard';

const FillMyCalendarScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  
  // System status
  const [systemStatus, setSystemStatus] = useState({
    isEnabled: false,
    isRunning: false,
    nextBlastTime: null,
    timeUntilNext: 0,
    isNextBlastToday: false
  });
  
  // Dashboard data
  const [todayMetrics, setTodayMetrics] = useState({});
  const [appointmentData, setAppointmentData] = useState({});
  const [pendingMessages, setPendingMessages] = useState([]);
  const [clientPipeline, setClientPipeline] = useState({});
  
  // UI state
  const [processingClients, setProcessingClients] = useState(new Set());
  const [selectedMessages, setSelectedMessages] = useState(new Set());

  useEffect(() => {
    fetchInitialData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchSystemStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSystemStatus(),
        fetchDashboardData()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const status = await getFillMyCalendarSystemStatus();
      setSystemStatus(status);
      setFeatureEnabled(status.isEnabled);
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const data = await getFillMyCalendarData();
      setTodayMetrics(data.todayMetrics || {});
      setAppointmentData(data.appointmentData || {});
      setPendingMessages(data.pendingMessages || []);
      setClientPipeline(data.clientPipeline || {});
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleToggleFeature = async (value) => {
    try {
      setFeatureEnabled(value);
      await setFillMyCalendarStatus(value);
      await fetchSystemStatus();
      
      if (value) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error toggling feature:', error);
      setFeatureEnabled(!value);
      Alert.alert('Error', 'Failed to update system status');
    }
  };

  const handleRunNow = async () => {
    Alert.alert(
      'Run Fill My Calendar',
      'This will analyze your calendar and create outreach messages for eligible clients. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Run Now', 
          onPress: async () => {
            try {
              setRefreshing(true);
              await runFillMyCalendar();
              await fetchDashboardData();
              Alert.alert('Success', 'Fill My Calendar process completed');
            } catch (error) {
              console.error('Error running Fill My Calendar:', error);
              Alert.alert('Error', 'Failed to run Fill My Calendar process');
            } finally {
              setRefreshing(false);
            }
          }
        }
      ]
    );
  };

  const handleApproveMessage = async (clientId) => {
    try {
      setProcessingClients(prev => new Set([...prev, clientId]));
      const result = await approveOutreachMessage(clientId);
      
      // Remove from pending messages
      setPendingMessages(prev => prev.filter(msg => msg.id !== clientId));
      
      Alert.alert('Success', `Message sent to ${result.clientName}`);
      await fetchDashboardData(); // Refresh to update metrics
    } catch (error) {
      console.error('Error approving message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setProcessingClients(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  const handleRejectMessage = async (clientId) => {
    try {
      await rejectOutreachMessage(clientId);
      setPendingMessages(prev => prev.filter(msg => msg.id !== clientId));
    } catch (error) {
      console.error('Error rejecting message:', error);
      Alert.alert('Error', 'Failed to reject message');
    }
  };

  const handleEditMessage = async (clientId, newMessage) => {
    try {
      await updateOutreachMessage(clientId, newMessage);
      setPendingMessages(prev => 
        prev.map(msg => 
          msg.id === clientId ? { ...msg, message: newMessage } : msg
        )
      );
    } catch (error) {
      console.error('Error updating message:', error);
      Alert.alert('Error', 'Failed to update message');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedMessages.size === 0) {
      Alert.alert('No Selection', 'Please select messages to approve');
      return;
    }

    Alert.alert(
      'Bulk Approve',
      `Send ${selectedMessages.size} outreach messages?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send All',
          onPress: async () => {
            try {
              const clientIds = Array.from(selectedMessages);
              setProcessingClients(prev => new Set([...prev, ...clientIds]));
              
              const result = await bulkApproveOutreachMessages(clientIds);
              
              // Remove successful sends from pending messages
              setPendingMessages(prev => 
                prev.filter(msg => !result.results.some(r => r.clientId === msg.id && r.success))
              );
              
              setSelectedMessages(new Set());
              
              Alert.alert(
                'Bulk Approve Complete',
                `Successfully sent ${result.successCount} messages. ${result.errorCount} failed.`
              );
              
              await fetchDashboardData();
            } catch (error) {
              console.error('Error bulk approving:', error);
              Alert.alert('Error', 'Failed to send bulk messages');
            } finally {
              setProcessingClients(new Set());
            }
          }
        }
      ]
    );
  };

  const toggleMessageSelection = (clientId) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleClientPress = async (clientId, firstName, lastName) => {
    try {
      // Fetch full client details before navigation
      const clientDetails = await getClientById(clientId);
      navigation.navigate('ClientDetails', { 
        client: {
          id: clientId,
          firstname: firstName,
          lastname: lastName,
          phonenumber: clientDetails.phonenumber,
          email: clientDetails.email,
          notes: clientDetails.notes
        }
      });
    } catch (error) {
      console.error('Error fetching client details:', error);
      Alert.alert('Error', 'Failed to load client details');
    }
  };

  const renderMessageApprovalCard = ({ item: client }) => (
    <MessageApprovalCard
      client={client}
      onApprove={handleApproveMessage}
      onReject={handleRejectMessage}
      onEdit={handleEditMessage}
      isProcessing={processingClients.has(client.id)}
      onClientPress={() => handleClientPress(client.id, client.firstName, client.lastName)}
      isSelected={selectedMessages.has(client.id)}
      onToggleSelection={() => toggleMessageSelection(client.id)}
    />
  );

  const renderEmptySlotsBreakdown = () => {
    const { slotsByGroup = {} } = appointmentData;
    
    return (
      <View style={styles.slotsBreakdown}>
        <Text style={styles.sectionTitle}>Available Slots</Text>
        <View style={styles.slotsGrid}>
          <View style={styles.totalSlotsCard}>
            <Text style={styles.totalSlotsNumber}>{appointmentData.totalEmptySpots || 0}</Text>
            <Text style={styles.totalSlotsLabel}>Empty Slots</Text>
          </View>
          <View style={styles.slotsDetails}>
            {Object.entries(slotsByGroup).map(([group, count]) => (
              <View key={group} style={styles.slotGroup}>
                <Text style={styles.slotGroupName}>Group {group}</Text>
                <Text style={styles.slotGroupCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderClientPipeline = () => {
    const { readyForOutreach = 0, currentlyContacted = 0, totalEligible = 0 } = clientPipeline;
    
    return (
      <View style={styles.pipelineContainer}>
        <Text style={styles.sectionTitle}>Client Pipeline</Text>
        <View style={styles.pipelineStats}>
          <View style={styles.pipelineStat}>
            <Text style={styles.pipelineNumber}>{totalEligible}</Text>
            <Text style={styles.pipelineLabel}>Total Eligible</Text>
          </View>
          <View style={styles.pipelineStat}>
            <Text style={[styles.pipelineNumber, { color: '#FF9800' }]}>{currentlyContacted}</Text>
            <Text style={styles.pipelineLabel}>Being Contacted</Text>
          </View>
          <View style={styles.pipelineStat}>
            <Text style={[styles.pipelineNumber, { color: '#4CAF50' }]}>{readyForOutreach}</Text>
            <Text style={styles.pipelineLabel}>Ready for Outreach</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading Mission Control...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
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
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Blast Countdown Timer */}
          <View style={styles.section}>
            <BlastCountdownTimer
              nextBlastTime={systemStatus.nextBlastTime}
              timeUntilNext={systemStatus.timeUntilNext}
              isNextBlastToday={systemStatus.isNextBlastToday}
              isEnabled={systemStatus.isEnabled}
              isRunning={systemStatus.isRunning}
            />
          </View>

          {/* Metrics Grid */}
          <MetricsGrid todayMetrics={todayMetrics} />

          {/* Manual Controls */}
          <View style={styles.section}>
            <View style={styles.controlsHeader}>
              <Text style={styles.sectionTitle}>System Controls</Text>
              <TouchableOpacity 
                style={[styles.runButton, refreshing && styles.disabledButton]} 
                onPress={handleRunNow} 
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="play" size={18} color="#ffffff" />
                )}
                <Text style={styles.runButtonText}>
                  {refreshing ? 'Running...' : 'Run Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Available Slots */}
          {renderEmptySlotsBreakdown()}

          {/* Client Pipeline */}
          {renderClientPipeline()}

          {/* Message Approval Center */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Messages ({pendingMessages.length})
            </Text>
            
            {pendingMessages.length > 0 && (
              <View style={styles.bulkControlsContainer}>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={() => {
                    if (selectedMessages.size === pendingMessages.length) {
                      setSelectedMessages(new Set());
                    } else {
                      setSelectedMessages(new Set(pendingMessages.map(m => m.id)));
                    }
                  }}
                >
                  <Text style={styles.selectAllText}>
                    {selectedMessages.size === pendingMessages.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                {selectedMessages.size > 0 && (
                  <TouchableOpacity
                    style={styles.bulkApproveButton}
                    onPress={handleBulkApprove}
                  >
                    <Ionicons name="send" size={16} color="#ffffff" />
                    <Text style={styles.bulkApproveText}>
                      Send {selectedMessages.size}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {pendingMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.emptyStateText}>No pending messages</Text>
                <Text style={styles.emptyStateSubtext}>
                  All outreach messages have been processed
                </Text>
              </View>
            ) : (
              <FlatList
                data={pendingMessages}
                renderItem={renderMessageApprovalCard}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
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
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  controlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  runButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  slotsBreakdown: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  slotsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  totalSlotsCard: {
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginRight: 16,
    minWidth: 100,
  },
  totalSlotsNumber: {
    color: '#3498db',
    fontSize: 32,
    fontWeight: 'bold',
  },
  totalSlotsLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  slotsDetails: {
    flex: 1,
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    padding: 16,
  },
  slotGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  pipelineContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  pipelineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    padding: 20,
  },
  pipelineStat: {
    alignItems: 'center',
  },
  pipelineNumber: {
    color: '#3498db',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pipelineLabel: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  pipelineDescription: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bulkControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#444',
  },
  selectAllText: {
    color: '#fff',
    fontSize: 12,
  },
  bulkApproveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  bulkApproveText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptyStateSubtext: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default FillMyCalendarScreen; 