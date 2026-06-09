import { readFileSync } from "node:fs";
import apn from "@parse/node-apn";
import { initializeApp, getApps, cert, refreshToken } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging"; 

const config = useRuntimeConfig();

let apnProvider: apn.Provider | null = null;
if (config.apnKey && config.apnKeyId && config.apnTeamId) {
  try {
    apnProvider = new apn.Provider({
      token: {
        key: config.apnKey,
        keyId: config.apnKeyId,
        teamId: config.apnTeamId,
      },
      production: config.nodeEnv === "production",
    });
  } catch (error) {
    console.error("Failed to initialize APN provider:", error);
  }
}

// Firebase Admin SDK initialization
// We use the same pattern as jwt.ts, utilizing useRuntimeConfig()
if (getApps().length === 0) {
  try {
    if (config.firebaseRefreshToken) {
      // Use Refresh Token approach as suggested by official docs to avoid file-system dependency
      initializeApp({
        credential: refreshToken(config.firebaseRefreshToken),
        databaseURL: config.firebaseDatabaseUrl,
      });
      console.log("Firebase Admin SDK initialized with refresh token.");
    } else if (config.fcmServiceAccount) {
      // Robust service account initialization (handles both file path and direct JSON string)
      let serviceAccount;
      if (config.fcmServiceAccount.startsWith("{")) {
        serviceAccount = JSON.parse(config.fcmServiceAccount);
      } else {
        serviceAccount = JSON.parse(
          readFileSync(config.fcmServiceAccount, "utf8"),
        );
      }
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized with service account.");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export async function sendAPN(token: string, payload: any) {
  if (!apnProvider) {
    console.error("APN provider is not configured.");
    return;
  }

  const notification = new apn.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  notification.badge = 1;
  notification.sound = "ping.aiff";
  notification.alert = {
    title: payload.title,
    body: payload.body,
  };
  notification.payload = { messageFrom: payload.from };
  notification.topic = config.apnBundleId || ""; // Your app bundle ID

  try {
    const result = await apnProvider.send(notification, token);
    console.log("APN sent:", result);
  } catch (error) {
    console.error("APN error:", error);
  }
}

export async function sendFCM(token: string, payload: any) {
  if (!getApps().length) {
    console.error("Firebase Admin SDK is not initialized.");
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
    const response = await getMessaging().send(message);
    console.log("FCM sent:", response);
  } catch (error) {
    console.error("FCM error:", error);
  }
}