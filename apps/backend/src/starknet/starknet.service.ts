import { Injectable } from '@nestjs/common';
import { RpcProvider, Account, Contract, json } from 'starknet';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StarknetService {
  private provider: RpcProvider | null = null;
  private account: Account | null = null;
  private contract: Contract | null = null;
  private isMockMode: boolean;

  constructor() {
    this.isMockMode = process.env.STARKNET_MOCK_MODE === 'true';

    if (!this.isMockMode) {
      const rpcUrl = process.env.STARKNET_RPC_URL!;
      const privateKey = process.env.STARKNET_PRIVATE_KEY!;
      const address = process.env.STARKNET_ACCOUNT_ADDRESS!;
      const contractAddress = process.env.STARKNET_CONTRACT_ADDRESS!;

      this.provider = new RpcProvider({ nodeUrl: rpcUrl });

      this.account = new Account(this.provider, address, privateKey);

      const abiPath = path.join(__dirname, 'abis/nft_contract.abi.json');
      const abi = json.parse(fs.readFileSync(abiPath, 'utf-8'));

      this.contract = new Contract(abi, contractAddress, this.account);
    } else {
      console.log('[StarknetService] Running in MOCK mode.');
    }
  }

  async mint(toAddress: string, tokenId: string) {
    if (this.isMockMode) {
      console.log(`[MOCK] Minting token ${tokenId} to ${toAddress}`);
      return {
        transaction_hash: `mock_tx_hash_${Date.now()}`,
        mock: true,
      };
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.invoke('mint', [toAddress, tokenId]);
      return { transaction_hash: tx.transaction_hash };
    } catch (error: any) {
      throw new Error(`Minting failed: ${error.message}`);
    }
  }

  async getOwnerOf(tokenId: string) {
    if (this.isMockMode) {
      console.log(`[MOCK] Getting owner of token ${tokenId}`);
      return `0xMockOwnerForToken${tokenId}`;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await this.contract.call('ownerOf', [tokenId]);

      if (typeof result === 'string' || typeof result === 'bigint') {
        return result.toString();
      }

      if (Array.isArray(result)) {
        return result[0]?.toString?.() || '0x0';
      }

      if (typeof result === 'object' && result !== null && 'owner' in result) {
        return (result as any).owner.toString();
      }

      throw new Error(
        `Unexpected format for contract response: ${JSON.stringify(result)}`,
      );
    } catch (error: any) {
      throw new Error(`Ownership check failed: ${error.message}`);
    }
  }
}
