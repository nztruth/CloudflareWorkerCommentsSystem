import { Env } from '../index';
import { statService } from './stat.service';

export type DataSchema = {
  pages: Array<{
    uniqueId: string;
    pageId: string;
    url?: string;
    title?: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    by_nickname: string;
    by_email?: string;
    pageUniqueId: string;
    parentId?: string;
  }>;
}

export class DataService {
  constructor(private env: Env) {}

  disqusAdapter(xmlData: string): DataSchema {
    // Parse XML to JSON
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
    
    // Extract threads (pages)
    const threads: DataSchema['pages'] = [];
    const threadElements = xmlDoc.getElementsByTagName('thread');
    
    for (let i = 0; i < threadElements.length; i++) {
      const thread = threadElements[i];
      const isDeleted = thread.querySelector('isDeleted')?.textContent === 'true';
      
      if (!isDeleted) {
        threads.push({
          uniqueId: thread.getAttribute('dsq:id') || '',
          pageId: thread.querySelector('id')?.textContent || '',
          url: thread.querySelector('link')?.textContent || '',
          title: thread.querySelector('title')?.textContent || '',
        });
      }
    }

    // Extract posts (comments)
    const posts: DataSchema['comments'] = [];
    const postElements = xmlDoc.getElementsByTagName('post');
    
    for (let i = 0; i < postElements.length; i++) {
      const post = postElements[i];
      const isDeleted = post.querySelector('isDeleted')?.textContent === 'true';
      const threadId = post.querySelector('thread')?.getAttribute('dsq:id');
      
      // Only include posts from valid threads
      if (!isDeleted && threadId && threads.find(t => t.uniqueId === threadId)) {
        const parentElement = post.querySelector('parent');
        
        posts.push({
          id: post.getAttribute('dsq:id') || '',
          content: this.htmlToMarkdown(post.querySelector('message')?.textContent || ''),
          createdAt: post.querySelector('createdAt')?.textContent || '',
          by_nickname: post.querySelector('author name')?.textContent || 'Anonymous',
          by_email: post.querySelector('author email')?.textContent,
          pageUniqueId: threadId,
          parentId: parentElement?.getAttribute('dsq:id'),
        });
      }
    }

    return {
      pages: threads,
      comments: posts,
    };
  }

  private htmlToMarkdown(html: string): string {
    // Basic HTML to Markdown conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
      .trim();
  }

  async import(projectId: string, schema: DataSchema) {
    const results = {
      pages: 0,
      comments: 0,
      errors: [] as string[]
    };

    // Import pages
    for (const page of schema.pages) {
      try {
        // Check if page exists
        const existing = await this.env.DB.prepare(
          'SELECT id FROM pages WHERE id = ? OR (slug = ? AND project_id = ?)'
        ).bind(page.uniqueId, page.pageId, projectId).first();

        if (!existing) {
          await this.env.DB.prepare(`
            INSERT INTO pages (id, slug, url, title, project_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            page.uniqueId,
            page.pageId,
            page.url || null,
            page.title || null,
            projectId
          ).run();
          
          results.pages++;
        }
      } catch (error) {
        results.errors.push(`Failed to import page ${page.pageId}: ${error}`);
      }
    }

    // Import comments
    for (const comment of schema.comments) {
      try {
        // Check if comment exists
        const existing = await this.env.DB.prepare(
          'SELECT id FROM comments WHERE id = ?'
        ).bind(comment.id).first();

        if (!existing) {
          await this.env.DB.prepare(`
            INSERT INTO comments (
              id, content, created_at, by_nickname, by_email, 
              page_id, parent_id, approved, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
          `).bind(
            comment.id,
            comment.content,
            comment.createdAt,
            comment.by_nickname,
            comment.by_email || null,
            comment.pageUniqueId,
            comment.parentId || null
          ).run();
          
          results.comments++;
        }
      } catch (error) {
        results.errors.push(`Failed to import comment ${comment.id}: ${error}`);
      }
    }

    return results;
  }

  async importFromDisqus(projectId: string, xmlData: string) {
    const schema = this.disqusAdapter(xmlData);
    const result = await this.import(projectId, schema);
    
    // Track import event
    if (statService) {
      statService.capture('import_disqus', {
        properties: {
          pages: result.pages,
          comments: result.comments,
          errors: result.errors.length
        }
      });
    }

    return result;
  }

  async exportProject(projectId: string): Promise<DataSchema> {
    // Export pages
    const pages = await this.env.DB.prepare(`
      SELECT id, slug, url, title 
      FROM pages 
      WHERE project_id = ?
    `).bind(projectId).all();

    // Export comments
    const comments = await this.env.DB.prepare(`
      SELECT c.id, c.content, c.created_at, c.by_nickname, c.by_email, c.page_id, c.parent_id
      FROM comments c
      INNER JOIN pages p ON c.page_id = p.id
      WHERE p.project_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `).bind(projectId).all();

    return {
      pages: pages.results.map((p: any) => ({
        uniqueId: p.id,
        pageId: p.slug,
        url: p.url,
        title: p.title
      })),
      comments: comments.results.map((c: any) => ({
        id: c.id,
        content: c.content,
        createdAt: c.created_at,
        by_nickname: c.by_nickname,
        by_email: c.by_email,
        pageUniqueId: c.page_id,
        parentId: c.parent_id
      }))
    };
  }
}