import express, { Request, Response } from "express";
import { redisClient } from "@/config/redisclient";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res
      .status(400)
      .json({ success: false, message: "Missing token or userId" });
  }

  try {
    await redisClient.set(`device-token:${userId}`, token);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving device token:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;
