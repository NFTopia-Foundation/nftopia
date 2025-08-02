// src/config/blockchain.config.ts
export const blockchainConfig = {
  // StarkNet RPC Configuration
  starknetRpcUrl:
    process.env.STARKNET_RPC_URL ||
    'https://starknet-mainnet.infura.io/v3/your-api-key',
  starknetSequencerUrl:
    process.env.STARKNET_SEQUENCER_URL || 'https://alpha-mainnet.starknet.io',

  // Contract Addresses (replace with actual addresses)
  nftContractAddress:
    process.env.NFT_CONTRACT_ADDRESS ||
    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  auctionContractAddress:
    process.env.AUCTION_CONTRACT_ADDRESS ||
    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc8',
  transactionContractAddress:
    process.env.TRANSACTION_CONTRACT_ADDRESS ||
    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc9',

  // Event Listener Configuration
  eventPollingInterval: parseInt(process.env.EVENT_POLLING_INTERVAL || '5000'), // 5 seconds
  maxBlockRange: parseInt(process.env.MAX_BLOCK_RANGE || '100'),

  // Performance and Reliability
  circuitBreakerThreshold: parseInt(
    process.env.CIRCUIT_BREAKER_THRESHOLD || '5',
  ),
  circuitBreakerTimeout: parseInt(
    process.env.CIRCUIT_BREAKER_TIMEOUT || '10000',
  ),
  maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),

  // Network Configuration
  networkId: process.env.STARKNET_NETWORK_ID || 'mainnet-alpha',
  chainId: process.env.STARKNET_CHAIN_ID || '0x534e5f4d41494e',

  // Rate Limiting
  rpcRequestsPerSecond: parseInt(process.env.RPC_REQUESTS_PER_SECOND || '10'),
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5'),

  // Event Processing
  batchSize: parseInt(process.env.EVENT_BATCH_SIZE || '100'),
  maxEventAge: parseInt(process.env.MAX_EVENT_AGE || '86400000'), // 24 hours in ms

  // Monitoring
  performanceMetricsEnabled: process.env.PERFORMANCE_METRICS_ENABLED === 'true',
  latencyThresholdMs: parseInt(process.env.LATENCY_THRESHOLD_MS || '500'),

  // Development/Testing
  isDevelopment: process.env.NODE_ENV === 'development',
  enableMockEvents: process.env.ENABLE_MOCK_EVENTS === 'true',
  mockEventInterval: parseInt(process.env.MOCK_EVENT_INTERVAL || '10000'),
};
