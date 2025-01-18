import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Dimensions, 
  Modal, 
  Alert, 
  TextInput, 
  Switch, 
  Keyboard, 
  FlatList,
  Button, 
  StatusBar, 
  Linking,
  ActivityIndicator // Add this import
} from 'react-native';
import { getClientById, getAppointmentsByClientId, getMessagesByClientId, setMessagesRead, getClientAppointmentsAroundCurrent, getNotesByClientId, createNote, updateAppointmentPayment, getAppointmentsByDay, getClientMedia, uploadClientMedia, deleteClientMedia, updateAppointmentDetails } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import avatarImage from '../../assets/avatar.png';
import twilioAvatar from '../../assets/icon.png';
import defaultAvatar from '../../assets/avatar.png';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ImageGallery from './ImageGallery';
import * as ImagePicker from 'expo-image-picker';
import PaymentModal, { PaymentData } from './PaymentModal';
import CameraComponent from './CameraComponent';
import { Video } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';

// Define your types
type RootStackParamList = {
  ClientMessages: { clientid: string; clientName: string };
};

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
  clientPhoneNumber?: string;
  addons?: string[];
}

interface ClientCardViewProps {
  appointment: Appointment;
  onDelete: () => void;
  allAppointments: Appointment[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

const ClientCardView: React.FC<ClientCardViewProps> = ({ 
  appointment, 
  onDelete, 
  allAppointments, 
  currentIndex, 
  setCurrentIndex 
}) => {
  console.log('ClientCardView rendered with appointment:', appointment);
  console.log('Current index:', currentIndex);
  console.log('All appointments:', allAppointments);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddNoteModalVisible, setIsAddNoteModalVisible] = useState<boolean>(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState<boolean>(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    paid: false,
    paymentMethod: 'cash',
    price: '0',
    tipAmount: '',
    totalAmount: '0',
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedAppointment, setEditedAppointment] = useState(appointment);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());
  const [startTimePickerDate, setStartTimePickerDate] = useState(new Date());
  const [endTimePickerDate, setEndTimePickerDate] = useState(new Date());

  // Extract clientId from the appointment object
  const currentClientId = appointment?.clientid;

  useEffect(() => {
    if (appointment) {
      setIsLoading(false);
      setPaymentData({
        paid: appointment.paid || false,
        paymentMethod: appointment.paymentmethod || 'cash',
        price: appointment.price ? appointment.price.toString() : '0',
        tipAmount: appointment.tipamount ? appointment.tipamount.toString() : '',
        totalAmount: ((appointment.price || 0) + (appointment.tipamount || 0)).toString(),
      });
    } else {
      setIsLoading(true);
    }
  }, [appointment]);

  useEffect(() => {
    console.log('ClientCardView useEffect triggered');
    if (appointment && appointment.clientid) {
      console.log('Fetching data for clientId:', appointment.clientid);
      fetchClientAppointments();
      fetchNotes();
      fetchMessages();
      fetchClientMedia();
    } else {
      console.log('No appointment or clientId available');
    }
  }, [appointment]);

  const fetchClientAppointments = async () => {
    try {
      const fetchedAppointments = await getClientAppointmentsAroundCurrent(appointment.clientid, appointment.id);
      console.log('Fetched client appointments:', fetchedAppointments);
      setClientAppointments(fetchedAppointments);
    } catch (error) {
      console.error('Error fetching client appointments:', error);
      setClientAppointments([]);
    }
  };

  const fetchNotes = async () => {
    try {
      const fetchedNotes = await getNotesByClientId(appointment.clientid);
      console.log('Fetched notes:', fetchedNotes);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    }
  };

  const fetchMessages = async () => {
    try {
      const fetchedMessages = await getMessagesByClientId(appointment.clientid);
      console.log('Fetched messages:', fetchedMessages);
      const sortedMessages = fetchedMessages.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const fetchClientMedia = async () => {
    try {
      const media = await getClientMedia(appointment.clientid);
      console.log('Fetched client media:', media);
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

  const handleAddMediaPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant permission to access your media library.');
      return;
    }

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
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status === 'granted') {
              setShowCamera(true);
            } else {
              Alert.alert('Permission required', 'Please grant permission to use the camera.');
            }
          }
        },
        {
          text: "Record Video",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status === 'granted') {
              launchVideoRecorder();
            } else {
              Alert.alert('Permission required', 'Please grant permission to use the camera.');
            }
          }
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

  const handlePreviousAppointment = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextAppointment = () => {
    if (currentIndex < allAppointments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleMessagePress = () => {
    navigation.navigate('ClientMessages', { 
      clientid: appointment.clientid, 
      clientName: appointment.clientName,
      suggestedResponse: null,
      clientMessage: null
    });
  };

  const handleCallPress = async () => {
    try {
      const clientDetails = await getClientById(appointment.clientid);
      const phoneNumber = clientDetails?.phonenumber;
      console.log('phoneNumber:', phoneNumber);
      if (phoneNumber) {
        Linking.openURL(`tel:${phoneNumber}`);
      } else {
        Alert.alert('Error', 'No phone number available for this client.');
      }
    } catch (error) {
      console.error('Error fetching client phone number:', error);
      Alert.alert('Error', 'Failed to retrieve client phone number.');
    }
  };

  const handleEditPress = () => {
    setIsEditMode(true);
    setEditedAppointment(appointment);
  };

  const handleSaveEdit = async () => {
    try {
      const updatedAppointmentData = {
        date: editedAppointment.date,
        startTime: editedAppointment.startTime,
        endTime: editedAppointment.endTime,
        appointmentType: editedAppointment.appointmenttype,
        price: parseFloat(editedAppointment.price.toString()),
        addons: editedAppointment.addons,
      };
      const updatedAppointment = await updateAppointmentDetails(
        appointment.id,
        updatedAppointmentData
      );

      // Update the appointment in the parent component
      allAppointments[currentIndex] = {
        ...allAppointments[currentIndex],
        ...updatedAppointment,
      };
      setIsEditMode(false);

      // Update the local appointment state
      setEditedAppointment(updatedAppointment);

      Alert.alert('Success', 'Appointment updated successfully');
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Error', 'Failed to update appointment. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedAppointment(appointment);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedAppointment(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleInputChange('date', formattedDate);
      setDatePickerDate(selectedDate);
    }
  };

  const handleStartTimeChange = (event: any, selectedTime: Date | undefined) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const formattedTime = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      handleInputChange('startTime', formattedTime);
      setStartTimePickerDate(selectedTime);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime: Date | undefined) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const formattedTime = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      handleInputChange('endTime', formattedTime);
      setEndTimePickerDate(selectedTime);
    }
  };

