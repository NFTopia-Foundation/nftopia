import { Request, Response } from "express";

export class WebSocketController {
  static health(req: Request, res: Response) {
    res.json({
      status: "ok",
      service: "websocket",
      timestamp: new Date().toISOString(),
    });
  }
}
