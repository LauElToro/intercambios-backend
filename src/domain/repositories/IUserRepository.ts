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
}
