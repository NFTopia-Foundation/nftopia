import { ec, hash, stark } from 'starknet';
import { ethers } from 'ethers';

export class SignatureUtil {
  /**
   * Verify a StarkNet signature
   */
  static async verifyStarkNetSignature(
    message: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    try {
      // Create hash of the message
      const messageHash = hash.starknetKeccak(message);
      
      // Convert the messageHash to Hex string format
      const messageHashHex = '0x' + messageHash.toString(16);
      
      // For StarkNet v6.24.1, we need to pass the signature as a Hex
      // Parse the signature first
      let signatureHex: string;
      
      if (signature.includes(',')) {
        // If the signature is in r,s format, we need to convert it to a single hex
        const [r, s] = signature.split(',').map(part => part.trim());
        // Remove '0x' prefix if present
        const rClean = r.startsWith('0x') ? r.slice(2) : r;
        const sClean = s.startsWith('0x') ? s.slice(2) : s;
        // Combine r and s into a single hex string
        signatureHex = '0x' + rClean + sClean;
      } else {
        // If it's already a single hex string
        signatureHex = signature.startsWith('0x') ? signature : '0x' + signature;
      }
      
      // Make sure publicKey is in hex format
      const pubKeyHex = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;
      
      // Call verify with the correct types (all Hex strings)
      return ec.starkCurve.verify(signatureHex, messageHashHex, pubKeyHex);
    } catch (error) {
      console.error('Error verifying StarkNet signature:', error);
      return false;
    }
  }

  /**
   * Verify an Ethereum signature
   */
  static async verifyEthereumSignature(
    message: string,
    signature: string,
    address: string,
  ): Promise<boolean> {
    try {
      // Create Ethereum signed message hash
      const msgHash = ethers.hashMessage(message);
      
      // Recover the address from signature
      const recoveredAddress = ethers.recoverAddress(msgHash, signature);
      
      // Compare with provided address (case-insensitive)
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Error verifying Ethereum signature:', error);
      return false;
    }
  }
}



// import { ec, hash, number, stark } from 'starknet';
// import { ethers } from 'ethers';

// export class SignatureUtil {
//   /**
//    * Verify a StarkNet signature
//    */
//   static async verifyStarkNetSignature(
//     message: string,
//     signature: string,
//     address: string,
//   ): Promise<boolean> {
//     try {
//       // Create hash of the message
//       const messageHash = hash.starknetKeccak(message);
      
//       // Parse the signature
//       const { r, s } = stark.signatureToDecimalString(signature);
      
//       // Verify signature
//       return stark.verifySignature(
//         messageHash,
//         r,
//         s,
//         address
//       );
//     } catch (error) {
//       console.error('Error verifying StarkNet signature:', error);
//       return false;
//     }
//   }

//   /**
//    * Verify an Ethereum signature
//    */
//   static async verifyEthereumSignature(
//     message: string,
//     signature: string,
//     address: string,
//   ): Promise<boolean> {
//     try {
//       // Create Ethereum signed message hash
//       const msgHash = ethers.hashMessage(message);
      
//       // Recover the address from signature
//       const recoveredAddress = ethers.recoverAddress(msgHash, signature);
      
//       // Compare with provided address (case-insensitive)
//       return recoveredAddress.toLowerCase() === address.toLowerCase();
//     } catch (error) {
//       console.error('Error verifying Ethereum signature:', error);
//       return false;
//     }
//   }
// }