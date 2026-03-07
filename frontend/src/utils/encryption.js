import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// Generate a new Curve25519 keypair for E2EE
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    privateKey: util.encodeBase64(keyPair.secretKey)
  };
};

// Encrypt a message using our private key and their public key
export const encryptMessage = (message, myPrivateKeyBase64, theirPublicKeyBase64) => {
  if (!myPrivateKeyBase64 || !theirPublicKeyBase64) return message;
  
  const ephemeralKeyPair = nacl.box.keyPair();
  let nonce, messageUint8, encrypted;
  
  try {
    const mySecretKey = util.decodeBase64(myPrivateKeyBase64);
    const theirPublicKey = util.decodeBase64(theirPublicKeyBase64);
    
    // Create a one-time nonce
    nonce = nacl.randomBytes(nacl.box.nonceLength);
    messageUint8 = util.decodeUTF8(message);
    
    encrypted = nacl.box(messageUint8, nonce, theirPublicKey, mySecretKey);
  } catch(e) {
    console.warn("E2EE Encryption failed, falling back to plaintext:", e);
    return message;
  }
  
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return util.encodeBase64(fullMessage);
};

// Decrypt a message using our private key and their public key
export const decryptMessage = (messageWithNonceBase64, myPrivateKeyBase64, theirPublicKeyBase64) => {
  if (!myPrivateKeyBase64 || !theirPublicKeyBase64) return messageWithNonceBase64;
  
  try {
    const messageWithNonceAsUint8Array = util.decodeBase64(messageWithNonceBase64);
    const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength);
    const message = messageWithNonceAsUint8Array.slice(nacl.box.nonceLength, messageWithNonceBase64.length);

    const mySecretKey = util.decodeBase64(myPrivateKeyBase64);
    const theirPublicKey = util.decodeBase64(theirPublicKeyBase64);

    const decrypted = nacl.box.open(message, nonce, theirPublicKey, mySecretKey);

    if (!decrypted) {
      throw new Error("Could not decrypt message");
    }

    return util.encodeUTF8(decrypted);
  } catch (e) {
    // If it fails to decode base64 or decrypt, it might just be a legacy plaintext message
    return messageWithNonceBase64;
  }
};
