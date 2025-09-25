
import apn from 'apn';
import admin from 'firebase-admin';
import { apnConfig, fcmConfig } from '../config/push';

let apnProvider: apn.Provider | null = null;
if (apnConfig.token.key && apnConfig.token.keyId && apnConfig.token.teamId) {
  try {
    apnProvider = new apn.Provider(apnConfig);
  } catch (error) {
    console.error('Failed to initialize APN provider:', error);
  }
}

if (fcmConfig.serviceAccount) {
  try {
    const serviceAccount = require(fcmConfig.serviceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

export async function sendAPN(token: string, payload: any) {
  if (!apnProvider) {
    console.error('APN provider is not configured.');
    return;
  }

  const notification = new apn.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  notification.badge = 1;
  notification.sound = 'ping.aiff';
  notification.alert = payload.title;
  notification.payload = { messageFrom: payload.from };
  notification.topic = process.env.APN_BUNDLE_ID || ''; // Your app bundle ID

  try {
    const result = await apnProvider.send(notification, token);
    console.log('APN sent:', result);
  } catch (error) {
    console.error('APN error:', error);
  }
}

export async function sendFCM(token: string, payload: any) {
  if (!admin.apps.length) {
    console.error('Firebase Admin SDK is not initialized.');
    return;
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('FCM sent:', response);
  } catch (error) {
    console.error('FCM error:', error);
  }
}
