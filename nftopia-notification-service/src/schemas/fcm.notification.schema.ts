import { Schema, model, Document } from "mongoose";

export interface FcmNotification extends Document {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  token: string;
  status: "success" | "failure";
  response?: any;
  error?: string;
  sentAt: Date;
}

const FcmNotificationSchema = new Schema<FcmNotification>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    token: { type: String, required: true },
    status: { type: String, enum: ["success", "failure"], required: true },
    response: { type: Schema.Types.Mixed },
    error: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const FcmNotificationModel = model<FcmNotification>(
  "FcmNotification",
  FcmNotificationSchema
);
