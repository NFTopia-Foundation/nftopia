export class User {
    id: string;
    address: string;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
    refreshToken?: string;
  }