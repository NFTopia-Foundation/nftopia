export const smsTemplates = {
    bidAlert: (nftName: string, bidAmount: string) => 
      `New bid on ${nftName}: ${bidAmount}. Reply STOP to opt-out`,
    
    auctionWon: (nftName: string) =>
      `You won the auction for ${nftName}! Complete your purchase.`,
    
    twoFactor: (code: string) =>
      `Your NFTopia verification code: ${code}. Expires in 10 minutes.`,
    
    transactionConfirm: (txHash: string) =>
      `Transaction confirmed: ${txHash.substring(0, 8)}...`
  };