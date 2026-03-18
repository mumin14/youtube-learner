import { randomBytes, pbkdf2 } from "crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";
const SALT_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex"));
    });
  });
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const hash = await new Promise<string>((resolve, reject) => {
    pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex"));
    });
  });
  // Constant-time comparison
  if (hash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
