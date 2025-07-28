import { Logger, Inject } from '@nestjs/common';
import { RpcProvider, SequencerProvider, Contract } from 'starknet';
import { blockchainConfig } from '../../config/blockchain.config';
import { IEventsService, EVENTS_SERVICE } from '../../events/interfaces/events-service.interface';

export abstract class BaseListener {
  protected readonly logger: Logger;
  protected provider: RpcProvider | SequencerProvider; // Use concrete types instead of interface
  protected contract: Contract;
  protected failureCount = 0;
  protected circuitOpen = false;
  protected maxFailures = 5;
  protected resetTimeout = 10000; // Remove readonly to allow testing override
  protected lastProcessedBlock = 0;
  protected isListening = false;
  protected eventsService?: IEventsService; // Make it protected so subclasses can access

  // Performance monitoring
  private eventProcessingTimes: number[] = [];
  private readonly maxPerformanceHistory = 1000;

  constructor(
    protected contractName: string,
    protected contractAddress: string,
    protected contractAbi: any,
    @Inject(EVENTS_SERVICE) eventsService?: IEventsService,
  ) {
    this.logger = new Logger(`${contractName}Listener`);
    this.eventsService = eventsService;
    this.initializeProvider();
    this.initializeContract();
  }

  private initializeProvider(): void {
    try {
      // Use RPC provider for better performance
      this.provider = new RpcProvider({
        nodeUrl: blockchainConfig.starknetRpcUrl,
      });

      // Test the provider connection
      this.testProviderConnection();
    } catch (error) {
      this.logger.error(
        'Failed to initialize RPC provider, falling back to sequencer',
        error,
      );
      try {
        // Fallback to sequencer provider if RPC fails
        this.provider = new SequencerProvider({
          baseUrl: blockchainConfig.starknetSequencerUrl,
        });
      } catch (fallbackError) {
        this.logger.error('Failed to initialize any provider', fallbackError);
        throw fallbackError;
      }
    }
  }

  private async testProviderConnection(): Promise<void> {
    try {
      // Test the connection by getting the latest block
      if (this.provider instanceof RpcProvider) {
        await this.provider.getBlockWithTxHashes('latest');
      } else {
        await (this.provider as any).getBlock('latest');
      }
      this.logger.log(`Successfully connected to StarkNet provider`);
    } catch (error) {
      this.logger.warn('Provider connection test failed', error);
    }
  }

  private initializeContract(): void {
    try {
      this.contract = new Contract(
        this.contractAbi,
        this.contractAddress,
        this.provider,
      );
    } catch (error) {
      this.logger.error('Failed to initialize contract', error);
      throw error;
    }
  }

  protected async processEvent(event: any): Promise<void> {
    if (this.circuitOpen) {
      this.logger.warn('Circuit breaker open, skipping event processing');
      return;
    }

    const startTime = Date.now();

    try {
      if (!this.validateEvent(event)) {
        this.logger.warn('Event validation failed', {
          event,
          contractName: this.contractName,
        });
        return;
      }

      await this.handleEvent(event);

      // Store processed event if EventsService is available
      if (this.eventsService) {
        await this.eventsService.create({
          contractName: this.contractName,
          eventName: event.name,
          eventData: event.data,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: new Date(),
        });
      }

      this.failureCount = 0; // Reset on success

      // Track performance
      const processingTime = Date.now() - startTime;
      this.trackPerformance(processingTime);

      if (processingTime > 500) {
        this.logger.warn(`Slow event processing: ${processingTime}ms`, {
          event: event.name,
          contractName: this.contractName,
        });
      }
    } catch (error) {
      this.failureCount++;
      this.logger.error('Event processing failed', {
        error: error.message,
        event,
        contractName: this.contractName,
        failureCount: this.failureCount,
      });

      if (this.failureCount >= this.maxFailures) {
        this.openCircuit();
      }

      // Implement exponential backoff retry
      await this.retryWithBackoff(event, this.failureCount);
    }
  }

  private trackPerformance(processingTime: number): void {
    this.eventProcessingTimes.push(processingTime);

    // Keep only recent performance data
    if (this.eventProcessingTimes.length > this.maxPerformanceHistory) {
      this.eventProcessingTimes.shift();
    }
  }

  public getPerformanceMetrics(): {
    avgProcessingTime: number;
    maxProcessingTime: number;
    eventsProcessed: number;
    slowEventsCount: number;
  } {
    if (this.eventProcessingTimes.length === 0) {
      return {
        avgProcessingTime: 0,
        maxProcessingTime: 0,
        eventsProcessed: 0,
        slowEventsCount: 0,
      };
    }

    const avg =
      this.eventProcessingTimes.reduce((a, b) => a + b, 0) /
      this.eventProcessingTimes.length;
    const max = Math.max(...this.eventProcessingTimes);
    const slowEvents = this.eventProcessingTimes.filter(
      (time) => time > 500,
    ).length;

    return {
      avgProcessingTime: Math.round(avg),
      maxProcessingTime: max,
      eventsProcessed: this.eventProcessingTimes.length,
      slowEventsCount: slowEvents,
    };
  }

  private async retryWithBackoff(
    event: any,
    attemptNumber: number,
  ): Promise<void> {
    if (attemptNumber >= 3) return; // Max 3 retries

    const backoffTime = Math.min(1000 * Math.pow(2, attemptNumber), 10000); // Max 10s

    this.logger.log(`Retrying event processing in ${backoffTime}ms`, {
      event: event.name,
      attempt: attemptNumber + 1,
    });

    setTimeout(async () => {
      try {
        await this.handleEvent(event);
        this.failureCount = Math.max(0, this.failureCount - 1); // Reduce failure count on retry success
      } catch (error) {
        this.logger.error(`Retry ${attemptNumber + 1} failed`, error);
      }
    }, backoffTime);
  }

