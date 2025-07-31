// src/models/audit-log.model.ts
import { Schema, model, Document } from 'mongoose';

// Define the interface
export interface AuditLogDocument extends Document {
  action: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

// Define the schema
const AuditLogSchema = new Schema<AuditLogDocument>({
  action: { type: String, required: true },
  userId: { type: String, default: null },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create and export the model
export const AuditLog = model<AuditLogDocument>('AuditLog', AuditLogSchema);





// // src/models/audit-log.model.ts
// import { Schema, model, Document } from 'mongoose';

// interface IAuditLog extends Document {
//   action: string;
//   userId: string | null;
//   entityType: string;
//   entityId: string;
//   metadata: Record<string, any>;
//   timestamp: Date;
// }

// const AuditLogSchema = new Schema<IAuditLog>({
//   action: { type: String, required: true },
//   userId: { type: String, default: null },
//   entityType: { type: String, required: true },
//   entityId: { type: String, required: true },
//   metadata: { type: Schema.Types.Mixed, required: true },
//   timestamp: { type: Date, default: Date.now }
// });

// export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);



// // src/models/audit-log.model.ts
// import { Model, DataTypes, CreateOptions } from 'sequelize';
// import { sequelize } from '../config/database';

// interface AuditLogAttributes {
//   id?: number;
//   action: string;
//   userId: string | null;
//   entityType: string;
//   entityId: string;
//   metadata: any;
//   timestamp?: Date;
// }

// class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
//   public id!: number;
//   public action!: string;
//   public userId!: string | null;
//   public entityType!: string;
//   public entityId!: string;
//   public metadata!: any;
//   public timestamp!: Date;

//   // Add static methods to help TypeScript
//   static async createRecord(attributes: AuditLogAttributes, options?: CreateOptions): Promise<AuditLog> {
//     return this.create(attributes, options);
//   }
// }

// AuditLog.init({
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true
//   },
//   action: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   userId: {
//     type: DataTypes.STRING,
//     allowNull: true
//   },
//   entityType: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   entityId: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   metadata: {
//     type: DataTypes.JSONB,
//     allowNull: false
//   },
//   timestamp: {
//     type: DataTypes.DATE,
//     allowNull: false,
//     defaultValue: DataTypes.NOW
//   }
// }, {
//   sequelize,
//   tableName: 'audit_logs',
//   modelName: 'AuditLog'
// });

// export { AuditLog };







// // import { Model, DataTypes } from 'sequelize';
// // import { sequelize } from '../config/database';

// // interface AuditLogAttributes {
// //   id: number;
// //   action: string;
// //   userId: string | null;
// //   entityType: string;
// //   entityId: string;
// //   metadata: any;
// //   timestamp: Date;
// // }

// // export class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
// //   public id!: number;
// //   public action!: string;
// //   public userId!: string | null;
// //   public entityType!: string;
// //   public entityId!: string;
// //   public metadata!: any;
// //   public timestamp!: Date;
// // }

// // AuditLog.init({
// //   id: {
// //     type: DataTypes.INTEGER,
// //     autoIncrement: true,
// //     primaryKey: true
// //   },
// //   action: {
// //     type: DataTypes.STRING,
// //     allowNull: false
// //   },
// //   userId: {
// //     type: DataTypes.STRING,
// //     allowNull: true
// //   },
// //   entityType: {
// //     type: DataTypes.STRING,
// //     allowNull: false
// //   },
// //   entityId: {
// //     type: DataTypes.STRING,
// //     allowNull: false
// //   },
// //   metadata: {
// //     type: DataTypes.JSONB,
// //     allowNull: false
// //   },
// //   timestamp: {
// //     type: DataTypes.DATE,
// //     allowNull: false,
// //     defaultValue: DataTypes.NOW
// //   }
// // }, {
// //   sequelize,
// //   tableName: 'audit_logs',
// //   indexes: [
// //     { fields: ['action'] },
// //     { fields: ['entityType', 'entityId'] },
// //     { fields: ['timestamp'] }
// //   ]
// // });