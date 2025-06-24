import { Env } from '../index';

export class PageService {
  constructor(private env: Env) {}

  async upsertPage(
    slug: string,
    projectId: string,
    options: {
      pageTitle?: string;
      pageUrl?: string;
    } = {}
  ) {
    // Check if page already exists
    const existingPage = await this.env.DB.prepare(`
      SELECT id, title, url FROM pages WHERE slug = ? AND project_id = ?
    `).bind(slug, projectId).first() as any;

    if (existingPage) {
      // Update if new info provided
      let needsUpdate = false;
      const updates: any = {};

      if (options.pageTitle && options.pageTitle !== existingPage.title) {
        updates.title = options.pageTitle;
        needsUpdate = true;
      }

      if (options.pageUrl && options.pageUrl !== existingPage.url) {
        updates.url = options.pageUrl;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const setParts: string[] = [];
        const params: any[] = [];

        if (updates.title) {
          setParts.push('title = ?');
          params.push(updates.title);
        }
        if (updates.url) {
          setParts.push('url = ?');
          params.push(updates.url);
        }

        setParts.push('updated_at = datetime(\'now\')');
        params.push(existingPage.id);

        await this.env.DB.prepare(`
          UPDATE pages SET ${setParts.join(', ')} WHERE id = ?
        `).bind(...params).run();

        return {
          ...existingPage,
          ...updates,
        };
      }

      return existingPage;
    }

    // Create new page
    const pageId = crypto.randomUUID();

    const result = await this.env.DB.prepare(`
      INSERT INTO pages (id, slug, title, url, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      pageId,
      slug,
      options.pageTitle || null,
      options.pageUrl || null,
      projectId
    ).run();

    if (!result.success) {
      throw new Error('Failed to create page');
    }

    return {
      id: pageId,
      slug,
      title: options.pageTitle,
      url: options.pageUrl,
      project_id: projectId,
      created_at: new Date().toISOString(),
    };
  }

  async getByProjectId(projectId: string) {
    const result = await this.env.DB.prepare(`
      SELECT 
        p.id, p.slug, p.title, p.url, p.created_at, p.updated_at,
        COUNT(c.id) as comment_count
      FROM pages p
      LEFT JOIN comments c ON p.id = c.page_id AND c.deleted_at IS NULL
      WHERE p.project_id = ?
      GROUP BY p.id, p.slug, p.title, p.url, p.created_at, p.updated_at
      ORDER BY p.updated_at DESC
    `).bind(projectId).all();

    return result.results;
  }

  async getById(pageId: string) {
    const result = await this.env.DB.prepare(`
      SELECT id, slug, title, url, project_id, created_at, updated_at
      FROM pages
      WHERE id = ?
    `).bind(pageId).first();

    return result;
  }

  async delete(pageId: string, projectId: string) {
    // Soft delete all comments on this page first
    await this.env.DB.prepare(`
      UPDATE comments 
      SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE page_id = ?
    `).bind(pageId).run();

    // Delete the page
    const result = await this.env.DB.prepare(`
      DELETE FROM pages 
      WHERE id = ? AND project_id = ?
    `).bind(pageId, projectId).run();

    if (result.changes === 0) {
      throw new Error('Page not found');
    }
  }
}