import { sign, verify } from 'hono/jwt';
import { Env } from '../index';

export class AuthService {
  constructor(private env: Env) {}

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedInput = await this.hashPassword(password);
    return hashedInput === hash;
  }

  async generateToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };

    return await sign(payload, this.env.JWT_SECRET);
  }

  async register(email: string, password: string, name?: string) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Check if user already exists
    const existingUser = await this.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await this.hashPassword(password);
    const userId = crypto.randomUUID();

    // Create user
    await this.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(userId, email, passwordHash, name || null).run();

    // Create default subscription
    await this.env.DB.prepare(`
      INSERT INTO subscriptions (id, user_id, status, created_at)
      VALUES (?, ?, 'free', datetime('now'))
    `).bind(crypto.randomUUID(), userId).run();

    const token = await this.generateToken(userId, email);

    // Store session in KV
    await this.env.KV.put(`session:${userId}`, JSON.stringify({
      userId,
      email,
      name,
      createdAt: new Date().toISOString(),
    }), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 days

    return {
      token,
      user: {
        id: userId,
        email,
        name,
      },
    };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await this.env.DB.prepare(
      'SELECT id, email, password_hash, name FROM users WHERE email = ?'
    ).bind(email).first() as any;

    if (!user || !await this.verifyPassword(password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }

    const token = await this.generateToken(user.id, user.email);

    // Store session in KV
    await this.env.KV.put(`session:${user.id}`, JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: new Date().toISOString(),
    }), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 days

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async getSession(token: string) {
    try {
      const payload = await verify(token, this.env.JWT_SECRET) as any;
      const sessionData = await this.env.KV.get(`session:${payload.sub}`, 'json');
      
      if (!sessionData) {
        throw new Error('Session not found');
      }

      return {
        uid: payload.sub,
        user: {
          email: payload.email,
          name: sessionData.name,
        },
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async logout(userId: string) {
    await this.env.KV.delete(`session:${userId}`);
  }
}