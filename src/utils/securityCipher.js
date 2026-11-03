/**
 * Mourato & Associados - Módulo de Blindagem Criptográfica de Dados Sensíveis
 * Ofuscação e Proteção contra Leitura em Texto Claro no LocalStorage / Cache de Navegador
 */

const CIPHER_SALT = 'MA_PERICIA_CRED_SEC_2026';

export const encryptSecret = (text) => {
  if (!text || typeof text !== 'string') return text || '';
  if (text.startsWith('__enc_v1__:')) return text; // Já encriptado

  try {
    const chars = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i) ^ CIPHER_SALT.charCodeAt(i % CIPHER_SALT.length);
      chars.push(String.fromCharCode(code));
    }
    const encoded = btoa(unescape(encodeURIComponent(chars.join(''))));
    return `__enc_v1__:${encoded}`;
  } catch (err) {
    return text;
  }
};

export const decryptSecret = (cipherText) => {
  if (!cipherText || typeof cipherText !== 'string') return cipherText || '';
  if (!cipherText.startsWith('__enc_v1__:')) return cipherText; // Retorna texto puro legado

  try {
    const rawBase64 = cipherText.replace('__enc_v1__:', '');
    const decodedStr = decodeURIComponent(escape(atob(rawBase64)));
    const plain = [];
    for (let i = 0; i < decodedStr.length; i++) {
      const code = decodedStr.charCodeAt(i) ^ CIPHER_SALT.charCodeAt(i % CIPHER_SALT.length);
      plain.push(String.fromCharCode(code));
    }
    return plain.join('');
  } catch (err) {
    return cipherText;
  }
};
