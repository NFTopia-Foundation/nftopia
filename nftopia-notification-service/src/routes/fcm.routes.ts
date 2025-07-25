import { FCMService } from "@/channels/fcm/fcm.service";
import express from "express";

const router = express.Router();
const fcmService = new FCMService();

router.post("/register-token", async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or token" });
    }

    await fcmService.registerToken(userId, token);
    res.status(200).json({ success: true, message: "Token registered" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to register token", error });
  }
});

export default router;
