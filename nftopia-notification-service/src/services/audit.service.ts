// src/services/audit.service.ts
import { AuditLog, AuditLogDocument } from '../models/audit-log.model'; // Import the type
import { logger } from '../utils/logger';
import { database } from '../config/database';

interface AuditLogEntry {
  action: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  metadata: Record<string, any>;
}

export class AuditService {
    /**
    * Logs an audit event to MongoDB
    */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Ensure DB connection is active
      if (!database.getConnection()) {
        await database.connect();
      }

      // Create and save the audit log
      await AuditLog.create({
        ...entry,
        timestamp: new Date() // Auto-set if your schema has `default: Date.now`
      });

      logger.info(`Audit logged: ${entry.action} (${entry.entityType}:${entry.entityId})`);
    } catch (error) {
      logger.error('Failed to record audit log:', error);
      // Fail gracefully (audit failures shouldn't break main flow)
    }
  }

  /**
   * Fetches audit logs by criteria
   */
  async queryLogs(criteria: Partial<AuditLogEntry>): Promise<AuditLogDocument[]> {
    try {
      if (!database.getConnection()) {
        await database.connect();
      }
      
      return await AuditLog.find(criteria)
        .sort({ timestamp: -1 })
        .exec(); 
    } catch (error) {
      logger.error('Failed to query audit logs:', error);
      return []; 
    }
  }
}

export const auditService = new AuditService();






// import { AuditLog } from '../models/audit-log.model'; 
// import { logger } from '../utils/logger';
// import { database } from '../config/database'; 

// interface AuditLogEntry {
//   action: string;
//   userId: string | null;
//   entityType: string;
//   entityId: string;
//   metadata: Record<string, any>;
// }

// export class AuditService {
//   /**
//    * Logs an audit event to MongoDB
//    */
//   async log(entry: AuditLogEntry): Promise<void> {
//     try {
//       // Ensure DB connection is active
//       if (!database.getConnection()) {
//         await database.connect();
//       }

//       // Create and save the audit log
//       await AuditLog.create({
//         ...entry,
//         timestamp: new Date() // Auto-set if your schema has `default: Date.now`
//       });

//       logger.info(`Audit logged: ${entry.action} (${entry.entityType}:${entry.entityId})`);
//     } catch (error) {
//       logger.error('Failed to record audit log:', error);
//       // Fail gracefully (audit failures shouldn't break main flow)
//     }
//   }

//   /**
//    * Fetches audit logs by criteria
//    */
//   async queryLogs(criteria: Partial<AuditLogEntry>): Promise<AuditLogDocument[]> {
//     return AuditLog.find(criteria).sort({ timestamp: -1 }).lean();
//   }
// }

// // Singleton export (matches your DB pattern)
// export const auditService = new AuditService();