  console.log('ClientCardView rendered. showGallery:', showGallery);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No appointment selected. Please select an appointment from the list view.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.cardView}>
      {console.log('Rendering ClientCardView content')}
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
        {!appointment.paid && appointment.paymentmethod === 'e-transfer' && (
          <View style={styles.paymentInfoContainer}>
            <View style={styles.pendingPaymentContainer}>
              <Ionicons name="time-outline" size={24} color="#FFA500" />
              <Text style={styles.pendingPaymentText}>Pending Payment</Text>
            </View>
          </View>
        )}

        <View style={styles.topSection}>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={handleCallPress}>
              <Ionicons name="call" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleMessagePress}>
              <Ionicons name="chatbubble" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleEditPress}>
              <Ionicons name="create" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {clientMedia.length > 0 ? (
                <TouchableOpacity onPress={() => handleMediaPress(0)}>
                  {clientMedia[0].media_type === 'image' ? (
                    <Image source={{ uri: clientMedia[0].media_url }} style={styles.clientMedia} />
                  ) : (
                    <View style={styles.clientMedia}>
                      <Ionicons name="videocam" size={50} color="#007AFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <Image source={avatarImage} style={styles.clientMedia} />
              )}
              <TouchableOpacity style={styles.addMediaButton} onPress={handleAddMediaPress}>
                <Text style={styles.addMediaButtonText}>Add Media</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardClientName}>{appointment.clientName || 'No Name'}</Text>
          </View>
        </View>

        {isEditMode ? (
          <>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.editableText}>{editedAppointment.date}</Text>
            </TouchableOpacity>
            <View style={styles.timeContainer}>
              <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
                <Text style={styles.editableText}>{editedAppointment.startTime}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>-</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.editableText}>{editedAppointment.endTime}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editableText}
              value={editedAppointment.appointmenttype}
              onChangeText={(value) => handleInputChange('appointmenttype', value)}
              placeholder="Service Type"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.editableText}
              value={editedAppointment.addons?.join(', ') || ''}
              onChangeText={(value) => handleInputChange('addons', value.split(',').map(addon => addon.trim()))}
              placeholder="Add-ons (comma separated)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.editableText}
              value={editedAppointment.price.toString()}
              onChangeText={(value) => handleInputChange('price', value)}
              keyboardType="numeric"
              placeholder="Price"
              placeholderTextColor="#666"
            />
          </>
        ) : (
          <>
            <Text style={styles.cardTime}>{appointment.startTime} - {appointment.endTime}</Text>
            <Text style={styles.cardType}>
              {appointment.appointmenttype}
              {appointment.addons && appointment.addons.length > 0 && (
                appointment.addons.map(addon => ` + ${addon.trim()}`).join('')
              )}
            </Text>
            <Text style={styles.cardPrice}>${appointment.price}</Text>
          </>
        )}
        
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
                <Text style={styles.appType}>
                  {app.appointmenttype}
                  {app.addons && app.addons.length > 0 && (
                    app.addons.map(addon => ` + ${addon.trim()}`).join('')
                  )}
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
    

      {showDatePicker && (
        <DateTimePicker
          value={datePickerDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showStartTimePicker && (
        <DateTimePicker
          value={startTimePickerDate}
          mode="time"
          display="default"
          onChange={handleStartTimeChange}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          value={endTimePickerDate}
          mode="time"
          display="default"
          onChange={handleEndTimeChange}
        />
      )}
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
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
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
    fontSize: 16,
    color: '#fff',
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
    width: 100,
    height: 100,
    borderRadius: 50,
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
  mediaContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  clientMedia: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 8,
    borderRadius: 20,
  },
  galleryButtonText: {
    color: '#007AFF',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  iconButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 10,
  },
  navButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  appointmentCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentCounter: {
    fontSize: 16,
    color: '#fff',
  },
  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
    marginTop: 40,
  },
  avatarAndMediaContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 10,
  },
  clientDetailsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  actionButtonsContainer: {
    position: 'absolute',
    left: 0,
    top: -45,
    flexDirection: 'row',
    gap: 15,
    zIndex: 1,
  },
  editableText: {
    backgroundColor: '#3a3a3c',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeSeparator: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  editContainer: {
    width: '100%',
    marginBottom: 20,
  },
  editInput: {
    backgroundColor: '#3a3a3c',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    width: '48%',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addMediaButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    alignSelf: 'center',
  },
  addMediaButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
    position: 'relative',
  },
  profileSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 60,
  },
  serviceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginVertical: 5,
  },
  cardAddons: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '300',
  },
  appServiceContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
});

export default ClientCardView;