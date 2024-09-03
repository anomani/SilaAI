import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Keyboard } from 'react-native';

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
    >
      <View style={styles.modalOverlay}>
        <View style={styles.paymentModalContent}>
          <Text style={styles.paymentModalTitle}>Log Payment</Text>
          
          <View style={styles.paymentOption}>
            <Text style={styles.paymentOptionLabel}>Price:</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={paymentData.price.toString()}
                onChangeText={(value) => handleNumberChange('price', value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                // Removed onFocus for price
              />
            </View>
          </View>

          <View style={styles.paymentOption}>
            <Text style={styles.paymentOptionLabel}>Tip Amount:</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={paymentData.tipAmount.toString()}
                onChangeText={(value) => handleNumberChange('tipAmount', value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                onFocus={(event) => event.target.clear()}
              />
            </View>
          </View>

          <View style={styles.paymentOption}>
            <Text style={styles.paymentOptionLabel}>Total Amount:</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={paymentData.totalAmount.toString()}
                onChangeText={(value) => handleNumberChange('totalAmount', value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                onFocus={(event) => event.target.clear()}
              />
            </View>
          </View>

          <Text style={styles.paymentOptionLabel}>Paid:</Text>
          <View style={styles.paymentMethodOptions}>
            {['yes', 'no'].map((option) => (
              <View key={option} style={styles.paymentMethodOption}>
                <TouchableOpacity
                  style={styles.radioButtonTouchable}
                  onPress={() => setPaymentData({ ...paymentData, paid: option === 'yes' })}
                >
                  <View style={styles.radioButton}>
                    {paymentData.paid === (option === 'yes') && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
                <Text style={styles.paymentMethodText}>{option === 'yes' ? 'Yes' : 'No'}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.paymentOptionLabel}>Payment Method:</Text>
          <View style={[styles.paymentMethodOptions, { marginBottom: 24 }]}>
            {['cash', 'e-transfer'].map((method) => (
              <View key={method} style={styles.paymentMethodOption}>
                <TouchableOpacity
                  style={styles.radioButtonTouchable}
                  onPress={() => setPaymentData({ ...paymentData, paymentMethod: method })}
                >
                  <View style={styles.radioButton}>
                    {paymentData.paymentMethod === method && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
                <Text style={styles.paymentMethodText}>{method === 'cash' ? 'Cash' : 'E-Transfer'}</Text>
              </View>
            ))}
          </View>

          <View style={styles.paymentModalButtons}>
            <TouchableOpacity 
              style={[styles.paymentModalButton, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.paymentModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.paymentModalButton, styles.submitButton]} 
              onPress={handleSubmit}
            >
              <Text style={styles.paymentModalButtonText}>Submit</Text>
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
  inputContainer: {
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
  input: {
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
});

export default PaymentModal;