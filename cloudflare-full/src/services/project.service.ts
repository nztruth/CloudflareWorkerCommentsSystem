import { Env } from '../index';

export class ProjectService {
  constructor(private env: Env) {}

  async create(title: string, ownerId: string) {
    const projectId = crypto.randomUUID();
    const token = crypto.randomUUID();

    const result = await this.env.DB.prepare(`
      INSERT INTO projects (id, title, owner_id, token, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(projectId, title, ownerId, token).run();

    if (!result.success) {
      throw new Error('Failed to create project');
    }

    // Cache project token for quick lookup
    await this.env.KV.put(`project_token:${token}`, projectId, {
      expirationTtl: 86400 * 30, // 30 days
    });

    return {
      id: projectId,
      title,
      token,
      owner_id: ownerId,
      created_at: new Date().toISOString(),
    };
  }

  async listByOwner(ownerId: string) {
    const result = await this.env.DB.prepare(`
      SELECT id, title, token, created_at, updated_at, deleted_at
      FROM projects
      WHERE owner_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `).bind(ownerId).all();

    return result.results;
  }

  async getByIdAndOwner(projectId: string, ownerId: string) {
    const result = await this.env.DB.prepare(`
      SELECT id, title, token, created_at, updated_at, enable_notification, webhook, enable_webhook
      FROM projects
      WHERE id = ? AND owner_id = ? AND deleted_at IS NULL
    `).bind(projectId, ownerId).first();

    return result;
  }

  async getById(projectId: string) {
    const result = await this.env.DB.prepare(`
      SELECT id, title, owner_id, token, created_at, updated_at, deleted_at, enable_notification, webhook, enable_webhook
      FROM projects
      WHERE id = ? AND deleted_at IS NULL
    `).bind(projectId).first();

    return result;
  }

  async getByToken(token: string) {
    // Try cache first
    const cachedProjectId = await this.env.KV.get(`project_token:${token}`);
    if (cachedProjectId) {
      return await this.getById(cachedProjectId);
    }

    // Fallback to database
    const result = await this.env.DB.prepare(`
      SELECT id, title, owner_id, token, created_at, updated_at, deleted_at, enable_notification, webhook, enable_webhook
      FROM projects
      WHERE token = ? AND deleted_at IS NULL
    `).bind(token).first() as any;

    if (result) {
      // Cache for future use
      await this.env.KV.put(`project_token:${token}`, result.id, {
        expirationTtl: 86400 * 30, // 30 days
      });
    }

    return result;
  }

  async isDeleted(projectId: string): Promise<boolean> {
    const result = await this.env.DB.prepare(
      'SELECT deleted_at FROM projects WHERE id = ?'
    ).bind(projectId).first() as any;

    return !result || result.deleted_at !== null;
  }

  async delete(projectId: string, ownerId: string) {
    const result = await this.env.DB.prepare(`
      UPDATE projects 
      SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND owner_id = ?
    `).bind(projectId, ownerId).run();

    if (result.changes === 0) {
      throw new Error('Project not found or not owned by user');
    }

    // Remove from cache
    const project = await this.env.DB.prepare(
      'SELECT token FROM projects WHERE id = ?'
    ).bind(projectId).first() as any;

    if (project?.token) {
      await this.env.KV.delete(`project_token:${project.token}`);
    }
  }

  async update(projectId: string, ownerId: string, updates: {
    title?: string;
    enable_notification?: boolean;
    webhook?: string;
    enable_webhook?: boolean;
  }) {
    const setParts: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      setParts.push('title = ?');
      params.push(updates.title);
    }
    if (updates.enable_notification !== undefined) {
      setParts.push('enable_notification = ?');
      params.push(updates.enable_notification ? 1 : 0);
    }
    if (updates.webhook !== undefined) {
      setParts.push('webhook = ?');
      params.push(updates.webhook);
    }
    if (updates.enable_webhook !== undefined) {
      setParts.push('enable_webhook = ?');
      params.push(updates.enable_webhook ? 1 : 0);
    }

    if (setParts.length === 0) {
      throw new Error('No updates provided');
    }

    setParts.push('updated_at = datetime(\'now\')');
    params.push(projectId, ownerId);

    const query = `
      UPDATE projects 
      SET ${setParts.join(', ')}
      WHERE id = ? AND owner_id = ? AND deleted_at IS NULL
    `;

    const result = await this.env.DB.prepare(query).bind(...params).run();

    if (result.changes === 0) {
      throw new Error('Project not found or not owned by user');
    }

    return await this.getByIdAndOwner(projectId, ownerId);
  }

  async regenerateToken(projectId: string, ownerId: string) {
    const oldProject = await this.getByIdAndOwner(projectId, ownerId);
    if (!oldProject) {
      throw new Error('Project not found');
    }

    const newToken = crypto.randomUUID();

    await this.env.DB.prepare(`
      UPDATE projects 
      SET token = ?, updated_at = datetime('now')
      WHERE id = ? AND owner_id = ?
    `).bind(newToken, projectId, ownerId).run();

    // Update cache
    await this.env.KV.delete(`project_token:${(oldProject as any).token}`);
    await this.env.KV.put(`project_token:${newToken}`, projectId, {
      expirationTtl: 86400 * 30, // 30 days
    });

    return {
      ...(oldProject as any),
      token: newToken,
    };
  }

  async fetchLatestComment(projectId: string, options?: {
    from?: Date;
    markAsRead?: boolean;
    take?: number;
  }) {
    const now = new Date();
    
    let whereClause = 'WHERE c.deleted_at IS NULL AND c.approved = 0 AND c.moderator_id IS NULL AND p.project_id = ?';
    const params: any[] = [projectId];

    if (options?.from) {
      whereClause += ' AND c.created_at >= ?';
      params.push(options.from.toISOString());
    }

    const results = await this.env.DB.prepare(`
      SELECT 
        c.by_email, c.by_nickname, c.content, c.created_at
      FROM comments c
      INNER JOIN pages p ON c.page_id = p.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ?
    `).bind(...params, options?.take || 20).all();

    if (options?.markAsRead) {
      await this.env.DB.prepare(`
        UPDATE projects 
        SET fetch_latest_comments_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(now.toISOString(), projectId).run();
    }

    return results.results;
  }
}