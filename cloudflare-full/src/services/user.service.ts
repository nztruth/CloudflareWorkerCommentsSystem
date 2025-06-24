import { Env } from '../index';

export class UserService {
  constructor(private env: Env) {}

  async getById(userId: string) {
    const result = await this.env.DB.prepare(`
      SELECT id, name, display_name, email, email_verified, image, 
             created_at, enable_new_comment_notification, notification_email
      FROM users 
      WHERE id = ?
    `).bind(userId).first();

    return result;
  }

  async updateProfile(userId: string, updates: {
    name?: string;
    display_name?: string;
    notification_email?: string;
    enable_new_comment_notification?: boolean;
  }) {
    const setParts: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setParts.push('name = ?');
      params.push(updates.name);
    }
    if (updates.display_name !== undefined) {
      setParts.push('display_name = ?');
      params.push(updates.display_name);
    }
    if (updates.notification_email !== undefined) {
      setParts.push('notification_email = ?');
      params.push(updates.notification_email);
    }
    if (updates.enable_new_comment_notification !== undefined) {
      setParts.push('enable_new_comment_notification = ?');
      params.push(updates.enable_new_comment_notification ? 1 : 0);
    }

    if (setParts.length === 0) {
      throw new Error('No updates provided');
    }

    setParts.push('updated_at = datetime(\'now\')');
    params.push(userId);

    const query = `
      UPDATE users 
      SET ${setParts.join(', ')}
      WHERE id = ?
    `;

    const result = await this.env.DB.prepare(query).bind(...params).run();

    if (result.changes === 0) {
      throw new Error('User not found');
    }

    return await this.getById(userId);
  }

  async getSubscription(userId: string) {
    const result = await this.env.DB.prepare(`
      SELECT id, status, ends_at, created_at
      FROM subscriptions
      WHERE user_id = ?
    `).bind(userId).first();

    return result;
  }

  async canCreateProject(userId: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    
    // Free tier limit: 3 projects
    if (!subscription || subscription.status === 'free') {
      const projectCount = await this.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM projects
        WHERE owner_id = ? AND deleted_at IS NULL
      `).bind(userId).first() as any;

      return (projectCount?.count || 0) < 3;
    }

    // Pro tier: unlimited (or higher limit)
    return true;
  }

  async getUsage(userId: string) {
    const result = await this.env.DB.prepare(`
      SELECT label, count, updated_at
      FROM usage
      WHERE user_id = ?
    `).bind(userId).all();

    return result.results;
  }

  async incrementUsage(userId: string, label: string, increment: number = 1) {
    // Try to update existing usage
    const updateResult = await this.env.DB.prepare(`
      UPDATE usage 
      SET count = count + ?, updated_at = datetime('now')
      WHERE user_id = ? AND label = ?
    `).bind(increment, userId, label).run();

    // If no existing record, create one
    if (updateResult.changes === 0) {
      await this.env.DB.prepare(`
        INSERT INTO usage (id, user_id, label, count, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(crypto.randomUUID(), userId, label, increment).run();
    }
  }

  async getStats(userId: string) {
    // Get project count
    const projectCount = await this.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE owner_id = ? AND deleted_at IS NULL
    `).bind(userId).first() as any;

    // Get total comment count across all projects
    const commentCount = await this.env.DB.prepare(`
      SELECT COUNT(c.id) as count
      FROM comments c
      INNER JOIN pages p ON c.page_id = p.id
      INNER JOIN projects pr ON p.project_id = pr.id
      WHERE pr.owner_id = ? AND c.deleted_at IS NULL
    `).bind(userId).first() as any;

    // Get pending comment count (unapproved)
    const pendingCount = await this.env.DB.prepare(`
      SELECT COUNT(c.id) as count
      FROM comments c
      INNER JOIN pages p ON c.page_id = p.id
      INNER JOIN projects pr ON p.project_id = pr.id
      WHERE pr.owner_id = ? AND c.approved = 0 AND c.deleted_at IS NULL
    `).bind(userId).first() as any;

    return {
      projectCount: projectCount?.count || 0,
      commentCount: commentCount?.count || 0,
      pendingCount: pendingCount?.count || 0,
    };
  }

  async deleteAccount(userId: string) {
    // Start transaction-like operations
    // Soft delete all projects
    await this.env.DB.prepare(`
      UPDATE projects 
      SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE owner_id = ?
    `).bind(userId).run();

    // Soft delete all comments made as moderator
    await this.env.DB.prepare(`
      UPDATE comments 
      SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE moderator_id = ?
    `).bind(userId).run();

    // Delete user record
    await this.env.DB.prepare(`
      DELETE FROM users WHERE id = ?
    `).bind(userId).run();

    // Delete subscription
    await this.env.DB.prepare(`
      DELETE FROM subscriptions WHERE user_id = ?
    `).bind(userId).run();

    // Delete usage records
    await this.env.DB.prepare(`
      DELETE FROM usage WHERE user_id = ?
    `).bind(userId).run();

    // Clear session from KV
    await this.env.KV.delete(`session:${userId}`);
  }
}