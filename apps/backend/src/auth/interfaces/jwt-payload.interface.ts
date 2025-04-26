export interface JwtPayload {
    sub: string;     // Subject (user ID)
    address: string; // Wallet address
    iat?: number;    // Issued at
    exp?: number;    // Expiration time
  }