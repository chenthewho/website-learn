// 用户数据服务层：用户表的查询/创建/映射/解锁状态维护。
// 仅做数据访问与 DTO 映射，不含 HTTP/鉴权逻辑（那些在 routes / middleware 中）。
import { queryOne, execute } from '../db';
import { AppError } from '../http';
import type { PublicUser } from '../../../shared/types';

/** users 表行结构（与 schema.sql 一一对应；布尔列以 0/1 的 number 表达）。 */
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  /** 0/1：是否已用有效兑换码解锁全册。 */
  has_access: number;
  created_at: Date;
}

/** 统一的列清单：避免 `SELECT *` 带来的列漂移，且明确排除无关字段。 */
const USER_COLUMNS =
  'id, email, password_hash, display_name, has_access, created_at';

/** 按 email 精确查询用户；不存在返回 null（email 在库中唯一）。 */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
}

/** 按主键 id 查询用户；不存在返回 null。 */
export async function findUserById(id: number): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
}

/**
 * 创建用户并回读完整行返回。
 * 入参 passwordHash 必须为调用方（auth/password.ts）已哈希后的值，本层不做明文处理。
 * 若并发触发 email 唯一键冲突，转换为 AppError('EMAIL_TAKEN')（409），便于路由层直接透传。
 */
export async function createUser(
  email: string,
  passwordHash: string,
  displayName: string
): Promise<UserRow> {
  let insertId: number;
  try {
    const result = await execute(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
      [email, passwordHash, displayName]
    );
    insertId = result.insertId;
  } catch (err: unknown) {
    // mysql2 唯一键冲突错误码：ER_DUP_ENTRY
    if (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === 'ER_DUP_ENTRY'
    ) {
      throw new AppError('EMAIL_TAKEN', '该邮箱已被注册', 409);
    }
    throw err;
  }

  const created = await findUserById(insertId);
  if (!created) {
    // 理论不可达：刚插入即丢失，视为内部错误
    throw new AppError('INTERNAL', '用户创建后回读失败', 500);
  }
  return created;
}

/** 将内部 UserRow 映射为对外安全的 PublicUser（剔除 password_hash，0/1→boolean）。 */
export function toPublicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    hasAccess: u.has_access === 1,
  };
}

/** 设置用户解锁状态（兑换成功 / 管理脚本 grant-access 调用）。 */
export async function setUserAccess(userId: number, has: boolean): Promise<void> {
  await execute('UPDATE users SET has_access = ? WHERE id = ?', [
    has ? 1 : 0,
    userId,
  ]);
}
