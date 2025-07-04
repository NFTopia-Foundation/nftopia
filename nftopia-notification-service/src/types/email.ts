export interface NFTPurchaseData {
  buyerEmail: string;
  buyerName: string;
  nftName: string;
  nftImage: string;
  purchasePrice: string;
  transactionHash: string;
  purchaseDate: Date;
  sellerName?: string;
}

export interface BidAlertData {
  userEmail: string;
  userName: string;
  nftName: string;
  nftImage: string;
  bidAmount: string;
  currentHighestBid?: string;
  auctionEndDate: Date;
  bidderName: string;
}

export interface MarketplaceAnnouncementData {
  userEmail: string;
  userName: string;
  subject: string;
  announcementTitle: string;
  announcementContent: string;
  actionUrl?: string;
  actionText?: string;
}

export interface PasswordResetData {
  userEmail: string;
  userName: string;
  resetToken: string;
  resetUrl: string;
  expiryTime: Date;
}

export interface EmailTemplate {
  templateId: string;
  dynamicData: Record<string, any>;
}

export interface SendEmailRequest {
  to: string;
  templateType: 'nftPurchase' | 'bidAlert' | 'marketplaceAnnouncement' | 'passwordReset';
  dynamicData: NFTPurchaseData | BidAlertData | MarketplaceAnnouncementData | PasswordResetData;
  subject?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WebhookEvent {
  email: string;
  timestamp: number;
  event: 'processed' | 'deferred' | 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe';
  reason?: string;
  status?: string;
  sg_event_id: string;
  sg_message_id: string;
  useragent?: string;
  ip?: string;
  url?: string;
  category?: string[];
}

export interface EmailStats {
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
  spamReports: number;
}

export interface PurchaseData {
  nftName: string;
  nftImageUrl: string;
  txHash: string;
  price: string | number;
  currency: string;
  txLink: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface PurchaseRequest {
  email: string;
  nftData: {
    name: string;
    image: string;
  };
  txData: {
    hash: string;
    value: string | number;
    currency?: string;
  };
}