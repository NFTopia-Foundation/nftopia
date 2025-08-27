import { RpcProvider, constants, type TypedData } from 'starknet';

// Configure RPC providers for different networks
const getProvider = (network: 'mainnet' | 'sepolia' = 'sepolia') => {
  const rpcUrls = {
    mainnet: 'https://starknet-mainnet.public.blastapi.io',
    sepolia: 'https://starknet-sepolia.public.blastapi.io',
  };

  return new RpcProvider({ nodeUrl: rpcUrls[network] });
};

// Get chain ID based on network
const getChainId = (network: 'mainnet' | 'sepolia' = 'sepolia') => {
  return network === 'mainnet'
    ? constants.StarknetChainId.SN_MAIN
    : constants.StarknetChainId.SN_SEPOLIA;
};

/**
 * ✅ Verifies a raw message signature (Braavos-style) using Starknet.js
 */
export async function verifyRawMessageSignature(
  walletAddress: string,
  signature: [string, string],
  nonce: string,
  network: 'mainnet' | 'sepolia' = 'sepolia',
): Promise<boolean> {
  try {
    const provider = getProvider(network);

    // Create typed data for the message
    const myTypedData: TypedData = {
      types: {
        StarkNetDomain: [
          { name: 'name', type: 'felt' },
          { name: 'version', type: 'felt' },
          { name: 'chainId', type: 'felt' },
        ],
        Message: [{ name: 'nonce', type: 'felt' }],
      },
      primaryType: 'Message',
      domain: {
        name: 'NFTopia',
        version: '1',
        chainId: getChainId(network),
      },
      message: { nonce },
    };

    // Verify using Starknet.js on-chain verification
    return await provider.verifyMessageInStarknet(
      myTypedData,
      signature,
      walletAddress,
    );
  } catch (err) {
    console.error('[verifyRawMessageSignature] Error:', err);
    return false;
  }
}

/**
 * ✅ Verifies a typed data signature (ArgentX-style) using Starknet.js
 */
export async function verifyTypedDataSignature(
  address: string,
  typedDataObj: TypedData,
  signature: string[],
  network: 'mainnet' | 'sepolia' = 'sepolia',
): Promise<boolean> {
  try {
    // Ensure signature has exactly 2 elements (r, s)
    if (signature.length !== 2) {
      throw new Error('Signature must be an array of [r, s]');
    }

    const provider = getProvider(network);

    // Verify using Starknet.js on-chain verification
    return await provider.verifyMessageInStarknet(
      typedDataObj,
      signature,
      address,
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
