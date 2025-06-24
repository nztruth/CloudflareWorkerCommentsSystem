import { Context } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export interface UserSession {
  uid: string;
  user: {
    email: string;
    name: string;
  };
}

export async function getSession(c: Context<{ Bindings: Env }>): Promise<UserSession | null> {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET);
    
    // Get user info from database
    const user = await c.env.DB.prepare(`
      SELECT id, email, name FROM users WHERE id = ?
    `).bind(payload.sub).first() as any;

    if (!user) {
      return null;
    }

    return {
      uid: user.id,
      user: {
        email: user.email,
        name: user.name || 'User',
      },
    };
  } catch (error) {
    return null;
  }
}

export function requireAuth(session: UserSession | null): UserSession {
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}