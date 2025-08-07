import { keccak_256 } from '@noble/hashes/sha3';
import { verify, Signature } from '@scure/starknet';
import { typedData } from 'starknet';
import { bytesToHex } from '@noble/curves/abstract/utils';

// Starknet field prime: 2^251 + 17*2^192 + 1
const FIELD_PRIME = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');

// const { getMessageHash } = typedData;



/**
 * Validates that a message hash is within the valid Starknet field range.
 */
function validateMessageHash(msgHash: string): void {
  const hashBigInt = BigInt(msgHash);
  if (hashBigInt >= FIELD_PRIME) {
    throw new Error(`msgHash should be in range [0, ${FIELD_PRIME})`);
  }
  if (hashBigInt < 0n) {
    throw new Error('msgHash cannot be negative');
  }
}

/**
 * Creates a proper Starknet message hash that is guaranteed to be within field range.
 */
function createValidMessageHash(message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const keccakHash = keccak_256(messageBytes);
  const hashBigInt = BigInt('0x' + bytesToHex(keccakHash));
  
  // Ensure the hash is within the field prime by taking modulo
  const validHash = hashBigInt % FIELD_PRIME;
  return '0x' + validHash.toString(16);
}

/**
 * Converts r and s values into a 64-byte compact hex string for @scure/starknet.
 */
function toCompactSignatureHex(r: string, s: string): string {
  const rHex = BigInt(r).toString(16).padStart(64, '0');
  const sHex = BigInt(s).toString(16).padStart(64, '0');
  return '0x' + rHex + sHex;
}

/**
 * ✅ Verifies a raw message signature (Braavos-style)
 */
export function verifyRawMessageSignature(
  walletAddress: string,
  signature: [string, string],
  nonce: string
): boolean {
  try {
    // Create a valid message hash within Starknet field range
    const msgHashHex = createValidMessageHash(nonce);
    
    // Validate the message hash is within range (extra safety check)
    validateMessageHash(msgHashHex);
    
    const signatureHex = toCompactSignatureHex(signature[0], signature[1]);
    const pubKeyHex = '0x' + BigInt(walletAddress).toString(16);

    return verify(signatureHex, msgHashHex, pubKeyHex);
  } catch (err) {
    console.error('[verifyRawMessageSignature] Error:', err);
    
    // If it's a validation error, throw it with more context
    if (err instanceof Error && err.message.includes('msgHash should be')) {
      throw new Error(`Invalid message hash: ${err.message}`);
    }
    
    return false;
  }
}

/**
 * ✅ Verifies a typed data signature (ArgentX-style)
 */
export function verifyTypedDataSignature(
  address: string,
  typedData: any,
  signature: string[]
): boolean {
  try {
    // Ensure signature has exactly 2 elements (r, s)
    if (signature.length !== 2) {
      throw new Error('Signature must be an array of [r, s]');
    }

    // Convert to Signature object
    const sig = new Signature(
      BigInt(signature[0]),
      BigInt(signature[1])
    );

    // Convert to hex string
    const hexSig = bytesToHex(sig.toCompactRawBytes());

    return verify(address, typedData, hexSig);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}


