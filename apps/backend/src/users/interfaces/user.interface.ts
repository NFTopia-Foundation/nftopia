import { Request } from 'express';

export interface User {
  id: string;
  address: string;
  refreshToken: string;
  [key: string]: any; // For any other properties
}

export interface RequestWithUser extends Request {
  user: User;
}