import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Modal, Alert, TextInput, Switch, Keyboard } from 'react-native';
import { getClientById, getAppointmentsByClientId, getMessagesByClientId, setMessagesRead, getClientAppointmentsAroundCurrent, getNotesByClientId, createNote, updateAppointmentPayment, getAppointmentsByDay } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import avatarImage from '../../assets/avatar.png';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { useNavigation } from '@react-navigation/native';

const ClientCardView = ({ appointment }) => {
  const navigation = useNavigation();
  const [isAddNoteModalVisible, setIsAddNoteModalVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paid: false,
    paymentMethod: 'cash',
    tipAmount: '',
  });
  const [newNote, setNewNote] = useState('');
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [clientAppointments, setClientAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState([]);

  // Extract clientId from the appointment object
  const currentClientId = appointment.clientid;

  useEffect(() => {
    if (currentClientId) {
      console.log('Fetching data for client ID:', currentClientId);
      fetchClientAppointments();
      fetchNotes();
      fetchMessages();
    } else {
      console.log('No currentClientId available in the appointment object');
    }
  }, [currentClientId]);

  const fetchClientAppointments = async () => {
    console.log('Fetching client appointments...');
    try {
      const fetchedAppointments = await getClientAppointmentsAroundCurrent(currentClientId, appointment.id);
      console.log('Fetched appointments:', fetchedAppointments);
      setClientAppointments(fetchedAppointments);
    } catch (error) {
      console.error('Error fetching client appointments:', error);
      setClientAppointments([]);
    }
  };

  const fetchNotes = async () => {
    console.log('Fetching notes...');
    try {
      const fetchedNotes = await getNotesByClientId(currentClientId);
      console.log('Fetched notes:', fetchedNotes);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    }
  };

  const fetchMessages = async () => {
    console.log('Fetching messages...');
    try {
      const fetchedMessages = await getMessagesByClientId(currentClientId);
      console.log('Fetched messages:', fetchedMessages);
      // Sort messages by date, oldest first
      const sortedMessages = fetchedMessages.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const handlePaymentPress = () => {
    setPaymentData({
      paid: appointment.paid || false,
      paymentMethod: appointment.paymentmethod || 'cash',
      tipAmount: appointment.tipamount ? appointment.tipamount.toString() : '',
    });
    setIsPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async () => {
    if (appointment) {
      try {
        const updatedAppointment = await updateAppointmentPayment(
          appointment.id,
          paymentData.paid,
          paymentData.tipAmount ? parseFloat(paymentData.tipAmount) : 0,
          paymentData.paymentMethod
        );
        // Update the local appointment state with the new data
        Object.assign(appointment, {
          paid: updatedAppointment.paid,
          paymentmethod: updatedAppointment.paymentmethod,
          tipamount: updatedAppointment.tipamount,
        });
        setIsPaymentModalVisible(false);
        // Trigger a re-render
        setPaymentData({ ...paymentData });
      } catch (error) {
        console.error('Error updating payment:', error);
        Alert.alert('Error', 'Failed to update payment. Please try again.');
      }
    }
  };

  const renderPaymentModal = () => {
    const [displayTip, setDisplayTip] = useState(paymentData.tipAmount || '');

    useEffect(() => {
      setDisplayTip(paymentData.tipAmount || '');
    }, [paymentData.tipAmount]);

    const handleTipChange = (value) => {
      // Remove any non-numeric characters except for the decimal point
      const numericValue = value.replace(/[^0-9.]/g, '');
      
      // Ensure only one decimal point
      const parts = numericValue.split('.');
      const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
      
      setDisplayTip(formattedValue);
      setPaymentData({ ...paymentData, tipAmount: formattedValue });
    };

    return (
      <Modal
        transparent={true}
        visible={isPaymentModalVisible}
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <Text style={styles.paymentModalTitle}>Log Payment</Text>
            
            <View style={styles.paymentOption}>
              <Text style={styles.paymentOptionLabel}>Paid:</Text>
              <Switch
                value={paymentData.paid}
                onValueChange={(value) => setPaymentData({ ...paymentData, paid: value })}
              />
            </View>

            {paymentData.paid && (
              <>
                <Text style={styles.paymentOptionLabel}>Payment Method:</Text>
                <View style={styles.paymentMethodOptions}>
                  {['cash', 'e-transfer'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={styles.paymentMethodOption}
                      onPress={() => setPaymentData({ ...paymentData, paymentMethod: method })}
                    >
                      <View style={styles.radioButton}>
                        {paymentData.paymentMethod === method && <View style={styles.radioButtonInner} />}
                      </View>
                      <Text style={styles.paymentMethodText}>{method === 'cash' ? 'Cash' : 'E-Transfer'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.paymentOption}>
                  <Text style={styles.paymentOptionLabel}>Tip Amount:</Text>
                  <View style={styles.tipInputContainer}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.tipInput}
                      value={displayTip}
                      onChangeText={handleTipChange}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.paymentModalButtons}>
              <TouchableOpacity 
                style={[styles.paymentModalButton, styles.cancelButton]} 
                onPress={() => setIsPaymentModalVisible(false)}
              >
                <Text style={styles.paymentModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.paymentModalButton, styles.submitButton]} 
                onPress={handlePaymentSubmit}
              >
                <Text style={styles.paymentModalButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const addNote = async () => {
    try {
      const data = await createNote(currentClientId, newNote);
      setNotes(prevNotes => [data, ...prevNotes]);
      setNewNote('');
      setIsAddNoteModalVisible(false);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const renderAddNoteModal = () => (
    <Modal
      transparent={true}
      visible={isAddNoteModalVisible}
      onRequestClose={() => setIsAddNoteModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.addNoteModalContent}>
          <Text style={styles.addNoteModalTitle}>Add New Note</Text>
          <TextInput
            style={styles.addNoteModalInput}
            value={newNote}
            onChangeText={setNewNote}
            placeholder="Enter your note here..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
          <View style={styles.addNoteModalButtons}>
            <TouchableOpacity 
              style={[styles.addNoteModalButton, styles.cancelButton]} 
              onPress={() => setIsAddNoteModalVisible(false)}
            >
              <Text style={styles.addNoteModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addNoteModalButton, styles.submitButton]} 
              onPress={addNote}
            >
              <Text style={styles.addNoteModalButtonText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const formatAppointmentDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatNoteDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatTimestamp = (dateString) => {
    const [datePart, timePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [time, period] = timePart.split(' ');
    const [hours, minutes] = time.split(':');

    let adjustedHours = parseInt(hours, 10) - 4;
    let adjustedPeriod = period;

    if (adjustedHours < 0) {
      adjustedHours += 12;
      adjustedPeriod = period === 'AM' ? 'PM' : 'AM';
    } else if (adjustedHours === 0) {
      adjustedHours = 12;
    } else if (adjustedHours > 12) {
      adjustedHours -= 12;
      adjustedPeriod = 'PM';
    }

    return `${adjustedHours}:${minutes} ${adjustedPeriod}`;
  };

  const fetchAppointments = async () => {
    if (!appointment || !appointment.date) {
      console.error('No appointment or date available');
      return;
    }

    try {
      const estDate = new Date(appointment.date);
      estDate.setHours(estDate.getHours() - 4); // Convert to EST
      const year = estDate.getFullYear();
      const month = String(estDate.getMonth() + 1).padStart(2, '0');
      const day = String(estDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const response = await getAppointmentsByDay(formattedDate);
      // Process the fetched appointments as needed
      console.log('Fetched appointments:', response);
      // You might want to update some state here with the fetched appointments
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const navigateToFullMessageHistory = (clientId, clientName) => {
    navigation.navigate('ClientMessages', { 
      clientid: clientId, 
      clientName: clientName,
      suggestedResponse: null,
      clientMessage: null
    });
  };

  return (
    <ScrollView style={styles.cardView}>
      <View style={styles.cardContainer}>
        {/* Payment Status and Tip Amount */}
        {appointment.paid && (
          <View style={styles.paymentInfoContainer}>
            <View style={styles.paymentMethodContainer}>
              <Text style={styles.paymentMethodText}>
                {appointment.paymentmethod === 'cash' ? 'Cash' : 'E-Transfer'}
              </Text>
            </View>
            <View style={styles.paidStatusContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.paidStatusText}>Paid</Text>
            </View>
            {appointment.tipamount != null && (
              <View style={styles.tipContainer}>
                <Text style={styles.tipLabel}>Tip:</Text>
                <Text style={styles.tipAmount}>${Number(appointment.tipamount).toFixed(2)}</Text>
              </View>
            )}
          </View>
        )}

        <Image 
          source={appointment.avatar ? { uri: appointment.avatar } : avatarImage} 
          style={styles.clientImage} 
        />
        <Text style={styles.cardClientName}>{appointment.clientName || 'No Name'}</Text>
        
        <Text style={styles.cardDate}>{formatAppointmentDate(appointment.date)}</Text>
        <Text style={styles.cardTime}>{appointment.startTime || 'No Start'} - {appointment.endTime || 'No End'}</Text>
        <Text 
          style={styles.cardType} 
          numberOfLines={1} 
          ellipsizeMode="tail"
        >
          {appointment.appointmenttype || 'No Type'}
        </Text>
        <Text style={styles.cardPrice}>${appointment.price}</Text>
        
        {/* Payment Button */}
        <TouchableOpacity 
          style={styles.paymentButton} 
          onPress={handlePaymentPress}
        >
          <Text style={styles.paymentButtonText}>
            {appointment.paid ? 'Update Payment' : 'Log Payment'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Notes</Text>
          {notes.length > 0 ? (
            <View style={styles.noteItem}>
              <Text style={styles.noteContent}>{notes[0].content}</Text>
              <Text style={styles.noteDate}>{formatNoteDate(notes[0].createdat)}</Text>
            </View>
          ) : (
            <Text style={styles.noNotesText}>No notes available</Text>
          )}
          <TouchableOpacity 
            style={styles.addNoteButton} 
            onPress={() => setIsAddNoteModalVisible(true)}
          >
            <Text style={styles.addNoteButtonText}>Add Note</Text>
          </TouchableOpacity>
          {notes.length > 1 && (
            <TouchableOpacity onPress={() => setShowAllNotes(!showAllNotes)}>
              <Text style={styles.seeMoreText}>{showAllNotes ? 'See Less' : 'See More'}</Text>
            </TouchableOpacity>
          )}
          {showAllNotes && notes.slice(1).map((note, index) => (
            <View key={index} style={styles.noteItem}>
              <Text style={styles.noteContent}>{note.content}</Text>
              <Text style={styles.noteDate}>{formatNoteDate(note.createdat)}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.clientAppointmentsContainer}>
          <Text style={styles.clientAppointmentsTitle}>Appointments</Text>
          {clientAppointments.length > 0 ? (
            clientAppointments.map((app, index) => (
              <View key={index} style={[
                styles.clientAppointmentItem,
                app.id === appointment.id ? styles.currentAppointment : null
              ]}>
                <Text style={styles.appDate}>{formatAppointmentDate(app.date)}</Text>
                <Text 
                  style={styles.appType} 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                >
                  {app.appointmenttype || 'No Type'}
                </Text>
                <Text style={styles.appPrice}>${app.price}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noAppointmentsText}>No appointments available</Text>
          )}
        </View>
        
        <View style={styles.messageHistoryContainer}>
          <Text style={styles.messageHistoryTitle}>Message History</Text>
          {messages.length > 0 ? (
            <View style={styles.messagesContainer}>
              {messages.slice(-5).map((message, index) => {
                const isAssistant = message.fromtext === '+18446480598';
                const avatar = isAssistant ? twilioAvatar : defaultAvatar;
                const senderName = isAssistant ? 'Assistant' : appointment.clientName;

                return (
                  <View 
                    key={index}
                    style={[styles.messageContainer, isAssistant ? styles.assistantMessage : styles.clientMessage]}
                  >
                    {!isAssistant && <Image source={avatar} style={styles.avatar} />}
                    <View style={styles.messageContent}>
                      <Text style={styles.messageSender}>{senderName}</Text>
                      <View style={[styles.messageBubble, isAssistant ? styles.assistantBubble : styles.clientBubble]}>
                        <Text style={[styles.messageText, isAssistant ? styles.assistantText : styles.clientText]}>
                          {message.body}
                        </Text>
                        <Text style={styles.timestamp}>{formatTimestamp(message.date)}</Text>
                      </View>
                    </View>
                    {isAssistant && <Image source={avatar} style={styles.avatar} />}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noMessagesText}>No messaging history</Text>
          )}
          <TouchableOpacity 
            style={styles.fullHistoryButton}
            onPress={() => navigateToFullMessageHistory(currentClientId, appointment.clientName)}
          >
            <Text style={styles.fullHistoryButtonText}>See Full Message History</Text>
          </TouchableOpacity>
        </View>
      </View>
      {renderAddNoteModal()}
      {renderPaymentModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cardView: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  cardContainer: {
    backgroundColor: '#2c2c2e',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  clientImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 15,
  },
  cardClientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 5,
  },
  cardTime: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 5,
  },
  cardType: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 5,
    maxWidth: '100%',
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  paymentButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    width: '100%',
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  noteItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#3a3a3c',
    borderRadius: 5,
  },
  noteContent: {
    color: '#fff',
    fontSize: 14,
  },
  noteDate: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 5,
  },
  addNoteButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  seeMoreText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 10,
  },
  clientAppointmentsContainer: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 10,
  },
  clientAppointmentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  clientAppointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    width: '100%',
  },
  currentAppointment: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 5,
  },
  appDate: {
    color: '#aaa',
    fontSize: 14,
    width: '30%',
  },
  appType: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
    marginHorizontal: 5,
  },
  appPrice: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'right',
  },
  messageHistoryContainer: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 10,
  },
  messageHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  messagesContainer: {
    width: '100%',
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  assistantMessage: {
    justifyContent: 'flex-end',
  },
  clientMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageContent: {
    maxWidth: '70%',
  },
  messageSender: {
    color: '#9da6b8',
    fontSize: 12,
    marginBottom: 2,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 8,
  },
  assistantBubble: {
    backgroundColor: '#195de6',
  },
  clientBubble: {
    backgroundColor: '#292e38',
  },
  messageText: {
    color: 'white',
    fontSize: 14,
  },
  assistantText: {
    color: 'white',
  },
  clientText: {
    color: 'white',
  },
  timestamp: {
    fontSize: 10,
    color: '#9da6b8',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  noMessagesText: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
  },
  fullHistoryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  fullHistoryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentInfoContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  paymentMethodContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 5,
    borderRadius: 15,
    marginBottom: 5,
  },
  paymentMethodText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  paidStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 5,
    borderRadius: 15,
    marginBottom: 5,
  },
  paidStatusText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 5,
    borderRadius: 15,
  },
  tipLabel: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 5,
  },
  tipAmount: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContent: {
    backgroundColor: '#2c2c2e',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  paymentModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  paymentOptionLabel: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 12,
  },
  paymentMethodOptions: {
    marginBottom: 24,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioButton: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  radioButtonInner: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  paymentMethodText: {
    color: '#fff',
    fontSize: 18,
  },
  tipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  dollarSign: {
    color: '#fff',
    fontSize: 18,
    marginRight: 4,
  },
  tipInput: {
    borderWidth: 1,
    borderColor: '#444',
    padding: 8,
    borderRadius: 8,
    color: '#fff',
    backgroundColor: '#3a3a3c',
    fontSize: 18,
    width: '70%',
    textAlign: 'right',
  },
  paymentModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  paymentModalButton: {
    padding: 16,
    borderRadius: 8,
    width: '48%',
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  paymentModalButtonText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  addNoteModalContent: {
    backgroundColor: '#2c2c2e',
    padding: 20,
    borderRadius: 8,
    width: '90%',
  },
  addNoteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  addNoteModalInput: {
    borderWidth: 1,
    borderColor: '#444',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
    height: 80,
    textAlignVertical: 'top',
    color: '#fff',
  },
  addNoteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addNoteModalButton: {
    padding: 10,
    borderRadius: 4,
    width: '45%',
  },
  addNoteModalButtonText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  noNotesText: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
  },
  noAppointmentsText: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ClientCardView;