import { htmlToText } from 'html-to-text';
import app from '../app';
import { PurchaseData } from '../types/email';
import nodemailer from 'nodemailer';

export class EmailService {

async sendPurchaseConfirmation(email: string, data: PurchaseData) {
    try {
      const html = await this.renderTemplate('purchase-confirmation/html', {
        ...data,
        theme: 'dark',
        txHashShort: data.txHash.substring(0, 12) + '...',
      });
  
      // Now html is properly typed as string
      const text = htmlToText(html);
  
      return this.sendEmail({
        to: email,
        subject: `NFT Purchase Confirmation: ${data.nftName}`,
        html,
        text,
      });
    } catch (error) {
      console.error('Template rendering failed:', error);
      throw new Error('Failed to generate email content');
    }
  }



private async renderTemplate(template: string, data: object): Promise<string> {
    return new Promise((resolve, reject) => {
      app.render(template, data, (err, html) => {
        if (err) reject(err);
        resolve(html);
      });
    });
  }


  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // Implementation using nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: '"NFTopia" <noreply@nftopia.com>',
        ...options,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

}