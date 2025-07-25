import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { NFTStorage, File } from 'nft.storage';
import fileType from 'file-type';
import { NFTMetadata } from '../interfaces/NFTMetadata';
import { nftStorageConfig } from './nftstorage.config';

// Custom error classes for better error handling
export class InvalidApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidApiKeyError';
  }
}

export class ServiceNotInitializedError extends Error {
  constructor() {
    super('NFT Storage service not initialized');
    this.name = 'ServiceNotInitializedError';
  }
}

@Injectable()
export class NftStorageService implements OnModuleInit {
  private readonly logger = new Logger(NftStorageService.name);
  private client: NFTStorage;
  private isInitialized = false;

  constructor() {
    this.validateApiKey(nftStorageConfig.apiKey);
  }

  onModuleInit() {
    this.initializeClient();
  }

  /**
   * Validates the API key format (40-character alphanumeric)
   * @throws InvalidApiKeyError if key is malformed
   */
  private validateApiKey(key: string): boolean {
    const isValid = /^[a-zA-Z0-9]{40}$/.test(key);
    if (!isValid) {
      throw new InvalidApiKeyError(
        'Invalid NFT.Storage API key format. Expected 40-character alphanumeric string',
      );
    }
    return true;
  }

  /**
   * Initializes the NFT.Storage client after validating the API key
   */
  private initializeClient(): void {
    try {
      this.validateApiKey(nftStorageConfig.apiKey);
      this.client = new NFTStorage({ token: nftStorageConfig.apiKey });
      this.isInitialized = true;
      this.logger.log('NFT.Storage client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize NFT.Storage client', error.stack);
      throw error;
    }
  }

  /**
   * Checks if the service is properly initialized and API key is valid
   */
  public async checkHealth(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // Simple request to validate the API key works
      await this.client.status();
      return true;
    } catch (error) {
      this.logger.warn('API key health check failed', error.stack);
      return false;
    }
  }

  async uploadToIPFS(buffer: Buffer, fileName: string, metadata: NFTMetadata) {
    if (!this.isInitialized) {
      throw new ServiceNotInitializedError();
    }

    this.logger.debug(`Starting IPFS upload for file: ${fileName}`);

    try {
      const fileTypeResult = await fileType.fromBuffer(buffer);
      if (!fileTypeResult) {
        throw new Error('Could not determine file type');
      }

      const imageFile = new File([buffer], fileName, { type: fileTypeResult.mime });

      this.logger.debug(`Storing metadata for NFT: ${metadata.name}`);
      const meta = await this.client.store({
        name: metadata.name,
        description: metadata.description,
        image: imageFile,
        attributes: metadata.attributes,
      });

      this.logger.log(`Successfully uploaded NFT to IPFS: ${meta.url}`);
      return meta.url;
    } catch (error) {
      this.logger.error(`Failed to upload to IPFS: ${error.message}`, error.stack);
      throw new Error(`NFT storage failed: ${error.message}`);
    }
  }
}