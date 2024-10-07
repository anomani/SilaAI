const { getUserById } = require('../../model/users');
const { getUserPushTokens } = require('../../model/pushToken');
const { Expo } = require('expo-server-sdk');

// Initialize the Expo SDK
let expo = new Expo();

async function sendNotificationToUser(title, body, userId, notificationType, data = {}) {
    const user = await getUserById(userId);

    if (!user) {
        console.log(`No user found with ID: ${userId}`);
        return;
    }

    const pushTokens = await getUserPushTokens(userId);

    if (!pushTokens || pushTokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return;
    }

    for (const token of pushTokens) {
        const notification = {
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: { ...data, notificationType: notificationType },
        };

        try {
            console.log('Sending notification:', notification);
            let ticketChunk = await expo.sendPushNotificationsAsync([notification]);
            console.log('Notification result:', ticketChunk);
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }
}

module.exports = {
    sendNotificationToUser
};