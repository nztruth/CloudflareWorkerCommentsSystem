import { Env } from '../index';
import { UsageLabel } from '../config/common';

export const usageLimitation = {
  [UsageLabel.ApproveComment]: 100,
  [UsageLabel.QuickApprove]: 10,
  [UsageLabel.CreateSite]: 3
};

export class SubscriptionService {
  constructor(private env: Env) {}

  async update(body: any) {
    // Handle subscription webhook from payment provider
    const {
      order_id,
      product_id,
      variant_id,
      customer_id,
      status,
      ends_at,
      urls: {
        update_payment_method
      }
    } = body.data.attributes;

    const lemonSubscriptionId = body.data.id;
    const { user_id } = body.meta.custom_data;

    // Check if subscription exists
    const existing = await this.env.DB.prepare(
      'SELECT id FROM subscriptions WHERE user_id = ?'
    ).bind(user_id).first();

    if (existing) {
      // Update existing subscription
      await this.env.DB.prepare(`
        UPDATE subscriptions 
        SET status = ?, ends_at = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(status, ends_at, user_id).run();
    } else {
      // Create new subscription
      await this.env.DB.prepare(`
        INSERT INTO subscriptions (id, user_id, status, ends_at, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(crypto.randomUUID(), user_id, status, ends_at).run();
    }

    // Store additional data in KV if needed
    await this.env.KV.put(`subscription:${user_id}`, JSON.stringify({
      lemonSubscriptionId,
      orderId: order_id,
      productId: product_id,
      variantId: variant_id,
      customerId: customer_id,
      updatePaymentMethodUrl: update_payment_method,
      updatedAt: new Date().toISOString()
    }), { expirationTtl: 365 * 24 * 60 * 60 }); // 1 year
  }

  async isActivated(userId: string): Promise<boolean> {
    const subscription = await this.env.DB.prepare(
      'SELECT status, ends_at FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first() as any;

    if (!subscription) {
      return false;
    }

    // Active or cancelled (still valid until ends_at)
    return subscription.status === 'active' || 
           (subscription.status === 'cancelled' && new Date(subscription.ends_at) > new Date());
  }

  async getStatus(userId: string) {
    const subscription = await this.env.DB.prepare(
      'SELECT status, ends_at FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first() as any;

    // Get additional data from KV
    const kvData = await this.env.KV.get(`subscription:${userId}`, 'json') as any;

    return {
      isActived: await this.isActivated(userId),
      status: subscription?.status || '',
      endAt: subscription?.ends_at || '',
      updatePaymentMethodUrl: kvData?.updatePaymentMethodUrl || ''
    };
  }

  async createProjectValidate(userId: string): Promise<boolean> {
    // Check project count
    const projectCount = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM projects WHERE owner_id = ? AND deleted_at IS NULL'
    ).bind(userId).first() as any;

    if ((projectCount?.count || 0) < usageLimitation[UsageLabel.CreateSite]) {
      return true;
    }

    // Check if user has active subscription
    return await this.isActivated(userId);
  }

  async approveCommentValidate(userId: string): Promise<boolean> {
    if (await this.isActivated(userId)) {
      return true;
    }

    // Check usage
    const usage = await this.env.DB.prepare(
      'SELECT count FROM usage WHERE user_id = ? AND label = ?'
    ).bind(userId, UsageLabel.ApproveComment).first() as any;

    return !usage || usage.count < usageLimitation[UsageLabel.ApproveComment];
  }

  async quickApproveValidate(userId: string): Promise<boolean> {
    if (await this.isActivated(userId)) {
      return true;
    }

    // Check usage
    const usage = await this.env.DB.prepare(
      'SELECT count FROM usage WHERE user_id = ? AND label = ?'
    ).bind(userId, UsageLabel.QuickApprove).first() as any;

    return !usage || usage.count < usageLimitation[UsageLabel.QuickApprove];
  }
}