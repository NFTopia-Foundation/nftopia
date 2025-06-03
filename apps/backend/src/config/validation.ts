// src/config/validation.ts
import * as Joi from 'joi';

export function validateEnv(config: Record<string, any>) {
  const schema = Joi.object({
    STARKNET_RPC_URL: Joi.string().uri().required(),
    STARKNET_CONTRACT_ADDRESS: Joi.string().required(),
    STARKNET_ACCOUNT_ADDRESS: Joi.string().required(),
    STARKNET_PRIVATE_KEY: Joi.string().required(),
    JWT_SECRET: Joi.string().required(), // Required for JWT protection
    PORT: Joi.number().default(3000), // Optional: default app port
  });

  const { error, value } = schema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw new Error(`❌ Environment validation error:\n${error.message}`);
  }

  return value;
}
