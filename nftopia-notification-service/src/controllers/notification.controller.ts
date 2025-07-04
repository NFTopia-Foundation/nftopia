import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { PurchaseRequest, PurchaseData } from '../types/email';

export const sendPurchaseEmail = async (
  req: Request<{}, {}, PurchaseRequest>,
  res: Response
) => {
  try {
    const { email, nftData, txData } = req.body;
    
    const purchaseData: PurchaseData = {
      nftName: nftData.name,
      nftImageUrl: nftData.image,
      txHash: txData.hash,
      price: txData.value,
      currency: txData.currency || 'ETH',
      txLink: `https://etherscan.io/tx/${txData.hash}`
    };

    await new EmailService().sendPurchaseConfirmation(email, purchaseData);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
};