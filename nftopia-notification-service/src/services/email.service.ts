import sgMail from '@sendgrid/mail';
import { sendGridConfig, EmailTemplateKey } from '../config/email';

sgMail.setApiKey(sendGridConfig.apiKey);

export class EmailService {
  static async sendTemplateEmail(
    to: string,
    templateKey: EmailTemplateKey,
    dynamicData: Record<string, any>,
    notificationId?: string
  ): Promise<void> {
    const templateId = sendGridConfig.templates[templateKey];

    if (!templateId) {
      const availableKeys = Object.keys(sendGridConfig.templates).join(', ');
      throw new Error(
        `[EmailService] Invalid template key: "${templateKey}". Available keys: ${availableKeys}`
      );
    }

    const msg: any = {
      to,
      from: sendGridConfig.fromEmail,
      templateId,
      dynamicTemplateData: dynamicData,
      mailSettings: {
        sandboxMode: { enable: sendGridConfig.sandboxMode }
      },
    };

    if (notificationId) {
      msg.customArgs = { notificationId };
    }

    // Debug the payload we’re about to send
    console.log('[EmailService] about to send:', JSON.stringify({
      to: msg.to, from: msg.from, templateId: msg.templateId,
      hasDynamicData: !!msg.dynamicTemplateData, sandbox: sendGridConfig.sandboxMode,
      customArgs: msg.customArgs
    }, null, 2));

    try {
      await sgMail.send(msg);
      console.log(`[EmailService] Email sent to ${to} with "${templateKey}"`);
    } catch (err: any) {
      console.error('[EmailService] Error sending email:', err.response?.body?.errors || err.message);
      throw new Error('Email sending failed');
    }
  }
}


//Test with curl
// curl -X POST http://localhost:9001/api/notifications   -H "Content-Type: application/json"   -d '{
//   "userId": "user-123",
//   "type": "sale",
//   "content": "Your CryptoCat #42 has been sold for 3.5 STRK!",
//   "channels": ["email"],
//   "userEmail": "deextralucid@gmail.com",
//   "metadata": {
//     "nftId": "nft-42",
//     "txHash": "0x123abc",
//     "price": "3.5 STRK",
//     "nftName": "CryptoCat #42"
//   }
// }'

///Reponse from curl
///{"userId":"user-123","type":"sale","status":"pending","content":"Your CryptoCat #42 has been sold for 3.5 ETH!","channels":["email"],"metadata":{"nftId":"nft-42","txHash":"0x123abc"},"_id":"68a65c4e45316975de9eabf9","createdAt":"2025-08-20T23:37:50.977Z","updatedAt":"2025-08-20T23:37:50.977Z","__v":0}