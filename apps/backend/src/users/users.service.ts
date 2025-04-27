import { Injectable } from '@nestjs/common';
import { User } from './users.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  // In a real application, replace this with a database repository
  private users: Map<string, User> = new Map();

  async findByAddress(address: string): Promise<User | undefined> {
    // Convert to lowercase for case-insensitive comparison
    const lowerAddress = address.toLowerCase();
    
    // Find user by address
    for (const user of this.users.values()) {
      if (user.address.toLowerCase() === lowerAddress) {
        return user;
      }
    }
    
    return undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(address: string): Promise<User> {
    const id = uuidv4();
    const now = new Date();
    
    const newUser: User = {
      id,
      address: address.toLowerCase(),
      createdAt: now,
      updatedAt: now,
      lastLogin: now,
    };
    
    this.users.set(id, newUser);
    return newUser;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const user = this.users.get(userId);
    
    if (user) {
      user.refreshToken = refreshToken;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  async findByRefreshToken(refreshToken: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.refreshToken === refreshToken) {
        return user;
      }
    }
    
    return undefined;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }
}