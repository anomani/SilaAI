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
import { getClientById, getAppointmentsByClientId, getMessagesByClientId, setMessagesRead, getClientAppointmentsAroundCurrent, getNotesByClientId, createNote, updateAppointmentPayment, getAppointmentsByDay, getClientMedia, uploadClientMedia, deleteClientMedia, updateAppointmentDetails, deleteAppointment, updateNote, deleteNote } from '../services/api';
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
  AddAppointment: { appointment: any };
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
  const [isEditNoteModalVisible, setIsEditNoteModalVisible] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [editedNoteContent, setEditedNoteContent] = useState<string>('');

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
        // Refresh parent component data
        onDelete(); // This is actually onUpdate, refreshes the appointments list
      } catch (error) {
        console.error('Error updating payment:', error);
        Alert.alert('Error', 'Failed to update payment. Please try again.');
      }
    }
  };

  const addNote = async () => {
    try {
      if (!newNote.trim()) {
        Alert.alert('Error', 'Note content cannot be empty');
        return;
      }

      const data = await createNote(currentClientId, newNote.trim());
      if (!data) {
        throw new Error('Failed to create note');
      }
      
      setNotes(prevNotes => [data, ...prevNotes]);
      setNewNote('');
      setIsAddNoteModalVisible(false);
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add note. Please try again.'
      );
    }
  };

  const renderAddNoteModal = () => (
    <Modal
      transparent={true}
      visible={isAddNoteModalVisible}
      onRequestClose={() => setIsAddNoteModalVisible(false)}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.noteModalContainer}>
          {/* Header */}
          <View style={styles.noteModalHeader}>
            <View style={styles.noteHeaderIcon}>
              <Ionicons name="create" size={20} color="#007AFF" />
            </View>
            <Text style={styles.noteModalTitle}>Add New Note</Text>
            <TouchableOpacity 
              style={styles.noteCloseButton} 
              onPress={() => setIsAddNoteModalVisible(false)}
            >
              <Ionicons name="close" size={18} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.noteModalContent}>
            <TextInput
              style={styles.noteInput}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Enter your note here..."
              placeholderTextColor="#48484a"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Actions */}
          <View style={styles.noteModalActions}>
            <TouchableOpacity 
              style={styles.noteCancelBtn} 
              onPress={() => setIsAddNoteModalVisible(false)}
            >
              <Text style={styles.noteCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.noteSubmitBtn} 
              onPress={addNote}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.noteSubmitText}>Add Note</Text>
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
    // Convert time to 24-hour format
    const formatTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      // Convert to 24-hour format
      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      return `${hour.toString().padStart(2, '0')}:${minutes}`;
    };

    navigation.navigate('AddAppointment', { 
      appointment: {
        id: appointment.id,
        clientId: appointment.clientid,
        clientName: appointment.clientName,
        date: appointment.date,
        startTime: formatTime(appointment.startTime),
        endTime: formatTime(appointment.endTime),
        appointmentTypeId: appointment.appointmenttype,
        appointmentType: appointment.appointmenttype,
        details: appointment.details || '',
        price: appointment.price,
        paid: appointment.paid,
        tipAmount: appointment.tipamount,
        paymentMethod: appointment.paymentmethod,
        addOnIds: appointment.addons || [],
        clientPhoneNumber: appointment.clientPhoneNumber,
        isEditing: true
      }
    });
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

  const handleDeletePress = async () => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAppointment(appointment.id);
            } catch (error) {
              console.error('Error deleting appointment:', error);
            }
            // Call onDelete to refresh regardless of success or failure
            onDelete();
          }
        }
      ]
    );
  };

  const handleClientNamePress = async () => {
    try {
      // Fetch full client details before navigation
      const clientDetails = await getClientById(appointment.clientid);
      navigation.navigate('ClientDetails', { 
        client: {
          id: appointment.clientid,
          firstname: appointment.clientName.split(' ')[0],
          lastname: appointment.clientName.split(' ')[1] || '',
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

  const handleEditNote = async () => {
    try {
      if (!selectedNote) return;
      
      const updatedNote = await updateNote(selectedNote.id, editedNoteContent);
      setNotes(prevNotes => prevNotes.map(note => 
        note.id === selectedNote.id ? updatedNote : note
      ));
      setIsEditNoteModalVisible(false);
      setSelectedNote(null);
      setEditedNoteContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Error', 'Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNote(noteId);
              setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          }
        }
      ]
    );
  };

  const renderEditNoteModal = () => (
    <Modal
      transparent={true}
      visible={isEditNoteModalVisible}
      onRequestClose={() => setIsEditNoteModalVisible(false)}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.noteModalContainer}>
          {/* Header */}
          <View style={styles.noteModalHeader}>
            <View style={styles.noteHeaderIcon}>
              <Ionicons name="create-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.noteModalTitle}>Edit Note</Text>
            <TouchableOpacity 
              style={styles.noteCloseButton} 
              onPress={() => {
                setIsEditNoteModalVisible(false);
                setSelectedNote(null);
                setEditedNoteContent('');
              }}
            >
              <Ionicons name="close" size={18} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.noteModalContent}>
            <TextInput
              style={styles.noteInput}
              value={editedNoteContent}
              onChangeText={setEditedNoteContent}
              placeholder="Edit your note..."
              placeholderTextColor="#48484a"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Actions */}
          <View style={styles.noteModalActions}>
            <TouchableOpacity 
              style={styles.noteCancelBtn} 
              onPress={() => {
                setIsEditNoteModalVisible(false);
                setSelectedNote(null);
                setEditedNoteContent('');
              }}
            >
              <Text style={styles.noteCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.noteSubmitBtn} 
              onPress={handleEditNote}
            >
              <Ionicons name="save" size={16} color="#ffffff" />
              <Text style={styles.noteSubmitText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
    <ScrollView style={styles.cardView} showsVerticalScrollIndicator={false}>
      {console.log('Rendering ClientCardView content')}
      
      {/* Main Card Container */}
      <View style={styles.cardContainer}>
        
        {/* Header with Action Buttons */}
        <View style={styles.headerSection}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCallPress}>
              <Ionicons name="call" size={18} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleMessagePress}>
              <Ionicons name="chatbubble" size={18} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleEditPress}>
              <Ionicons name="create" size={18} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]} 
              onPress={handleDeletePress}
            >
              <Ionicons name="trash" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          {/* Payment Status Badges */}
          {appointment.paid ? (
            <View style={styles.statusBadges}>
              <View style={styles.paidBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#30d158" />
                <Text style={styles.paidText}>Paid</Text>
              </View>
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>
                  {appointment.paymentmethod === 'cash' ? 'Cash' : 'E-Transfer'}
                </Text>
              </View>
              {appointment.tipamount != null && (
                <View style={styles.tipBadge}>
                  <Text style={styles.tipText}>Tip: ${Number(appointment.tipamount).toFixed(2)}</Text>
                </View>
              )}
            </View>
          ) : appointment.paymentmethod === 'e-transfer' && (
            <View style={styles.statusBadges}>
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={16} color="#ff9f0a" />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <View style={styles.avatarSection}>
            {clientMedia.length > 0 ? (
              <TouchableOpacity onPress={() => handleMediaPress(0)} style={styles.avatarWrapper}>
                {clientMedia[0].media_type === 'image' ? (
                  <Image source={{ uri: clientMedia[0].media_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.videoPlaceholder]}>
                    <Ionicons name="videocam" size={32} color="#007AFF" />
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarWrapper}>
                <Image source={avatarImage} style={styles.avatar} />
              </View>
            )}
            
            <TouchableOpacity style={styles.mediaButton} onPress={handleAddMediaPress}>
              <Ionicons name="camera" size={14} color="#007AFF" />
              <Text style={styles.mediaButtonText}>Add Media</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.nameSection}
            onPress={handleClientNamePress}
            activeOpacity={0.7}
          >
            <Text style={styles.clientName}>{appointment.clientName || 'No Name'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        {/* Appointment Details */}
        <View style={styles.appointmentDetails}>
          <View style={styles.timeSection}>
            <Ionicons name="time-outline" size={20} color="#8e8e93" />
            <Text style={styles.timeText}>{appointment.startTime} - {appointment.endTime}</Text>
          </View>
          
          <View style={styles.serviceSection}>
            <Ionicons name="scissors-outline" size={20} color="#8e8e93" />
            <Text style={styles.serviceText}>
              {appointment.appointmenttype}
              {appointment.addons && appointment.addons.length > 0 && (
                appointment.addons.map(addon => ` + ${addon.trim()}`).join('')
              )}
            </Text>
          </View>
          
          <View style={styles.priceSection}>
            <Ionicons name="card-outline" size={20} color="#8e8e93" />
            <Text style={styles.priceText}>${appointment.price}</Text>
          </View>
        </View>
        
        {/* Payment Button */}
        <TouchableOpacity style={styles.paymentButton} onPress={handlePaymentPress}>
          <Ionicons 
            name={appointment.paid ? "card" : "wallet-outline"} 
            size={18} 
            color="#ffffff" 
          />
          <Text style={styles.paymentButtonText}>
            {appointment.paid ? 'Update Payment' : 'Log Payment'}
          </Text>
        </TouchableOpacity>
        
        {/* Notes Section */}
        <View style={styles.notesSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#ffffff" />
            <Text style={styles.sectionTitle}>Notes</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => setIsAddNoteModalVisible(true)}
            >
              <Ionicons name="add" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          {notes.length > 0 ? (
            <View style={styles.notesContent}>
              {/* Always show the first note */}
              <View style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteDate}>{formatNoteDate(notes[0].createdat)}</Text>
                  <View style={styles.noteActions}>
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedNote(notes[0]);
                        setEditedNoteContent(notes[0].content);
                        setIsEditNoteModalVisible(true);
                      }}
                      style={styles.noteActionBtn}
                    >
                      <Ionicons name="create-outline" size={16} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteNote(notes[0].id)}
                      style={styles.noteActionBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ff453a" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.noteText}>{notes[0].content}</Text>
              </View>

              {/* Show remaining notes when showAllNotes is true */}
              {showAllNotes && notes.slice(1).map((note, index) => (
                <View key={index} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteDate}>{formatNoteDate(note.createdat)}</Text>
                    <View style={styles.noteActions}>
                      <TouchableOpacity 
                        onPress={() => {
                          setSelectedNote(note);
                          setEditedNoteContent(note.content);
                          setIsEditNoteModalVisible(true);
                        }}
                        style={styles.noteActionBtn}
                      >
                        <Ionicons name="create-outline" size={16} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteNote(note.id)}
                        style={styles.noteActionBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ff453a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.noteText}>{note.content}</Text>
                </View>
              ))}
              
              {notes.length > 1 && (
                <TouchableOpacity 
                  onPress={() => setShowAllNotes(!showAllNotes)}
                  style={styles.expandButton}
                >
                  <Text style={styles.expandText}>
                    {showAllNotes ? 'Show Less' : `Show ${notes.length - 1} More`}
                  </Text>
                  <Ionicons 
                    name={showAllNotes ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#007AFF" 
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No notes yet</Text>
            </View>
          )}
        </View>
        
        {/* Appointments History */}
        <View style={styles.appointmentsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#ffffff" />
            <Text style={styles.sectionTitle}>Appointments</Text>
          </View>
          
          {clientAppointments.length > 0 ? (
            <View style={styles.appointmentsContent}>
              {clientAppointments.map((app, index) => (
                <View key={index} style={[
                  styles.appointmentCard,
                  app.id === appointment.id ? styles.currentAppointmentCard : null
                ]}>
                  <Text style={styles.appointmentDate}>{formatAppointmentDate(app.date)}</Text>
                  <Text style={styles.appointmentService}>
                    {app.appointmenttype}
                    {app.addons && app.addons.length > 0 && (
                      app.addons.map(addon => ` + ${addon.trim()}`).join('')
                    )}
                  </Text>
                  <Text style={styles.appointmentPrice}>${app.price}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          )}
        </View>
        
        {/* Messages Section */}
        <View style={styles.messagesSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles-outline" size={20} color="#ffffff" />
            <Text style={styles.sectionTitle}>Recent Messages</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigateToFullMessageHistory(currentClientId, appointment.clientName)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {messages.length > 0 ? (
            <View style={styles.messagesContent}>
              {messages.slice(-3).map((message, index) => {
                const isAssistant = message.fromtext === '+18446480598';
                const senderName = isAssistant ? 'Assistant' : appointment.clientName;

                return (
                  <View key={index} style={styles.messageCard}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageSender}>{senderName}</Text>
                      <Text style={styles.messageTime}>{formatTimestamp(message.date)}</Text>
                    </View>
                    <Text style={styles.messagePreview} numberOfLines={2}>
                      {message.body}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          )}
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
      {renderEditNoteModal()}
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
    backgroundColor: '#000000',
  },
  cardContainer: {
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderRadius: 24,
    margin: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.1)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Header Section
  headerSection: {
    marginBottom: 24,
  },
  
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.3)',
  },
  
  deleteBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  
  statusBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  
  paidText: {
    color: '#30d158',
    fontSize: 12,
    fontWeight: '600',
  },
  
  methodBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  methodText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  tipBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  tipText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  
  pendingText: {
    color: '#ff9f0a',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Profile Section
  profileContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  
  avatarWrapper: {
    marginBottom: 12,
  },
  
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  videoPlaceholder: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  
  mediaButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  clientName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  
  // Appointment Details
  appointmentDetails: {
    width: '100%',
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  timeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  serviceSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  
  serviceText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  priceText: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: '700',
  },
  
  // Payment Button
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
    gap: 8,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Section Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  
  viewAllText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Notes Section
  notesSection: {
    marginBottom: 32,
  },
  
  notesContent: {
    gap: 12,
  },
  
  noteCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderRadius: 12,
    padding: 16,
  },
  
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  noteDate: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '500',
  },
  
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  
  noteActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  noteText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  
  expandText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Appointments Section
  appointmentsSection: {
    marginBottom: 32,
  },
  
  appointmentsContent: {
    gap: 8,
  },
  
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  
  currentAppointmentCard: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  
  appointmentDate: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '600',
    width: 60,
  },
  
  appointmentService: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  
  appointmentPrice: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Messages Section
  messagesSection: {
    marginBottom: 32,
  },
  
  messagesContent: {
    gap: 8,
  },
  
  messageCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderRadius: 12,
    padding: 16,
  },
  
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  messageSender: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  messageTime: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '500',
  },
  
  messagePreview: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // Empty States
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  
  emptyText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  addNoteModalContent: {
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  addNoteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  addNoteModalInput: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.3)',
  },
  
  addNoteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  addNoteModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  
  cancelButton: {
    backgroundColor: 'rgba(84, 84, 88, 0.6)',
  },
  
  submitButton: {
    backgroundColor: '#007AFF',
  },
  
  addNoteModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    gap: 16,
  },
  
  loadingText: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '500',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 40,
  },
  
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Note Modal Styles (Modern Design)
  noteModalContainer: {
    backgroundColor: 'rgba(18, 18, 18, 0.98)',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  // Note Modal Header
  noteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  noteHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  noteModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  
  noteCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Note Modal Content
  noteModalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  
  noteInput: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.3)',
    fontWeight: '500',
  },
  
  // Note Modal Actions
  noteModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  
  noteCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(84, 84, 88, 0.6)',
    alignItems: 'center',
  },
  
  noteCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  noteSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  noteSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ClientCardView;