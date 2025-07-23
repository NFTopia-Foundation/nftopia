export enum FraudRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface FraudCheckResult {
  isSuspicious: boolean;
  riskLevel: FraudRiskLevel;
  triggeredRules: string[];
  recommendation: 'ALLOW' | 'REVIEW' | 'BLOCK';
  confidence: number;
  metadata?: Record<string, any>;
}

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  fingerprint?: string;
}

export interface TransactionContext {
  deviceInfo: DeviceInfo;
  geoLocation?: {
    country: string;
    city: string;
    coordinates?: [number, number];
  };
}