import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MessageApprovalCard = ({ 
  client, 
  onApprove, 
  onReject, 
  onEdit, 
  isProcessing = false,
  onClientPress,
  isSelected = false,
  onToggleSelection
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(client.message);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = () => {
    // This function is now handled by the onBlur event in the TextInput
    // Keeping it for potential future use
  };

  const handleApprove = () => {
    Alert.alert(
      'Send Message',
      `Send outreach message to ${client.firstName} ${client.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => onApprove(client.id) }
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Message',
      `Remove this outreach message for ${client.firstName} ${client.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onReject(client.id) }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No previous visits';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getClientIndicators = () => {
    const indicators = [];
    if (client.isHighValue) indicators.push({ icon: 'diamond', color: '#9C27B0', label: 'High Value' });
    if (client.isResponsive) indicators.push({ icon: 'chatbubble', color: '#4CAF50', label: 'Responsive' });
    if (client.isOverdue) indicators.push({ icon: 'time', color: '#FF9800', label: 'Overdue' });
    return indicators;
  };

  return (
    <View style={styles.container}>
      {/* Client Header */}
      <View style={styles.header}>
        {onToggleSelection && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={onToggleSelection}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={20}
              color={isSelected ? '#4CAF50' : '#666'}
            />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.clientInfo, onClientPress && styles.clickableClientInfo]}
          onPress={onClientPress}
          disabled={!onClientPress}
          activeOpacity={onClientPress ? 0.7 : 1}
        >
          <View style={styles.clientNameContainer}>
            <Text style={styles.clientName}>
              {client.firstName} {client.lastName}
            </Text>
            {onClientPress && (
              <Ionicons name="information-circle-outline" size={16} color="#9da6b8" style={styles.infoIcon} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.rejectActionButton}
          onPress={handleReject}
          disabled={isProcessing}
        >
          <Ionicons name="close-circle" size={24} color="#F44336" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.approveActionButton, isProcessing && styles.disabledActionButton]}
          onPress={handleApprove}
          disabled={isProcessing}
        >
          <Ionicons 
            name={isProcessing ? 'hourglass' : 'checkmark-circle'} 
            size={24} 
            color={isProcessing ? "#808080" : "#4CAF50"} 
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Client Details */}
      {isExpanded && (
        <View style={styles.expandedDetails}>
          {/* Client Indicators - now inside expanded section */}
          <View style={styles.indicators}>
            {getClientIndicators().map((indicator, index) => (
              <View key={index} style={styles.indicator}>
                <Ionicons name={indicator.icon} size={14} color={indicator.color} />
                <Text style={[styles.indicatorText, { color: indicator.color }]}>
                  {indicator.label}
                </Text>
              </View>
            ))}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Visit:</Text>
            <Text style={styles.detailValue}>{formatDate(client.lastAppointmentDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Days Since:</Text>
            <Text style={styles.detailValue}>{client.daysSinceLastAppointment} days</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Visits:</Text>
            <Text style={styles.detailValue}>{client.totalAppointments}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Avg Spending:</Text>
            <Text style={styles.detailValue}>${client.avgSpending.toFixed(0)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Messages Received:</Text>
            <Text style={styles.detailValue}>{client.totalMessagesReceived}</Text>
          </View>
        </View>
      )}

      {/* Message Content */}
      <View style={styles.messageContainer}>
        <View style={styles.messageLabelContainer}>
          <Text style={styles.messageLabel}>Outreach Message:</Text>
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#aaa" 
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.messageTextContainer}
          onPress={() => setIsEditing(true)}
          activeOpacity={0.7}
        >
          {isEditing ? (
            <TextInput
              style={styles.messageInput}
              value={editedMessage}
              onChangeText={setEditedMessage}
              onBlur={() => {
                if (editedMessage.trim() !== client.message) {
                  onEdit(client.id, editedMessage.trim());
                }
                setIsEditing(false);
              }}
              multiline
              placeholder="Enter message..."
              placeholderTextColor="#666"
              autoFocus
            />
          ) : (
            <Text style={styles.messageText}>{client.message}</Text>
          )}
        </TouchableOpacity>
      </View>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clickableClientInfo: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 8,
  },
  clientNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoIcon: {
    opacity: 0.8,
  },
  expandButton: {
    padding: 4,
  },
  indicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  indicatorText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  expandedDetails: {
    backgroundColor: '#1a1a1c',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  messageTextContainer: {
    borderRadius: 8,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: '#1a1a1c',
    padding: 12,
    borderRadius: 8,
  },
  messageInput: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: '#1a1a1c',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rejectActionButton: {
    padding: 8,
  },
  approveActionButton: {
    padding: 8,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
});

export default MessageApprovalCard; 