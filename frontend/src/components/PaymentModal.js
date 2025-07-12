import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PaymentModal = ({ isVisible, onClose, onSubmit, initialPaymentData, appointmentPrice }) => {
  const [paymentData, setPaymentData] = useState({
    ...initialPaymentData,
    price: Math.round(Number(appointmentPrice ?? initialPaymentData.price)),
    tipAmount: Math.round(Number(initialPaymentData.tipAmount)),
    totalAmount: Math.round(Number(appointmentPrice ?? initialPaymentData.price) + Number(initialPaymentData.tipAmount)),
    paymentMethod: initialPaymentData.paymentMethod || 'cash',
    paid: initialPaymentData.paid || false,
  });

  useEffect(() => {
    setPaymentData({
      ...initialPaymentData,
      price: Math.round(Number(appointmentPrice ?? initialPaymentData.price)),
      tipAmount: Math.round(Number(initialPaymentData.tipAmount)),
      totalAmount: Math.round(Number(appointmentPrice ?? initialPaymentData.price) + Number(initialPaymentData.tipAmount)),
      paymentMethod: initialPaymentData.paymentMethod || 'cash',
      paid: initialPaymentData.paid || false,
    });
  }, [initialPaymentData, appointmentPrice]);

  const handleNumberChange = (field, value) => {
    let numericValue;
    if (field === 'price') {
      // For price, treat empty string as 0, but don't allow setting to 0
      numericValue = value === '' ? 0 : Math.max(1, Math.round(parseFloat(value) || 0));
    } else {
      // For other fields (tip and total), allow 0
      numericValue = Math.round(parseFloat(value) || 0);
    }
    let newPaymentData = { ...paymentData, [field]: numericValue };

    if (field === 'price' || field === 'tipAmount') {
      newPaymentData.totalAmount = newPaymentData.price + newPaymentData.tipAmount;
    } else if (field === 'totalAmount') {
      newPaymentData.tipAmount = Math.max(0, newPaymentData.totalAmount - newPaymentData.price);
    }

    setPaymentData(newPaymentData);
  };

  const handleSubmit = () => {
    onSubmit(paymentData);
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIcon}>
              <Ionicons name="card" size={24} color="#007AFF" />
            </View>
            <Text style={styles.modalTitle}>Payment Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Payment Amounts */}
          <View style={styles.amountsSection}>
            <View style={styles.amountField}>
              <Text style={styles.fieldLabel}>Service Price</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={paymentData.price.toString()}
                  onChangeText={(value) => handleNumberChange('price', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#48484a"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>

            <View style={styles.amountField}>
              <Text style={styles.fieldLabel}>Tip Amount</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={paymentData.tipAmount.toString()}
                  onChangeText={(value) => handleNumberChange('tipAmount', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#48484a"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={(event) => event.target.clear()}
                />
              </View>
            </View>

            <View style={[styles.amountField, styles.totalField]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <View style={styles.totalWrapper}>
                <Text style={styles.totalCurrency}>$</Text>
                <TextInput
                  style={styles.totalInput}
                  value={paymentData.totalAmount.toString()}
                  onChangeText={(value) => handleNumberChange('totalAmount', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#48484a"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={(event) => event.target.clear()}
                />
              </View>
            </View>
          </View>

          {/* Payment Status */}
          <View style={styles.optionsSection}>
            <Text style={styles.sectionTitle}>Payment Status</Text>
            <View style={styles.toggleContainer}>
              {['yes', 'no'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.toggleOption,
                    paymentData.paid === (option === 'yes') && styles.toggleOptionActive
                  ]}
                  onPress={() => setPaymentData({ ...paymentData, paid: option === 'yes' })}
                >
                  <Text style={[
                    styles.toggleText,
                    paymentData.paid === (option === 'yes') && styles.toggleTextActive
                  ]}>
                    {option === 'yes' ? 'Paid' : 'Unpaid'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.optionsSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.methodContainer}>
              {[
                { key: 'cash', label: 'Cash', icon: 'cash' },
                { key: 'e-transfer', label: 'E-Transfer', icon: 'card' }
              ].map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.methodOption,
                    paymentData.paymentMethod === method.key && styles.methodOptionActive
                  ]}
                  onPress={() => setPaymentData({ ...paymentData, paymentMethod: method.key })}
                >
                  <Ionicons 
                    name={method.icon} 
                    size={20} 
                    color={paymentData.paymentMethod === method.key ? '#007AFF' : '#8e8e93'} 
                  />
                  <Text style={[
                    styles.methodText,
                    paymentData.paymentMethod === method.key && styles.methodTextActive
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>Save Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  modalContainer: {
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
  
  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Amounts Section
  amountsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 20,
  },
  
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  fieldLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.3)',
    minWidth: 120,
  },
  
  currencySymbol: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  
  amountInput: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  
  // Total Field (highlighted)
  totalField: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  
  totalLabel: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  
  totalWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  
  totalCurrency: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  
  totalInput: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  
  // Options Sections
  optionsSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(84, 84, 88, 0.2)',
  },
  
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  
  // Toggle Container (Paid/Unpaid)
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  toggleOptionActive: {
    backgroundColor: '#007AFF',
  },
  
  toggleText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  
  toggleTextActive: {
    color: '#ffffff',
  },
  
  // Method Container
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  methodOptionActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderColor: 'rgba(0, 122, 255, 0.4)',
  },
  
  methodText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  
  methodTextActive: {
    color: '#007AFF',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(84, 84, 88, 0.6)',
    alignItems: 'center',
  },
  
  cancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  submitBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentModal;