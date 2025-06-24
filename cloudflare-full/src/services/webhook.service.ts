import { Env } from '../index';
import { TokenService } from './token.service';

export enum HookType {
  NewComment = 'new_comment',
}

export type HookBody<T> = {
  type: HookType;
  data: T;
}

export type NewCommentHookData = {
  by_nickname: string;
  by_email: string;
  project_title: string;
  page_id: string;
  page_title: string;
  content: string;
  approve_link: string;
}

export class WebhookService {
  private tokenService: TokenService;

  constructor(private env: Env) {
    this.tokenService = new TokenService(env);
  }

  async addComment(comment: any, projectId: string) {
    // Get project with webhook settings
    const project = await this.env.DB.prepare(`
      SELECT id, enable_webhook, webhook
      FROM projects
      WHERE id = ? AND deleted_at IS NULL
    `).bind(projectId).first() as any;

    if (!project?.enable_webhook || !project.webhook || comment.moderator_id) {
      return;
    }

    // Get full comment data
    const fullComment = await this.env.DB.prepare(`
      SELECT 
        p.title as page_title,
        p.slug as page_slug,
        pr.title as project_title
      FROM comments c
      INNER JOIN pages p ON c.page_id = p.id
      INNER JOIN projects pr ON p.project_id = pr.id
      WHERE c.id = ?
    `).bind(comment.id).first() as any;

    if (!fullComment) {
      return;
    }

    try {
      const approveToken = await this.tokenService.genApproveToken(comment.id);
      const approveLink = `${this.env.SITE_URL}/open/approve?token=${approveToken}`;

      const webhookBody: HookBody<NewCommentHookData> = {
        type: HookType.NewComment,
        data: {
          by_nickname: comment.by_nickname,
          by_email: comment.by_email || '',
          content: comment.content,
          page_id: fullComment.page_slug,
          page_title: fullComment.page_title || '',
          project_title: fullComment.project_title,
          approve_link: approveLink,
        },
      };

      // Send webhook
      await fetch(project.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookBody),
      });

      console.log('Webhook sent successfully to:', project.webhook);
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }
}