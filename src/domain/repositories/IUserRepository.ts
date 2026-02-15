import { User } from '../entities/User.js';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: number): Promise<void>;
  updatePassword(userId: number, hashedPassword: string): Promise<void>;
  getUserWithPassword(email: string): Promise<{ user: User; password: string } | null>;
  setMfaCode(userId: number, hashedCode: string, expiresAt: Date): Promise<void>;
  clearMfaCode(userId: number): Promise<void>;
  getMfaCodeAndExpiry(userId: number): Promise<{ mfaCode: string; mfaCodeExpiresAt: Date } | null>;
  setPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  clearPasswordResetToken(userId: number): Promise<void>;
}
