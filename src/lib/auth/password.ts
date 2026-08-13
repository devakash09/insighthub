import { hash, compare } from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}
