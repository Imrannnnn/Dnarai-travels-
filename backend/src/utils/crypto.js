import crypto from 'crypto';
import { env } from '../config/env.js';

function getKey() {
  if (!env.DOC_ENCRYPTION_KEY_BASE64) {
    throw new Error('Missing DOC_ENCRYPTION_KEY_BASE64');
  }
  const key = Buffer.from(env.DOC_ENCRYPTION_KEY_BASE64, 'base64');
  if (key.length !== 32) {
    throw new Error('DOC_ENCRYPTION_KEY_BASE64 must decode to 32 bytes');
  }
  return key;
}

export function encryptSensitive(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptSensitive(payload) {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = String(payload).split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString('utf8');
}

export function maskLast4(last4) {
  const v = String(last4 || '');
  const end = v.slice(-4);
  if (!end) return '****';
  return `**** **** **** ${end}`;
}
