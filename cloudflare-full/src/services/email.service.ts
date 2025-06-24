import { Env } from '../index';

export class EmailService {
  constructor(private env: Env) {}

  async send(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    if (!this.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, email not sent');
      return;
    }

    const fromEmail = options.from || this.env.FROM_EMAIL || 'noreply@cusdis.com';

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: options.to }],
            subject: options.subject,
          }],
          from: { email: fromEmail },
          content: [{
            type: 'text/html',
            value: options.html,
          }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('SendGrid error:', error);
        throw new Error(`SendGrid API error: ${response.status}`);
      }

      console.log('Email sent successfully to:', options.to);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendNewCommentNotification(
    to: string,
    projectTitle: string,
    pageTitle: string,
    commentContent: string,
    commenterName: string,
    approveUrl: string,
    dashboardUrl: string
  ) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Comment on ${projectTitle}</h2>
        <p>A new comment has been posted on your page "<strong>${pageTitle}</strong>":</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
          <p><strong>${commenterName}</strong> wrote:</p>
          <p>${commentContent}</p>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${approveUrl}" style="display: inline-block; background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
            Approve Comment
          </a>
          <a href="${dashboardUrl}" style="display: inline-block; background: #666; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            View Dashboard
          </a>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent by Cusdis comment system. 
          <a href="${dashboardUrl}/settings">Manage your notification preferences</a>
        </p>
      </div>
    `;

    await this.send({
      to,
      subject: `New comment on ${projectTitle}`,
      html,
    });
  }

  async sendConfirmReplyNotification(
    to: string,
    pageTitle: string,
    commentId: string
  ) {
    const confirmUrl = `${this.env.SITE_URL}/api/open/confirm-reply-notification?token=${this.generateConfirmToken(commentId)}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Confirm Reply Notifications</h2>
        <p>You have requested to receive notifications when someone replies to your comment on "${pageTitle}".</p>
        
        <p>To confirm this subscription, please click the button below:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${confirmUrl}" style="display: inline-block; background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Confirm Reply Notifications
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent by Cusdis comment system.
        </p>
      </div>
    `;

    await this.send({
      to,
      subject: `Confirm reply notifications for ${pageTitle}`,
      html,
    });
  }

  async sendReplyNotification(
    to: string,
    pageTitle: string,
    originalContent: string,
    replyContent: string,
    replierName: string,
    pageUrl: string,
    unsubscribeUrl: string
  ) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Reply to Your Comment</h2>
        <p>Someone has replied to your comment on "${pageTitle}":</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #ccc; margin: 20px 0;">
          <p><strong>Your comment:</strong></p>
          <p>${originalContent}</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
          <p><strong>${replierName}</strong> replied:</p>
          <p>${replyContent}</p>
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${pageUrl}" style="display: inline-block; background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            View Conversation
          </a>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Don't want to receive these notifications? 
          <a href="${unsubscribeUrl}">Unsubscribe</a>
        </p>
      </div>
    `;

    await this.send({
      to,
      subject: `New reply on ${pageTitle}`,
      html,
    });
  }

  private generateConfirmToken(commentId: string): string {
    // Simple token generation - in production, consider using JWT or similar
    const data = `${commentId}:${Date.now()}`;
    return btoa(data).replace(/[+/=]/g, '');
  }

  public verifyConfirmToken(token: string): string | null {
    try {
      const decoded = atob(token);
      const [commentId] = decoded.split(':');
      return commentId;
    } catch {
      return null;
    }
  }
}