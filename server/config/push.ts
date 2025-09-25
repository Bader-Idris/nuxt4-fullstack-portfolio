
export const apnConfig = {
  token: {
    key: process.env.APN_KEY, // Path to the .p8 key file
    keyId: process.env.APN_KEY_ID,
    teamId: process.env.APN_TEAM_ID,
  },
  production: process.env.NODE_ENV === 'production',
};

export const fcmConfig = {
  serviceAccount: process.env.FCM_SERVICE_ACCOUNT, // Path to the service account key file
};
