import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Modal, TextInput, SafeAreaView } from 'react-native';
import { getCustomList, sendMessagesToSelectedClients, updateClientOutreachDate } from '../services/api';
import Checkbox from 'expo-checkbox';
import { Ionicons } from '@expo/vector-icons';

const QueryResults = ({ route }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClients, setSelectedClients] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [conversationMessage, setConversationMessage] = useState('');
  const [search, setSearch] = useState('');
  const { id } = route.params; // Change this line

  useEffect(() => {
    fetchQueryResults();
  }, [id]); // Change this line

  const fetchQueryResults = async () => {
    setLoading(true);
    try {
      const data = await getCustomList(id); // Change this line
      setClients(data);
    } catch (error) {
      console.error('Error fetching query results:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prevSelected => 
      prevSelected.includes(clientId)
        ? prevSelected.filter(id => id !== clientId)
        : [...prevSelected, clientId]
    );
  };

  const handleInitiateConversation = () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }
    setConversationMessage(`Hey {firstName},\n\n`);
    setModalVisible(true);
  };

  const initiateConversation = async () => {
    if (!conversationMessage.trim()) {
      alert('Please enter a message');
      return;
    }
    try {
      console.log(selectedClients, conversationMessage);
      await sendMessagesToSelectedClients(selectedClients, conversationMessage);
      
      // Update client outreach date for each selected client
      const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      for (const clientId of selectedClients) {
        await updateClientOutreachDate(clientId, today);
      }

      alert('Conversations initiated successfully and client outreach dates updated. You can view the chats in the chat dashboard and will get notifications when you need to jump in.');
      setSelectedClients([]);
      setConversationMessage('');
      setModalVisible(false);
    } catch (error) {
      console.error('Error initiating conversations or updating outreach dates:', error);
      alert('Failed to initiate conversations or update outreach dates');
    }
  };

  const selectAllClients = () => {
    setSelectedClients(clients.map(client => client.id));
  };

  const deselectAllClients = () => {
    setSelectedClients([]);
  };

  const filteredClients = clients.filter(client =>
    `${client.firstname} ${client.lastname}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Custom List</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <>
            <View style={styles.header}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search"
                placeholderTextColor="white"
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity style={styles.refreshButton} onPress={fetchQueryResults}>
                <Ionicons name="refresh" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.selectionControls}>
              <TouchableOpacity style={styles.selectionButton} onPress={selectAllClients}>
                <Text style={styles.selectionButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.selectionButton} onPress={deselectAllClients}>
                <Text style={styles.selectionButtonText}>Deselect All</Text>
              </TouchableOpacity>
              <Text style={styles.selectedCount}>{selectedClients.length} selected</Text>
            </View>
            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.clientItem}>
                  <Checkbox
                    value={selectedClients.includes(item.id)}
                    onValueChange={() => toggleClientSelection(item.id)}
                    style={styles.checkbox}
                    color={selectedClients.includes(item.id) ? '#007bff' : undefined}
                  />
                  <Image source={{ uri: item.ProfileImage }} style={styles.profileImage} />
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.firstname} {item.lastname}</Text>
                    <Text style={styles.clientPhone}>{item.phonenumber}</Text>
                  </View>
                </View>
              )}
            />
            <TouchableOpacity style={styles.initiateButton} onPress={handleInitiateConversation}>
              <Text style={styles.initiateButtonText}>Initiate Conversation with Selected Clients</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>
              Initiate conversation with {selectedClients.length} selected client(s)
            </Text>
            <Text style={styles.instructionText}>
              Write the initial message and AI will take care of the rest! Use {'{firstName}'} to automatically insert the client's first name.
            </Text>
            <TextInput
              style={styles.input}
              onChangeText={setConversationMessage}
              value={conversationMessage}
              placeholder="Type your message here"
              placeholderTextColor="#999"
              multiline
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonInitiate]}
                onPress={initiateConversation}
              >
                <Text style={styles.textStyle}>Initiate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    color: '#fff',
  },
  clientPhone: {
    fontSize: 14,
    color: '#ccc',
  },
  checkbox: {
    marginRight: 8,
  },
  initiateButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  initiateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: '#2c2c2e',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
  },
  instructionText: {
    marginBottom: 10,
    textAlign: 'center',
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
  },
  input: {
    height: 100,
    width: '100%',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    backgroundColor: '#1c1c1e',
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginHorizontal: 10,
  },
  buttonCancel: {
    backgroundColor: '#555',
  },
  buttonInitiate: {
    backgroundColor: '#007bff',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectionButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 4,
  },
  selectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedCount: {
    color: '#fff',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    color: 'white',
    marginRight: 10,
  },
  refreshButton: {
    marginLeft: 10,
  },
});

export default QueryResults;
