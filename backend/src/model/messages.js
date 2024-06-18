const dbUtils = require('./dbUtils');

/*
           id INTEGER PRIMARY KEY AUTOINCREMENT,
            fromText TEXT,
            toText TEXT,
            body TEXT,
            date TEXT,
            clientId INTEGER,
            FOREIGN KEY(clientId) REFERENCES Client(id)
*/

async function saveMessage(from, to, body, date, clientId) {
  const db = dbUtils.getDB();
  const query = `INSERT INTO Messages (fromText, toText, body, date, clientId) VALUES (?, ?, ?, ?, ?)`;
  return new Promise((resolve, reject) => {
    db.run(query, [from, to, body, date, clientId], function (err) {
      if (err) {
        console.error('Error saving message:', err);
        reject(err);
      } else {
        console.log("Message saved with id:", this.lastID);
        resolve({ id: this.lastID });
      }
    });
  });
}

async function getAllMessages() {
  const db = dbUtils.getDB();
  const query = `SELECT * FROM Messages`;
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching all messages:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function getMessagesByClientId(clientId) {
  const db = dbUtils.getDB();
  const query = `SELECT * FROM Messages WHERE clientId = ?`;
  return new Promise((resolve, reject) => {
    db.all(query, [clientId], (err, rows) => {
      if (err) {
        console.error('Error fetching messages by clientId:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function deleteMessagesByClientId(clientId) {
  const db = dbUtils.getDB();
  const query = `DELETE FROM Messages WHERE clientId = ?`;
  return new Promise((resolve, reject) => {
    db.run(query, [clientId], function (err) {
      if (err) {
        console.error('Error deleting messages by clientId:', err);
        reject(err);
      } else {
        console.log(`Messages deleted for clientId ${clientId}:`, this.changes);
        resolve({ deletedCount: this.changes });
      }
    });
  });
}

module.exports = { saveMessage, getAllMessages, getMessagesByClientId, deleteMessagesByClientId };
