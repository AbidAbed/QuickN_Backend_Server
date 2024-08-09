// encryptionUtils.js

const sodium = require('libsodium-wrappers');

// Function to generate a secret key
const generateEncryptionKey = async () => {
  await sodium.ready;
  return sodium.crypto_secretbox_keygen();
};

// Function to encrypt a message
const encryptMessage = async (message) => {
  try {
    if (typeof message !== 'string') {
      throw new TypeError('Message must be a string');
    }

    await sodium.ready;
    const key = sodium.crypto_secretbox_keygen();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);
    return { ciphertext, nonce };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
};




// Function to decrypt a message
const decryptMessage = async (encryptedMessage, key) => {
  try {
    await sodium.ready;
    const nonce = encryptedMessage.nonce;
    const ciphertext = encryptedMessage.ciphertext;
    const decryptedText = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    return decryptedText;
  } catch (error) {
    throw new Error('Decryption failed');
  }
};

module.exports = { generateEncryptionKey, encryptMessage, decryptMessage };
