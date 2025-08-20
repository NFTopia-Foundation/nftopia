// import admin from "firebase-admin";
// import { Redis } from "ioredis";

// const redis = new Redis();

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(
//       JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON!)
//     ),
//   });
// }

// export class FCMService {
//   async sendToUser(userId: string, payload: admin.messaging.MessagingPayload) {
//     const token = await redis.get(`device-token:${userId}`);
//     if (!token) throw new Error(`No device token found for user ${userId}`);

//     try {
//       await admin.messaging().send({
//         token,
//         ...payload,
//       });
//       console.log(`Push sent to user ${userId}`);
//     } catch (error: any) {
//       console.error(`FCM error for ${userId}:`, error.message);
//       if (error.code === "messaging/invalid-registration-token") {
//         await redis.del(`device-token:${userId}`);
//       }
//       throw error;
//     }
//   }

//   async registerToken(userId: string, token: string) {
//     await redis.set(`device-token:${userId}`, token);
//   }
// }
