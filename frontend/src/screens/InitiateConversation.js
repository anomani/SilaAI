import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { sendMessagesToSelectedClients, updateClientOutreachDate, setAIPrompt } from '../services/api';

const presetPrompts = [
  {
    title: 'Rescheduling',
    content: 'Ask client to reschedule their appointment. Use the getUpcomingAppointment tool to get the appointment details for the appointment that is between August 24th and 29th, 2024. Then use this appointment date to reschedule this appointment. I am going on vacation from the 24th to the 29th so don’t offer appointments during those days. If a customer asks when can I book offer appointments after the 29th. Call clearCustomPrompt after the appointment is rescheduled or if the customer aknowledges the request',
    preview: 'Ask client to reschedule their appointment....'
  },
  {
    title: 'Appointment Reminder',
    content: `Remind the client about their upcoming appointment and confirm if they're still available or if they need to reschedule. Start off with some small talk then mention their upcoming appointment and ask if it still works. Use the upcoming appointments tool to get their upcoming appointment and confirm it with them. Make sure that you make a couple lines of small talk then throw the appointment in there. You have to confirm the appointment in conversation.
    After saying the appointment confirmation message then call clearCustomPrompt to clear the prompt

<Example Convo>

AI: Hey bro this is Uzi from Uzi Cuts. How's it going

Customer: hey man how you been

AI: Good bro, got a busy week ahead of me. How bout you?

***Small talk continues. Once you feel a stall in the conversation then ask about appointment

AI: Hey, I just saw you had an appointment coming up on {appointment Details}. Just wanted to confirm you good with that or if you need to reschedule?
{call getUpcomingAppointment for appointment details}
{call clearCustomPrompt in order to clear the prompt after sending the message}
</Example Convo>

Replace {appointment Details} with the next appointment details. Use the getUpcomingAppointmentTool in order to get the next appointment don't use the appointment history. After you have confirmed the appointment details then call the clearCustomPrompt function`,
    preview: 'Remind the client about their upcoming appointment...'
  },
  {
    title: 'Reach Out to Old Clients',
    content: `Your task is to get the user to return to the barber shop through normal informal conversation. Just talk to them very casually and use the conversation history in order to assess how to address the user. Don't immediately bring up that you should come back use informal small talk and then when you see fit bring up that you should swing by the barbershop sometime and when you feel that the user wants to book then use the scheduling instructions to accomplish this.
Here is an example conversation:
AI: Hey man this is Uzi from Uzi cuts. How you doing?

Customer: Im good bro how you been

AI: Im good man. Havent heard from you in a while what you been up to

Customer: Ive been good just busy with work and everything

AI: I just wanted say thank you for once being a part of my barber journey and trusting me with your image. It really means a lot. Would love to catch up all the big moments since we last met. When can I see you and bless you next ? 🙌

Make sure to say something along the lines of this somewhere in the conversation: I just wanted to say thank you for once being a part of my barber journey and trusting me with your image. It really means a lot. Would love to catch up all the big moments since we last met. When can I see you and bless you next ? 🙌
Never ask them if they need a cut. If they are asking to see if first make sure that they want to book an appointment before starting the book Appoiontment sequence. We want this to be a conversation among friends not like a sales pitch`,
    preview: 'Casually engage old clients to encourage them to return to the barbershop...'
  },
];

const InitiateConversation = ({ route, navigation }) => {
  const { selectedClients, clientCount } = route.params;
  const [conversationMessage, setConversationMessage] = useState(`Hey {firstName}, this is Uzi from Uzi Cuts reaching out from my new business number`);
  const [aiPrompt, setAiPrompt] = useState('');

  const initiateConversation = async () => {
    if (!conversationMessage.trim()) {
      alert('Please enter a message');
      return;
    }
    try {
      for (const clientId of selectedClients) {
        await setAIPrompt(clientId, aiPrompt);
      }
      await sendMessagesToSelectedClients(selectedClients, conversationMessage);
      
      const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      for (const clientId of selectedClients) {
        await updateClientOutreachDate(clientId, today);
      }

      alert('Conversations initiated successfully and client outreach dates updated.');
      navigation.goBack();
    } catch (error) {
      console.error('Error initiating conversations or updating outreach dates:', error);
      alert('Failed to initiate conversations or update outreach dates');
    }
  };

  const applyPresetPrompt = (prompt) => {
    setAiPrompt(prompt.content);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          Initiate conversation with {clientCount} selected client(s)
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
        <Text style={styles.sectionTitle}>AI Prompt</Text>
        <Text style={styles.instructionText}>
          Provide a prompt for the AI to guide the conversation:
        </Text>
        <TextInput
          style={styles.aiPromptInput}
          onChangeText={setAiPrompt}
          value={aiPrompt}
          placeholder="AI prompt"
          placeholderTextColor="#999"
          multiline
        />
        <Text style={styles.sectionTitle}>Preset Prompts</Text>
        {presetPrompts.map((prompt, index) => (
          <TouchableOpacity
            key={index}
            style={styles.presetPrompt}
            onPress={() => applyPresetPrompt(prompt)}
          >
            <Text style={styles.presetPromptTitle}>{prompt.title}</Text>
            <Text style={styles.presetPromptContent}>{prompt.preview}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel]}
            onPress={() => navigation.goBack()}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  instructionText: {
    marginBottom: 10,
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
  },
  input: {
    height: 100,
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    backgroundColor: '#2c2c2e',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  aiPromptInput: {
    height: 300, // Increased height for AI prompt input
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    backgroundColor: '#2c2c2e',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  presetPrompt: {
    backgroundColor: '#2c2c2e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  presetPromptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  presetPromptContent: {
    color: '#ccc',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
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
});

export default InitiateConversation;