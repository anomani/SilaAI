import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateClientOutreachMessage } from '../services/api';

const ClientOutreachCard = ({ client, onEdit, isUpcoming = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedMessage, setEditedMessage] = useState(client?.message || '');

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEditPress = () => {
    if (onEdit) {
      onEdit();
    } else {
      setEditedMessage(client?.message || '');
      setIsEditModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateClientOutreachMessage(client.id, editedMessage);
      client.message = editedMessage;
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Error updating client message:', error);
    }
  };

  // Calculate weeks since last visit
  const getTimeAgo = () => {
    if (!client?.lastVisitDate) return 'No previous visits';
    
    const lastVisit = new Date(client.lastVisitDate);
    const now = new Date();
    const diffTime = Math.abs(now - lastVisit);
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
  };

  // Get the reason for selection
  const getSelectionReason = () => {
    if (!client) return '';
    
    if (client.selectionReason) return client.selectionReason;
    
    if (client.group) {
      return `Matches group ${client.group}`;
    }
    
    return 'Past client due for a visit';
  };

  return (
    <View style={[styles.cardContainer, isUpcoming && styles.upcomingCard]}>
      <TouchableOpacity 
        style={styles.cardHeader} 
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.clientInfoContainer}>
          <Text style={styles.clientName}>{client?.firstName} {client?.lastName}</Text>
          <View style={styles.clientMetaContainer}>
            <Text style={styles.clientMetaText}>Last visit: {getTimeAgo()}</Text>
            {client?.group && (
              <View style={styles.groupBadge}>
                <Text style={styles.groupText}>Group {client.group}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#fff" 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.cardContent}>
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Why selected:</Text>
            <Text style={styles.reasonText}>{getSelectionReason()}</Text>
          </View>
          
          {client?.message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageLabel}>Outreach message:</Text>
              <Text style={styles.messageText}>{client.message}</Text>
            </View>
          )}
          
          {!isUpcoming && (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={handleEditPress}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editButtonText}>
                {onEdit ? 'View/Edit in Chat' : 'Edit Message'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Outreach Message</Text>
            <TextInput
              style={styles.messageInput}
              value={editedMessage}
              onChangeText={setEditedMessage}
              multiline
              placeholder="Enter your message here"
              placeholderTextColor="#aaa"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#2a2a2c',
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
  },
  upcomingCard: {
    opacity: 0.7,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  clientInfoContainer: {
    flex: 1,
  },
  clientName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clientMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  clientMetaText: {
    color: '#aaa',
    fontSize: 12,
    marginRight: 8,
  },
  groupBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  reasonContainer: {
    marginBottom: 12,
  },
  reasonLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  reasonText: {
    color: '#fff',
    fontSize: 14,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  editButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  messageInput: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  saveButton: {
    backgroundColor: '#3498db',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ClientOutreachCard; 