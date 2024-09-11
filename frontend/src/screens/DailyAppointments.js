import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { getAppointmentsByDay, updateAppointmentPayment, getClientById } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import Footer from '../components/Footer';
import { Ionicons } from '@expo/vector-icons';

const DailyAppointments = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'paid', 'unpaid', or 'pending'

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
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <View style={styles.dateNavigation}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}>
              <Ionicons name="chevron-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            </View>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}>
              <Ionicons name="chevron-forward" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'paid' && styles.activeTab]}
            onPress={() => setActiveTab('paid')}
          >
            <Text style={[styles.tabText, activeTab === 'paid' && styles.activeTabText]}>Paid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'unpaid' && styles.activeTab]}
            onPress={() => setActiveTab('unpaid')}
          >
            <Text style={[styles.tabText, activeTab === 'unpaid' && styles.activeTabText]}>Unpaid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredAppointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyListText}>No appointments for this category</Text>}
        />
        <PaymentModal
          isVisible={isPaymentModalVisible}
          onClose={() => setIsPaymentModalVisible(false)}
          onSubmit={handlePaymentSubmit}
          initialPaymentData={{
            price: selectedAppointment?.price || 0,
            tipAmount: 0,
            paymentMethod: 'cash',
            paid: false,
          }}
          appointmentPrice={selectedAppointment?.price}
        />
      </View>
      <Footer navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  content: {
    flex: 1,
    paddingBottom: 16, // Add some padding at the bottom to prevent content from being hidden behind the footer
  },
  headerContainer: {
    paddingTop: 45,
    paddingBottom: 10,
    backgroundColor: '#1c1c1e',
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  arrowButton: {
    padding: 10,
  },
  dateContainer: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  dateText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2c2c2e',
    paddingTop: 10,
    paddingBottom: 5,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  appointmentItem: {
    backgroundColor: '#2c2c2e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentTime: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appointmentStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentClient: {
    color: '#fff',
    fontSize: 18,
    flex: 1,
    marginRight: 8,
  },
  appointmentType: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'right',
  },
  logPaymentButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  logPaymentButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptyListText: {
    color: '#8e8e93',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  paymentInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  paymentMethodContainer: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paymentMethodText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipLabel: {
    color: '#8e8e93',
    marginRight: 4,
  },
  tipAmount: {
    color: '#4CD964',
    fontWeight: 'bold',
  },
});

export default DailyAppointments;