import { Schema, model, Document } from 'mongoose';

export type AuditAction =
  | 'create'
  | 'update'
  | 'markAsRead'
  | 'updateStatus'
  | 'softDelete'
  | 'hardDelete';

export interface IAuditLog extends Document {
  action: AuditAction;
  entityType: 'Notification';
  entityId: string;
  actorId: string | null;
  actorRole?: string; // optional: user/admin/system
  source?: 'api' | 'system' | 'cron' | 'migration'; // for clarity
  before?: any;
  after?: any;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { 
      type: String, 
      required: true, 
      enum: ['create', 'update', 'markAsRead', 'updateStatus', 'softDelete', 'hardDelete'] 
    },
    entityType: { type: String, required: true, default: 'Notification' },
    entityId: { type: String, required: true, index: true },
    actorId: { type: String, default: null, index: true },
    actorRole: { type: String },
    source: { type: String, enum: ['api', 'system', 'cron', 'migration'], default: 'api' },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
