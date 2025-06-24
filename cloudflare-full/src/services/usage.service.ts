import { Env } from '../index';
import { UsageLabel } from '../config/common';

export class UsageService {
  constructor(private env: Env) {}

  async incr(userId: string, label: UsageLabel) {
    // Check if usage record exists
    const existing = await this.env.DB.prepare(
      'SELECT id, count FROM usage WHERE user_id = ? AND label = ?'
    ).bind(userId, label).first() as any;

    if (existing) {
      // Update existing record
      await this.env.DB.prepare(
        'UPDATE usage SET count = count + 1, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(existing.id).run();
    } else {
      // Create new usage record
      await this.env.DB.prepare(`
        INSERT INTO usage (id, user_id, label, count, updated_at)
        VALUES (?, ?, ?, 1, datetime('now'))
      `).bind(crypto.randomUUID(), userId, label).run();
    }

    // Also track in KV for quick access
    const kvKey = `usage:${userId}:${label}`;
    const current = await this.env.KV.get(kvKey, 'json') as any || { count: 0 };
    current.count++;
    current.updatedAt = new Date().toISOString();
    
    await this.env.KV.put(kvKey, JSON.stringify(current), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  }

  async getUsage(userId: string, label: UsageLabel): Promise<number> {
    // Try KV first for performance
    const kvKey = `usage:${userId}:${label}`;
    const kvData = await this.env.KV.get(kvKey, 'json') as any;
    
    if (kvData) {
      return kvData.count;
    }

    // Fallback to DB
    const result = await this.env.DB.prepare(
      'SELECT count FROM usage WHERE user_id = ? AND label = ?'
    ).bind(userId, label).first() as any;

    return result?.count || 0;
  }

  async getAllUsage(userId: string) {
    const results = await this.env.DB.prepare(
      'SELECT label, count, updated_at FROM usage WHERE user_id = ?'
    ).bind(userId).all();

    return results.results as any[];
  }

  async resetMonthlyUsage() {
    // This would be called by a scheduled worker to reset monthly usage
    await this.env.DB.prepare(`
      UPDATE usage 
      SET count = 0, updated_at = datetime('now')
      WHERE label IN (?, ?)
    `).bind(UsageLabel.ApproveComment, UsageLabel.QuickApprove).run();

    // Clear KV cache
    // In production, you'd iterate through users and clear their KV entries
    console.log('Monthly usage reset completed');
  }

  async incrementQuickApprove(userId: string) {
    return this.incr(userId, UsageLabel.QuickApprove);
  }

  async incrementApproveComment(userId: string) {
    return this.incr(userId, UsageLabel.ApproveComment);
  }
}