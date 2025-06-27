// Example: Extend Express Request type
declare namespace Express {
    export interface Request {
      user?: {
        id: string;
      };
    }
  }