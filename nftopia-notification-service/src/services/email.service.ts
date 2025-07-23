import { htmlToText } from 'html-to-text';
import app from '../app';
import { generateToken } from '../utils/token';
import { PurchaseData } from '../types/email';
import nodemailer from 'nodemailer';
import config from '../config/env'; // Import config

export class EmailService {
  private transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  async sendPurchaseConfirmation(email: string, data: PurchaseData) {
    try {
      const html = await this.renderTemplate('purchase-confirmation/html', {
        ...data,
        theme: 'dark',
        txHashShort: data.txHash.substring(0, 12) + '...',
      });

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
        resolve(html || ''); // Ensure we always return a string
      });
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"NFTopia" <${process.env.EMAIL_FROM || 'noreply@nftopia.com'}>`,
        ...options,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendEmailWithUnsubscribe(options: {
    to: string;
    template: string;
    subject?: string;  // Add this line
    isCritical?: boolean;
    isTransactional?: boolean;
  }) {
    const unsubscribeToken = generateToken({
      email: options.to,
      notificationType: options.template
    });

    const unsubscribeUrl = `${config.BASE_URL}/unsubscribe/${unsubscribeToken}`;
    const preferenceCenterUrl = `${config.BASE_URL}/preferences/${unsubscribeToken}`;

    const html = await this.renderTemplate(options.template, { // Fixed: using this.renderTemplate
      ...options,
      unsubscribeUrl,
      preferenceCenterUrl
    });

    const text = htmlToText(html);

    return this.sendEmail({
      to: options.to,
      subject: options.subject || 'Notification from NFTopia',
      html,
      text,
    });
  }
}
