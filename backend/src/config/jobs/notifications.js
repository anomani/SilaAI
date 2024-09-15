const { getUserByPhoneNumber } = require('../../model/users');
const { getUserPushTokens } = require('../../model/pushToken');
const { Expo } = require('expo-server-sdk');

// Initialize the Expo SDK
let expo = new Expo();

async function sendNotificationToUser(title, body, recipientPhoneNumber, notificationType, data = {}) {
    const user = await getUserByPhoneNumber(recipientPhoneNumber);

    if (!user) {
        console.log('No user found with the given phone number');
        return;
    }

    const pushTokens = await getUserPushTokens(user.id);

    if (!pushTokens) {
        console.log('No push token found for the user');
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