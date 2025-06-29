export const retryOptions = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 10000,
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH'],
};
