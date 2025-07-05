interface SuppressionRecord {
  email: string;
  reason: string;
  suppressedAt: Date;
  type: 'hard_bounce' | 'soft_bounce' | 'spam_report' | 'manual';
}

export class SuppressionService {
  private suppressionList: Map<string, SuppressionRecord>;

  constructor() {
    this.suppressionList = new Map();
  }

  public async addWithReason(email: string, reason: string): Promise<void> {
    try {
      const suppressionRecord: SuppressionRecord = {
        email: email.toLowerCase(),
        reason,
        suppressedAt: new Date(),
        type: this.determineSuppressionType(reason),
      };

      this.suppressionList.set(email.toLowerCase(), suppressionRecord);
      
      console.log(`Added ${email} to suppression list: ${reason}`);
      
    } catch (error) {
      console.error(`Failed to add ${email} to suppression list`, error);
      throw error;
    }
  }

  public async isSupressed(email: string): Promise<boolean> {
    return this.suppressionList.has(email.toLowerCase());
  }

  public async remove(email: string): Promise<void> {
    const removed = this.suppressionList.delete(email.toLowerCase());
    if (removed) {
      console.log(`Removed ${email} from suppression list`);
    }
  }

  public async getSuppressionRecord(email: string): Promise<SuppressionRecord | null> {
    return this.suppressionList.get(email.toLowerCase()) || null;
  }

  public async getAllSuppressions(): Promise<SuppressionRecord[]> {
    return Array.from(this.suppressionList.values());
  }

  private determineSuppressionType(reason: string): SuppressionRecord['type'] {
    if (reason.includes('hard_bounce')) return 'hard_bounce';
    if (reason.includes('soft_bounce') || reason.includes('max_soft_bounces')) return 'soft_bounce';
    if (reason.includes('spam_report')) return 'spam_report';
    return 'manual';
  }
}
