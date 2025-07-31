// models/preferences.model.ts
import mongoose from 'mongoose';

const preferenceSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  preferences: {
    purchaseConfirmation: { type: Boolean, default: true },
    bidActivity: { type: Boolean, default: true },
    marketing: { type: Boolean, default: true },
    // Add other notification types as needed
  },
  updatedAt: { type: Date, default: Date.now }
});

// Add pre-save hook to update timestamp
preferenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const UserPreferences = mongoose.model('UserPreferences', preferenceSchema);
