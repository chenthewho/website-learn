// 密码哈希与校验（bcryptjs）。cost=12（≥10，CONTRACT §10）。
import bcrypt from 'bcryptjs';

/** bcrypt 计算成本（轮数）。越大越慢越安全。 */
const SALT_ROUNDS = 12;

/** 对明文密码做 bcrypt 哈希，返回带盐的哈希串（可直接入库 password_hash）。 */
export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

/** 校验明文密码与库中哈希是否匹配。 */
export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
