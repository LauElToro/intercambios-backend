import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { LoginCredentials } from '../../../domain/entities/Auth.js';

export class LoginUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(credentials: LoginCredentials): Promise<{ token: string; user: any }> {
    const result = await this.userRepository.getUserWithPassword(credentials.email);
    
    if (!result) {
      throw new Error('Credenciales inválidas');
    }

    const { user, password: hashedPassword } = result;

    const isValid = await bcrypt.compare(credentials.password, hashedPassword);
    
    if (!isValid) {
      throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // No devolver password
    const { password: _, ...userWithoutPassword } = user as any;
    
    return { token, user: userWithoutPassword };
  }
}
