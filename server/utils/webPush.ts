// https://www.npmjs.com/package/web-push#command-line
// TODO: initially, we need to create a sh file to check if our vapid keys are existing or not to create new ones
// this is the command to create them, private/public keys as ssl keys
// web-push generate-vapid-keys [--json]
// TO run it use:
// ./node_modules/.bin/web-push generate-vapid-keys [--json]
// TODO: how to create a custom hashing!
import webpush from "web-push";

export default function createWebPushInstance() {
  const config = useRuntimeConfig();

  const vapidKeys = {
    publicKey: config.public.vapidPublicKey,
    privateKey: config.vapidPrivateKey,
  };

  const mailTo = `mailto:${config.contactEmail}`;

  webpush.setVapidDetails(
    mailTo,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  return webpush;
}

// export default webpush;

/* 

// Subscribe Route
app.post("/subscribe", (req, res) => {
  // Get pushSubscription object
  const subscription = req.body;

  // Send 201 - resource created
  res.status(201).json({});

  // Create payload
  const payload = JSON.stringify({ title: "Push Test" });

  // Pass object into sendNotification
  webpush
    .sendNotification(subscription, payload)
    .catch(err => console.error(err));
});

*/