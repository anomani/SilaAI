import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Modal, Platform } from 'react-native';
import { getAppointmentsByDay, updateAppointmentPayment, getClientById } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import { Ionicons } from '@expo/vector-icons';
import DailyStatistics from '../components/DailyStatistics';
import { Calendar } from 'react-native-calendars';

const DailyAppointments = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('paid'); // Changed default to 'paid'
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const fetchedAppointments = await getAppointmentsByDay(formattedDate);
      
      // Fetch client names for each appointment
      const appointmentsWithClientNames = await Promise.all(
        fetchedAppointments.map(async (appointment) => {
          if (appointment.appointmenttype === 'BLOCKED_TIME') {
            return {
              ...appointment,
              clientName: 'Blocked Time',
              startTime: convertTo12HourFormat(appointment.starttime),
              endTime: convertTo12HourFormat(appointment.endtime)
            };
          } else {
            const client = await getClientById(appointment.clientid);
            return {
              ...appointment,
              clientName: `${client.firstname} ${client.lastname}`,
              startTime: convertTo12HourFormat(appointment.starttime),
              endTime: convertTo12HourFormat(appointment.endtime)
            };
          }
        })
      );
      
      setAppointments(appointmentsWithClientNames);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const convertTo12HourFormat = (time) => {
    const [hours, minutes] = time.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes} ${period}`;
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    const options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const handlePaymentLog = (appointment) => {
    setSelectedAppointment(appointment);
    setIsPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      await updateAppointmentPayment(
        selectedAppointment.id,
        paymentData.paid,
        paymentData.tipAmount,
        paymentData.paymentMethod
      );
      setIsPaymentModalVisible(false);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment payment:', error);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (activeTab === 'paid') return appointment.paid;
    if (activeTab === 'unpaid') return !appointment.paid && appointment.paymentmethod !== 'e-transfer';
    if (activeTab === 'pending') return !appointment.paid && appointment.paymentmethod === 'e-transfer';
  });

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
  };

  const handleCustomDateSelect = (day) => {
    setShowCustomDatePicker(false);
    // Create date with timezone adjustment
    const selectedDate = new Date(day.timestamp + new Date().getTimezoneOffset() * 60000);
    setSelectedDate(selectedDate);
  };

  const renderCustomDatePicker = () => {
    return (
      <Modal
        transparent={true}
        visible={showCustomDatePicker}
        onRequestClose={() => setShowCustomDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowCustomDatePicker(false)}
        >
          <View style={styles.calendarModal}>
            <Calendar
              onDayPress={handleCustomDateSelect}
              current={selectedDate.toISOString()}
              markedDates={{
                [selectedDate.toISOString().split('T')[0]]: { selected: true }
              }}
              theme={{
                backgroundColor: '#2c2c2e',
                calendarBackground: '#2c2c2e',
                textSectionTitleColor: '#fff',
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: '#fff',
                todayTextColor: '#007AFF',
                dayTextColor: '#fff',
                textDisabledColor: '#444',
                monthTextColor: '#fff',
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const calculateDailyTotal = () => {
    if (!appointments || appointments.length === 0) {
      return '0.00';
    }
    return appointments.reduce((total, appointment) => {
      const price = Number(appointment.price) || 0;
      const tip = Number(appointment.tipamount) || 0;
      return total + price + tip;
    }, 0).toFixed(2);
  };

  const renderAppointmentItem = ({ item }) => (
    <View style={styles.appointmentItem}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.appointmentTime}>
          {`${item.startTime} - ${item.endTime}`}
        </Text>
        <Text style={[styles.appointmentStatus, 
          { color: item.paid ? '#4CD964' : (item.paymentmethod === 'e-transfer' ? '#FFCC00' : '#FF3B30') }]}>
          {item.paid ? 'Paid' : (item.paymentmethod === 'e-transfer' ? 'Pending' : 'Unpaid')}
        </Text>
      </View>
      <View style={styles.appointmentDetails}>
        <Text style={styles.appointmentClient}>{item.clientName}</Text>
        <Text style={styles.appointmentType}>{item.appointmenttype || 'No Type'}</Text>
      </View>
      {item.paid ? (
        <View style={styles.paymentInfoContainer}>
          <View style={styles.paymentMethodContainer}>
            <Text style={styles.paymentMethodText}>
              {item.paymentmethod === 'cash' ? 'Cash' : 'E-Transfer'}
            </Text>
          </View>
          {item.tipamount != null && (
            <View style={styles.tipContainer}>
              <Text style={styles.tipLabel}>Tip:</Text>
              <Text style={styles.tipAmount}>${Number(item.tipamount).toFixed(2)}</Text>
            </View>
          )}
        </View>
      ) : null}
      {item.paid ? (
        <TouchableOpacity style={styles.logPaymentButton} onPress={() => handlePaymentLog(item)}>
          <Text style={styles.logPaymentButtonText}>Update Payment</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.logPaymentButton} onPress={() => handlePaymentLog(item)}>
          <Text style={styles.logPaymentButtonText}>Log Payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.dateNavigation}>
            <TouchableOpacity onPress={() => changeDate(-1)}>
              <Ionicons name="chevron-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday}>
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dateContainer}
              onPress={() => setShowCustomDatePicker(true)}
            >
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              <Ionicons name="calendar" size={20} color="white" style={styles.calendarIcon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)}>
              <Ionicons name="chevron-forward" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Paid:</Text>
            <Text style={styles.statValue}>
              {appointments.filter(a => a.paid).length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending:</Text>
            <Text style={styles.statValue}>
              {appointments.filter(a => !a.paid && a.paymentmethod === 'e-transfer').length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Unpaid:</Text>
            <Text style={styles.statValue}>
              {appointments.filter(a => !a.paid && a.paymentmethod !== 'e-transfer').length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total:</Text>
            <Text style={styles.statValue}>${calculateDailyTotal()}</Text>
          </View>
        </View>

        {/* Tabs Section */}
        <View style={styles.tabsContainer}>
          {['paid', 'unpaid', 'pending'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Appointments List */}
        <FlatList
          data={filteredAppointments}
          renderItem={({ item }) => (
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.timeText}>
                  {item.startTime} - {item.endTime}
                </Text>
                <Text style={[styles.statusText, { color: item.paid ? '#4CD964' : '#FF3B30' }]}>
                  {item.paid ? 'Paid' : 'Unpaid'}
                </Text>
              </View>
              
              <Text style={styles.nameText}>{item.clientName}</Text>
              <Text style={styles.serviceText}>{item.appointmenttype}</Text>
              
              <View style={styles.paymentInfo}>
                {item.paid && (
                  <View style={styles.paymentMethod}>
                    <Text style={styles.paymentMethodText}>
                      {item.paymentmethod === 'cash' ? 'Cash' : 'E-Transfer'}
                    </Text>
                  </View>
                )}
                <Text style={styles.tipText}>
                  Tip: ${Number(item.tipamount || 0).toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.updateButton}
                onPress={() => handlePaymentLog(item)}
              >
                <Text style={styles.updateButtonText}>
                  {item.paid ? 'Update Payment' : 'Log Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            { flexGrow: 1 }
          ]}
        />

        {renderCustomDatePicker()}
        <PaymentModal
          isVisible={isPaymentModalVisible}
          onClose={() => setIsPaymentModalVisible(false)}
          onSubmit={handlePaymentSubmit}
          initialPaymentData={{
            price: selectedAppointment?.price || 0,
            tipAmount: selectedAppointment?.tipamount || 0,
            paymentMethod: selectedAppointment?.paymentmethod || 'cash',
            paid: selectedAppointment?.paid || false,
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    paddingTop: Platform.OS === 'ios' ? 47 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    paddingBottom: 0,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#007AFF',
  },
  appointmentCard: {
    backgroundColor: '#2c2c2e',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  nameText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceText: {
    color: '#8E8E93',
    fontSize: 15,
    marginBottom: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethod: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paymentMethodText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tipText: {
    color: '#8E8E93',
    fontSize: 15,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  calendarIcon: {
    marginLeft: 6,
    size: 20,
  },
});

export default DailyAppointments;