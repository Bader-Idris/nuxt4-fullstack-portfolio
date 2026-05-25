import webpush from "web-push";
import admin from "firebase-admin";
import sendEmail from "./sendEmail";
import { User } from "../models/mongo/User";
import { PushSubscription } from "../models/mongo/PushSubscription";
import { CapacitorSubscription } from "../models/mongo/CapacitorSubscription";

export async function notifyMissedCall(toUserId: string, fromName: string) {
  try {
    const targetUser = await User.findById(toUserId);
    if (!targetUser) return;

    const originUrl = process.env.ORIGIN_URL || "https://baderidris.com";
    const payload = {
      title: "Missed Call",
      body: `You have a missed call from ${fromName}`,
      data: {
        url: `${originUrl}/dashboard`,
        action: "open_chat"
      }
    };

    // 1. Web Push
    const webSubs = await PushSubscription.find({ userId: toUserId });
    for (const sub of webSubs) {
      try {
        await webpush.sendNotification(
          sub.subscription as any,
          JSON.stringify({
            notification: {
              title: payload.title,
              body: payload.body,
              icon: "/favicon.ico",
              click_action: payload.data.url
            }
          })
        );
      } catch (e) {
        console.error("WebPush failed for user:", toUserId, e);
      }
    }

    // 2. Mobile Push (FCM)
    const capSubs = await CapacitorSubscription.find({ userId: toUserId });
    for (const sub of capSubs) {
      if (sub.platform === "android" || sub.platform === "ios") {
        try {
          await admin.messaging().send({
            token: sub.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: {
              url: payload.data.url
            }
          });
        } catch (e) {
          console.error("FCM failed for user:", toUserId, e);
        }
      }
    }

    // 3. Email
    if (targetUser.email) {
      await sendEmail({
        to: targetUser.email,
        subject: `Missed call from ${fromName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Missed Call</h2>
            <p>Hello <strong>${targetUser.name}</strong>,</p>
            <p>You have a missed call from <strong>${fromName}</strong> on the Bader Idris Portfolio platform.</p>
            <div style="margin: 30px 0;">
              <a href="${originUrl}/dashboard" style="background-color: #4d5bce; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Call Back Now</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999;">
              You received this because you have notifications enabled. 
              <a href="${originUrl}/dashboard" style="color: #4d5bce;">Update your settings</a> to unsubscribe.
            </p>
          </div>
        `
      });
    }
  } catch (error) {
    console.error("Error in notifyMissedCall:", error);
  }
}
