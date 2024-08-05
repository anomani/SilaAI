import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';

const BlockTimeModal = ({ isVisible, onClose, onSubmit }) => {
  const [blockedTimeData, setBlockedTimeData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    reason: ''
  });

  const handleInputChange = (field, value) => {
    setBlockedTimeData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    onSubmit(blockedTimeData);
    setBlockedTimeData({
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      reason: ''
    });
  };

  const handleDonePress = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              <View style={styles.blockTimeModal}>
                <Text style={styles.blockTimeModalTitle}>Block Time</Text>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>Date:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.date}
                    onChangeText={(value) => handleInputChange('date', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                    onSubmitEditing={handleDonePress}
                  />
                </View>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>Start Time:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.startTime}
                    onChangeText={(value) => handleInputChange('startTime', value)}
                    placeholder="HH:MM AM/PM"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                    onSubmitEditing={handleDonePress}
                  />
                </View>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>End Time:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.endTime}
                    onChangeText={(value) => handleInputChange('endTime', value)}
                    placeholder="HH:MM AM/PM"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                    onSubmitEditing={handleDonePress}
                  />
                </View>
                <View style={styles.blockTimeInputContainer}>
                  <Text style={styles.blockTimeInputLabel}>Reason:</Text>
                  <TextInput
                    style={styles.blockTimeInput}
                    value={blockedTimeData.reason}
                    onChangeText={(value) => handleInputChange('reason', value)}
                    placeholder="Reason for blocking time"
                    placeholderTextColor="#999"
                    returnKeyType="done"
                    onSubmitEditing={handleDonePress}
                  />
                </View>
                <View style={styles.blockTimeModalButtons}>
                  <TouchableOpacity 
                    style={[styles.blockTimeModalButton, styles.blockTimeCancelButton]} 
                    onPress={onClose}
                  >
                    <Text style={styles.blockTimeModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.blockTimeModalButton, styles.blockTimeSubmitButton]} 
                    onPress={handleSubmit}
                  >
                    <Text style={styles.blockTimeModalButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  blockTimeModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  blockTimeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  blockTimeInputContainer: {
    marginBottom: 15,
  },
  blockTimeInputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  blockTimeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  blockTimeModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  blockTimeModalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  blockTimeCancelButton: {
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  blockTimeSubmitButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  blockTimeModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BlockTimeModal;