import { customAlphabet } from 'nanoid';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I to avoid ambiguity
const nano = customAlphabet(ALPHABET, 8);

export function generateReferralCode(): string {
  return `AGT${nano().slice(0, 6)}`;
}

export function generateReceiptCode(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RCT${stamp}${nano().slice(0, 5)}`;
}

export function generateBatchCode(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BATCH${stamp}${nano().slice(0, 4)}`;
}
