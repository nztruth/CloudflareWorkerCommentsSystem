import { Env } from '../index';
import { UsageLabel } from '../config/common';
import { ProjectService } from './project.service';
import { SubscriptionService } from './subscription.service';
import { UserService } from './user.service';

export class ViewDataService {
  private projectService: ProjectService;
  private subscriptionService: SubscriptionService;
  private userService: UserService;

  constructor(private env: Env) {
    this.projectService = new ProjectService(env);
    this.subscriptionService = new SubscriptionService(env);
    this.userService = new UserService(env);
  }

  async fetchMainLayoutData(userId: string, userEmail: string) {
    // Get user info
    const userInfo = await this.env.DB.prepare(`
      SELECT 
        name, email, display_name, 
        notification_email, enable_new_comment_notification
      FROM users 
      WHERE id = ?
    `).bind(userId).first() as any;

    // Get usage stats
    const [projectCount, approveCommentUsage, quickApproveUsage] = await Promise.all([
      this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM projects WHERE owner_id = ? AND deleted_at IS NULL'
      ).bind(userId).first().then((r: any) => r?.count || 0),
      
      this.env.DB.prepare(
        'SELECT count FROM usage WHERE user_id = ? AND label = ?'
      ).bind(userId, UsageLabel.ApproveComment).first().then((r: any) => r?.count || 0),
      
      this.env.DB.prepare(
        'SELECT count FROM usage WHERE user_id = ? AND label = ?'
      ).bind(userId, UsageLabel.QuickApprove).first().then((r: any) => r?.count || 0)
    ]);

    // Get projects
    const projects = await this.projectService.listByOwner(userId);

    // Get subscription status
    const subscription = await this.subscriptionService.getStatus(userId);

    return {
      session: {
        uid: userId,
        user: {
          email: userEmail,
          name: userInfo?.name || 'User'
        }
      },
      projects,
      subscription,
      usage: {
        projectCount,
        approveCommentUsage,
        quickApproveUsage
      },
      config: {
        isHosted: true,
        checkout: {
          enabled: true,
          url: 'https://checkout.stripe.com/...' // Replace with actual checkout URL
        }
      },
      userInfo: {
        name: userInfo?.name,
        email: userInfo?.email,
        displayName: userInfo?.display_name,
        notificationEmail: userInfo?.notification_email,
        enableNewCommentNotification: Boolean(userInfo?.enable_new_comment_notification)
      }
    };
  }

  async getDashboardStats(userId: string) {
    const stats = await this.userService.getStats(userId);
    
    // Get recent comments across all user's projects
    const recentComments = await this.env.DB.prepare(`
      SELECT 
        c.id, c.content, c.by_nickname, c.created_at, c.approved,
        p.slug as page_slug, p.title as page_title,
        pr.title as project_title, pr.id as project_id
      FROM comments c
      INNER JOIN pages p ON c.page_id = p.id
      INNER JOIN projects pr ON p.project_id = pr.id
      WHERE pr.owner_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT 10
    `).bind(userId).all();

    return {
      ...stats,
      recentComments: recentComments.results
    };
  }

  async getProjectViewData(projectId: string, userId: string) {
    const project = await this.projectService.getByIdAndOwner(projectId, userId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    // Get project stats
    const [pageCount, commentCount, pendingCount] = await Promise.all([
      this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM pages WHERE project_id = ?'
      ).bind(projectId).first().then((r: any) => r?.count || 0),
      
      this.env.DB.prepare(`
        SELECT COUNT(c.id) as count 
        FROM comments c
        INNER JOIN pages p ON c.page_id = p.id
        WHERE p.project_id = ? AND c.deleted_at IS NULL
      `).bind(projectId).first().then((r: any) => r?.count || 0),
      
      this.env.DB.prepare(`
        SELECT COUNT(c.id) as count 
        FROM comments c
        INNER JOIN pages p ON c.page_id = p.id
        WHERE p.project_id = ? AND c.approved = 0 AND c.deleted_at IS NULL
      `).bind(projectId).first().then((r: any) => r?.count || 0)
    ]);

    return {
      project,
      stats: {
        pageCount,
        commentCount,
        pendingCount
      }
    };
  }
}

export type MainLayoutData = Awaited<ReturnType<ViewDataService['fetchMainLayoutData']>>;