  protected abstract validateEvent(event: any): boolean;
  protected abstract handleEvent(event: any): Promise<void>;

  private openCircuit(): void {
    this.circuitOpen = true;
    this.logger.error(
      `Circuit breaker opened for ${this.contractName} after ${this.maxFailures} failures`,
    );

    setTimeout(() => {
      this.circuitOpen = false;
      this.failureCount = 0;
      this.logger.log(`Circuit breaker reset for ${this.contractName}`);
    }, this.resetTimeout);
  }

  protected async recoverMissedEvents(
    fromBlock: number,
    toBlock: number,
  ): Promise<void> {
    this.logger.log(
      `Recovering missed events from block ${fromBlock} to ${toBlock}`,
    );

    try {
      // Get events in batches to avoid overwhelming the RPC
      const batchSize = blockchainConfig.maxBlockRange || 100;

      for (
        let currentBlock = fromBlock;
        currentBlock <= toBlock;
        currentBlock += batchSize
      ) {
        const endBlock = Math.min(currentBlock + batchSize - 1, toBlock);

        let eventsResponse: any;

        try {
          // Try RPC provider first
          if (this.provider instanceof RpcProvider) {
            eventsResponse = await this.provider.getEvents({
              from_block: { block_number: currentBlock },
              to_block: { block_number: endBlock },
              address: this.contractAddress,
              chunk_size: 100,
            });
          } else {
            // Fallback for SequencerProvider
            eventsResponse = await (this.provider as any).getEvents({
              from_block: currentBlock,
              to_block: endBlock,
              address: this.contractAddress,
            });
          }

          if (eventsResponse?.events) {
            for (const event of eventsResponse.events) {
              await this.processEvent({
                name: event.keys[0], // Event selector
                data: event.data,
                blockNumber: event.block_number,
                transactionHash: event.transaction_hash,
              });
            }
          }
        } catch (providerError) {
          this.logger.error('Failed to get events from provider', {
            error: providerError.message,
            fromBlock: currentBlock,
            toBlock: endBlock,
          });
        }

        // Small delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.lastProcessedBlock = toBlock;
      this.logger.log(`Successfully recovered events up to block ${toBlock}`);
    } catch (error) {
      this.logger.error(`Failed to recover missed events`, {
        error: error.message,
        fromBlock,
        toBlock,
      });
      throw error;
    }
  }

  // Real-time event listening using polling
  async listen(): Promise<void> {
    if (this.isListening) {
      this.logger.warn(`${this.contractName} listener is already running`);
      return;
    }

    this.isListening = true;
    this.logger.log(`Starting ${this.contractName} event listener...`);

    try {
      // Get current block number using the appropriate method
      let currentBlockNumber: number;

      if (this.provider instanceof RpcProvider) {
        const latestBlock = await this.provider.getBlockWithTxHashes('latest') as any;
        currentBlockNumber = latestBlock.block_number;
      } else {
        const latestBlock = await (this.provider as any).getBlock('latest') as any;
        currentBlockNumber = latestBlock.block_number;
      }

      if (this.lastProcessedBlock === 0) {
        this.lastProcessedBlock = currentBlockNumber;
      }

      // Recover any missed events since last processed block
      if (this.lastProcessedBlock < currentBlockNumber) {
        await this.recoverMissedEvents(
          this.lastProcessedBlock + 1,
          currentBlockNumber,
        );
      }

      // Start real-time event listening
      await this.startRealTimeListening();
    } catch (error) {
      this.logger.error(
        `Failed to start listener for ${this.contractName}`,
        error,
      );
      this.isListening = false;
      throw error;
    }
  }

  private async startRealTimeListening(): Promise<void> {
    // Use polling for now - ideally replace with WebSocket subscription when available
    const pollInterval = blockchainConfig.eventPollingInterval || 5000;

    const poll = async () => {
      if (!this.isListening) return;

      try {
        let currentBlockNumber: number;

        if (this.provider instanceof RpcProvider) {
          const latestBlock = await this.provider.getBlockWithTxHashes('latest') as any;
          currentBlockNumber = latestBlock.block_number;
        } else {
          const latestBlock = await (this.provider as any).getBlock('latest') as any;
          currentBlockNumber = latestBlock.block_number;
        }

        if (currentBlockNumber > this.lastProcessedBlock) {
          await this.recoverMissedEvents(
            this.lastProcessedBlock + 1,
            currentBlockNumber,
          );
        }
      } catch (error) {
        this.logger.error('Error during event polling', error);
        // Increment failure count for polling errors
        this.failureCount++;
        if (this.failureCount >= this.maxFailures) {
          this.openCircuit();
        }
      }

      // Schedule next poll only if still listening
      if (this.isListening) {
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);
  }

  async stop(): Promise<void> {
    this.isListening = false;
    this.logger.log(`Stopped ${this.contractName} event listener`);
  }

  // Health check method
  async healthCheck(): Promise<{
    isListening: boolean;
    lastProcessedBlock: number;
    circuitOpen: boolean;
    failureCount: number;
    performance: ReturnType<typeof this.getPerformanceMetrics>;
  }> {
    return {
      isListening: this.isListening,
      lastProcessedBlock: this.lastProcessedBlock,
      circuitOpen: this.circuitOpen,
      failureCount: this.failureCount,
      performance: this.getPerformanceMetrics(),
    };
  }
}
