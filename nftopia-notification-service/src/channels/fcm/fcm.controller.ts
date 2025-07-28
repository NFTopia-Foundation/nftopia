import { Request, Response } from "express";
import { FCMService } from "./fcm.service";

const fcmService = new FCMService();

export const registerToken = async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token are required" });
  }

  try {
    await fcmService.registerToken(userId, token);
    return res.status(200).json({ message: "Token registered successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to register token" });
  }
};

export const sendNotification = async (req: Request, res: Response) => {
  const { userId, payload } = req.body;
  if (!userId || !payload) {
    return res.status(400).json({ error: "userId and payload are required" });
  }

  try {
    await fcmService.sendToUser(userId, payload);
    return res.status(200).json({ message: "Notification sent" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
