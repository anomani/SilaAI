const { getAllClients, createClient, searchForClients, 
    deleteClient, followUp, getClientById, updateClient, getDaysSinceLastAppointment, 
    updateClientOutreachDate, getClientAutoRespond, updateClientAutoRespond, getClientByPhoneNumber, checkClientExistsByPhone } = require('../model/clients');
const dbUtils = require('../model/dbUtils');
const { authenticateToken } = require('../middleware/authMiddleware');

async function getClients(req, res) {
    try {
        const userId = req.user.id;
        const clients = await getAllClients(userId);
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).send(`Error fetching clients: ${error.message}`);
    }
}


async function addClient(req, res) {
    const userId = req.user.id;
    const { firstname, lastname, phonenumber, email } = req.body;
    try {
        const result = await createClient(firstname, lastname, phonenumber, email, "", userId);
        const client = {
            id: result.insertedId,
            firstname,
            lastname,
            phonenumber,
            email
        };
        res.status(201).json(client);
    } catch (error) {
        res.status(500).send(`Error creating client: ${error.message}`);
    }
}



async function searchClients(req, res) {
    const userId = req.user.id;
  try {
    const { query } = req.query;
    const clients = await searchForClients(query, userId);
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).send(`Error searching clients: ${error.message}`);
  }
}

async function delClient(req, res) {
  const { id } = req.params;
  try {
    await deleteClient(id);
    res.status(200).send(`Client deleted: ${id}`);
  } catch (error) {
    res.status(500).send(`Error deleting client: ${error.message}`);
  }
}

async function getSuggestedFollowUps(req, res) {
    const userId = req.user.id;
    const { days } = req.params;
    const suggestedFollowUps = await followUp(days, userId);
    res.status(200).json({suggestedFollowUps});
}

async function clientIDGet(req, res) {
    const { id } = req.params;
    const client = await getClientById(id);
    res.status(200).json(client);
}

async function updateTheClient(req, res) {
    try {
        const { id } = req.params;
        const { firstname, lastname, phonenumber, email, notes } = req.body;
        const result = await updateClient(id, firstname, lastname, phonenumber, email);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).send(`Error updating client: ${error.message}`);
    }
}

async function daysSinceLastAppointment(req, res) {
    const { id } = req.params;
    const daysSinceLastAppointment = await getDaysSinceLastAppointment(id);
    res.status(200).json({ daysSinceLastAppointment });
}

async function updateClientOutreachDateController(req, res) {
    const { id } = req.params;
    const { outreachDate } = req.body;
    await updateClientOutreachDate(id, outreachDate);
    res.status(200).send(`Client outreach date updated: ${id}`);
}

async function getClientAutoRespondController(req, res) {
    const { id } = req.params;
    try {
        const autoRespond = await getClientAutoRespond(id);
        res.status(200).json({ autoRespond });
    } catch (error) {
        res.status(500).send(`Error fetching client auto_respond status: ${error.message}`);
    }
}

async function updateClientAutoRespondController(req, res) {
    const { id } = req.params;
    const { autoRespond } = req.body;
    try {
        const updatedClient = await updateClientAutoRespond(id, autoRespond);
        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(500).send(`Error updating client auto_respond status: ${error.message}`);
    }
}

async function getClientNameByPhone(req, res) {
    const { phoneNumber, userId } = req.params;
    try {
        const client = await getClientByPhoneNumber(phoneNumber, userId);
        res.status(200).json({
            firstName: client.firstname || '',
            lastName: client.lastname || ''
        });
    } catch (error) {
        res.status(500).send(`Error fetching client name: ${error.message}`);
    }
}

async function importContacts(req, res) {
    const userId = req.user.id;
    const { contacts } = req.body;
    
    console.log('=== IMPORT CONTACTS START ===');
    console.log('User ID:', userId);
    console.log('Contacts received:', JSON.stringify(contacts, null, 2));
    
    if (!contacts || !Array.isArray(contacts)) {
        console.log('ERROR: Invalid contacts array');
        return res.status(400).json({ error: 'Contacts array is required' });
    }

    try {
        const results = {
            imported: 0,
            skipped: 0,
            errors: [],
            duplicates: []
        };

        console.log(`Processing ${contacts.length} contacts for user ${userId}`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            console.log(`\n--- Processing contact ${i + 1}/${contacts.length} ---`);
            console.log('Contact data:', JSON.stringify(contact, null, 2));
            
            try {
                const { firstName, lastName, phoneNumber, email } = contact;
                
                if (!phoneNumber) {
                    console.log('ERROR: Missing phone number for contact:', contact);
                    results.errors.push({ contact, error: 'Missing phone number' });
                    continue;
                }

                const normalizedPhone = phoneNumber.replace(/\D/g, '');
                console.log('Original phone:', phoneNumber);
                console.log('Normalized phone:', normalizedPhone);
                
                console.log('Checking for existing client with phone:', normalizedPhone, 'and userId:', userId);
                const existingClient = await checkClientExistsByPhone(normalizedPhone, userId);
                
                if (existingClient) {
                    console.log('DUPLICATE FOUND:', existingClient);
                    results.duplicates.push({ contact, existing: existingClient });
                    results.skipped++;
                    continue;
                } else {
                    console.log('No existing client found, proceeding with creation');
                }

                console.log('Creating new client with data:', {
                    firstName: firstName || '',
                    lastName: lastName || '',
                    phoneNumber: normalizedPhone,
                    email: email || '',
                    userId: userId
                });

                const newClient = await createClient(
                    firstName || '',
                    lastName || '',
                    normalizedPhone,
                    email || '',
                    '',
                    userId
                );
                
                console.log('CLIENT CREATED SUCCESSFULLY:', newClient);
                results.imported++;
            } catch (contactError) {
                console.log('Contact processing error:', contactError.message);
                console.log('Full error:', contactError);
                
                if (contactError.message.includes('not found')) {
                    console.log('Error was "not found", attempting to create client anyway');
                    try {
                        const newClient = await createClient(
                            contact.firstName || '',
                            contact.lastName || '',
                            contact.phoneNumber.replace(/\D/g, ''),
                            contact.email || '',
                            '',
                            userId
                        );
                        console.log('CLIENT CREATED ON RETRY:', newClient);
                        results.imported++;
                    } catch (retryError) {
                        console.log('RETRY FAILED:', retryError);
                        results.errors.push({ contact, error: retryError.message });
                    }
                } else {
                    results.errors.push({ contact, error: contactError.message });
                }
            }
        }

        console.log('\n=== FINAL RESULTS ===');
        console.log('Results:', JSON.stringify(results, null, 2));
        console.log('=== IMPORT CONTACTS END ===\n');

        res.status(200).json(results);
    } catch (error) {
        console.log('IMPORT CONTACTS FATAL ERROR:', error);
        res.status(500).json({ error: `Error importing contacts: ${error.message}` });
    }
}

module.exports = { getClients, addClient, searchClients, delClient, getSuggestedFollowUps, clientIDGet, updateTheClient, daysSinceLastAppointment, updateClientOutreachDateController, getClientAutoRespondController, updateClientAutoRespondController, getClientNameByPhone, importContacts };