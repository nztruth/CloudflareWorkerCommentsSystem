import { Env } from '../index';
import { NotificationService } from './notification.service';
import { WebhookService } from './webhook.service';

export class HookService {
  private notificationService: NotificationService;
  private webhookService: WebhookService;

  constructor(private env: Env) {
    this.notificationService = new NotificationService(env);
    this.webhookService = new WebhookService(env);
  }

  async addComment(comment: any, projectId: string) {
    // Run notification and webhook services in parallel
    await Promise.all([
      this.notificationService.addComment(comment, projectId),
      this.webhookService.addComment(comment, projectId)
    ]);
  }
}