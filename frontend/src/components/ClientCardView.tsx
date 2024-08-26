import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Modal, Alert, TextInput, Switch, Keyboard, FlatList, Button, StatusBar } from 'react-native';
import { getClientById, getAppointmentsByClientId, getMessagesByClientId, setMessagesRead, getClientAppointmentsAroundCurrent, getNotesByClientId, createNote, updateAppointmentPayment, getAppointmentsByDay, getClientMedia, uploadClientMedia, deleteClientMedia } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import avatarImage from '../../assets/avatar.png';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { useNavigation } from '@react-navigation/native';
import ImageGallery from './ImageGallery';
import * as ImagePicker from 'expo-image-picker';
import PaymentModal, { PaymentData } from './PaymentModal';
import CameraComponent from './CameraComponent';
import { Video } from 'expo-av';

interface Appointment {
  id: string;
  clientid: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  appointmenttype: string;
  price: number;
  paid: boolean;
  paymentmethod?: string;
  tipamount?: number;
}

interface ClientCardViewProps {
  appointment: Appointment;
}

const ClientCardView: React.FC<ClientCardViewProps> = ({ appointment }) => {
  const navigation = useNavigation();
  const [isAddNoteModalVisible, setIsAddNoteModalVisible] = useState<boolean>(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState<boolean>(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    paid: false,
    paymentMethod: 'cash',
    price: appointment.price.toString(),
    tipAmount: appointment.tipamount ? appointment.tipamount.toString() : '',
    totalAmount: (appointment.price + (appointment.tipamount || 0)).toString(),
  });
  const [newNote, setNewNote] = useState<string>('');
  const [showAllNotes, setShowAllNotes] = useState<boolean>(false);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [clientMedia, setClientMedia] = useState<any[]>([]);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [showCamera, setShowCamera] = useState<boolean>(false);

  // Extract clientId from the appointment object
  const currentClientId = appointment.clientid;

  useEffect(() => {
    if (currentClientId) {
      fetchClientAppointments();
      fetchNotes();
      fetchMessages();
      fetchClientMedia();
    } else {
      console.log('No currentClientId available in the appointment object');
    }
  }, [currentClientId]);

  const fetchClientAppointments = async () => {
    try {
      const fetchedAppointments = await getClientAppointmentsAroundCurrent(currentClientId, appointment.id);
      setClientAppointments(fetchedAppointments);
    } catch (error) {
      console.error('Error fetching client appointments:', error);
      setClientAppointments([]);
    }
  };

  const fetchNotes = async () => {
    try {
      const fetchedNotes = await getNotesByClientId(currentClientId);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    }
  };

  const fetchMessages = async () => {
    try {
      const fetchedMessages = await getMessagesByClientId(currentClientId);
      // Sort messages by date, oldest first
      const sortedMessages = fetchedMessages.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const fetchClientMedia = async () => {
    try {
      const media = await getClientMedia(currentClientId);
      setClientMedia(media);
    } catch (error) {
      console.error('Error fetching client media:', error);
    }
  };

  const handlePaymentPress = () => {
    setPaymentData({
      paid: appointment.paid || false,
      paymentMethod: appointment.paymentmethod || 'cash',
      price: appointment.price.toString(),
      tipAmount: appointment.tipamount ? appointment.tipamount.toString() : '',
      totalAmount: (appointment.price + (appointment.tipamount || 0)).toString(),
    });
    setIsPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async (newPaymentData: PaymentData) => {
    if (appointment) {
      try {
        const updatedAppointment = await updateAppointmentPayment(
          appointment.id,
          newPaymentData.paid,
          parseFloat(newPaymentData.tipAmount) || 0,
          newPaymentData.paymentMethod,
          parseFloat(newPaymentData.price)
        );
        // Update the local appointment state with the new data
        Object.assign(appointment, {
          paid: updatedAppointment.paid,
          paymentmethod: updatedAppointment.paymentmethod,
          tipamount: updatedAppointment.tipamount,
          price: updatedAppointment.price,
        });
        setIsPaymentModalVisible(false);
        // Trigger a re-render
        setPaymentData(newPaymentData);
      } catch (error) {
        console.error('Error updating payment:', error);
        Alert.alert('Error', 'Failed to update payment. Please try again.');
      }
    }
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

  const formatAppointmentDate = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatNoteDate = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatTimestamp = (dateString: string) => {
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
      // You might want to update some state here with the fetched appointments
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const navigateToFullMessageHistory = (clientId: string, clientName: string) => {
    navigation.navigate('ClientMessages', { 
      clientid: clientId, 
      clientName: clientName,
      suggestedResponse: null,
      clientMessage: null
    });
  };

  const handleAddMediaPress = () => {
    Alert.alert(
      "Add Media",
      "Choose an option",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Take Photo",
          onPress: () => setShowCamera(true)
        },
        {
          text: "Record Video",
          onPress: () => launchVideoRecorder()
        },
        {
          text: "Choose from Gallery",
          onPress: launchMediaLibrary
        }
      ]
    );
  };

  const launchVideoRecorder = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      uploadMedia([result.assets[0].uri]);
    }
  };

  const launchMediaLibrary = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uris = result.assets.map((asset: any) => asset.uri);
      uploadMedia(uris);
    }
  };

  const uploadMedia = async (uris: string[]) => {
    try {
      const result = await uploadClientMedia(currentClientId, uris);
      if (result.media) {
        setClientMedia(prevMedia => [...result.media, ...prevMedia]);
      }
      Alert.alert('Success', 'Media uploaded successfully');
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Error', 'Failed to upload media');
    }
  };

  const handleMediaPress = useCallback((index: number) => {
    console.log('Media pressed, index:', index);
    setSelectedMediaIndex(index);
    setShowGallery(true);
  }, []);

  const handleCloseGallery = useCallback(() => {
    console.log('handleCloseGallery called');
    setShowGallery(false);
  }, []);

  const handleMediaDeleted = useCallback(async (deletedMediaId: string) => {
    // Remove the deleted media from the local state
    setClientMedia(prevMedia => prevMedia.filter(media => media.id !== deletedMediaId));
    
    // Fetch the updated list of media
    await fetchClientMedia();
  }, []);

  const handleCameraCapture = (uri: string) => {
    uploadMedia([uri]);
  };

  console.log('ClientCardView rendered. showGallery:', showGallery);

  return (
    <ScrollView style={styles.cardView}>
      <View style={styles.cardContainer}>
        {/* Payment Status and Tip Amount */}
        {appointment.paid ? (
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
        ) : appointment.paymentmethod === 'e-transfer' ? (
          <View style={styles.paymentInfoContainer}>
            <View style={styles.pendingPaymentContainer}>
              <Ionicons name="time-outline" size={24} color="#FFA500" />
              <Text style={styles.pendingPaymentText}>Pending Payment</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.addPhotoButton}
            onPress={handleAddMediaPress}
          >
            <Text style={styles.addPhotoButtonText}>Add Media</Text>
          </TouchableOpacity>
        </View>
        
        {clientMedia.length > 0 ? (
          <TouchableOpacity onPress={() => handleMediaPress(0)}>
            {clientMedia[0].media_type === 'image' ? (
              <Image 
                source={{ uri: clientMedia[0].media_url }} 
                style={styles.clientMedia} 
              />
            ) : (
              <Video
                source={{ uri: clientMedia[0].media_url }}
                style={styles.clientMedia}
                useNativeControls
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        ) : (
          <Image source={avatarImage} style={styles.clientMedia} />
        )}
        
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
      <ImageGallery 
        media={clientMedia}
        visible={showGallery}
        onClose={handleCloseGallery}
        initialIndex={selectedMediaIndex}
        onMediaDeleted={handleMediaDeleted}
        clientId={currentClientId}
      />
      {renderAddNoteModal()}
      <PaymentModal
        isVisible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onSubmit={handlePaymentSubmit}
        initialPaymentData={paymentData}
        appointmentPrice={appointment.price}
      />
      <CameraComponent
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
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
    alignSelf: 'center',
    marginBottom: 10,
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
  pendingPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    padding: 5,
    borderRadius: 15,
    marginBottom: 5,
  },
  pendingPaymentText: {
    color: '#FFA500',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
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
  radioButtonTouchable: {
    padding: 8,
  },
  radioButton: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 8,
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
  uploadImagesText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 10,
    paddingLeft: 10,
  },
  addPhotoButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
  },
  addPhotoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clientMedia: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 10,
  },
  captureButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 30,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  cameraButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
  },
});

export default ClientCardView;