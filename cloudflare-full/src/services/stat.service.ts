import { Env } from '../index';

export class StatService {
  constructor(private env: Env) {}

  async capture(
    event: string,
    options?: {
      identity?: string;
      properties?: any;
    }
  ) {
    // In production, you could send these to an analytics service
    // For now, just log to console
    console.log('Analytics event:', event, options);
    
    // You could also store in KV for basic analytics
    if (this.env.KV) {
      try {
        const key = `analytics:${event}:${new Date().toISOString().split('T')[0]}`;
        const current = await this.env.KV.get(key, 'json') as any || { count: 0, events: [] };
        
        current.count++;
        if (options) {
          current.events.push({
            timestamp: new Date().toISOString(),
            ...options
          });
        }
        
        await this.env.KV.put(key, JSON.stringify(current), {
          expirationTtl: 30 * 24 * 60 * 60 // 30 days
        });
      } catch (error) {
        console.error('Failed to capture analytics:', error);
      }
    }
  }

  start(
    op: string,
    name: string,
    options?: {
      description?: string;
      tags?: Record<string, string>;
    }
  ) {
    const startTime = Date.now();
    console.log(`Transaction started: ${op} - ${name}`, options);
    
    return {
      end() {
        const duration = Date.now() - startTime;
        console.log(`Transaction ended: ${op} - ${name} (${duration}ms)`);
      }
    };
  }
}

// Export singleton instance
export const statService = new StatService({ KV: null } as any);