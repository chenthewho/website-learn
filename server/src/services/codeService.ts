// 兑换码数据服务层：兑换码的校验与兑换（事务 + 行级锁，保证并发安全）。
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { withTransaction } from '../db';

/** redemption_codes 表行结构（与 schema.sql 一一对应）。 */
interface CodeRow extends RowDataPacket {
  id: number;
  code: string;
  max_uses: number;
  used_count: number;
  note: string;
  /** NULL=永不过期。 */
  expires_at: Date | null;
  created_at: Date;
}

/** 兑换结果：成功，或带稳定错误码的失败（错误码集合见 CONTRACT §4）。 */
export type RedeemResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'INVALID_CODE'
        | 'CODE_EXHAUSTED'
        | 'CODE_EXPIRED'
        | 'ALREADY_HAS_ACCESS';
    };

/** 规范化用户输入的兑换码：去首尾空白并转大写（与 DB 中存储形式对齐）。 */
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * 兑换码兑换（事务化、并发安全）。
 *
 * 事务内步骤：
 * 1) 规范化 code，`SELECT ... FOR UPDATE` 锁定码行，防止并发超发；
 * 2) 不存在 → INVALID_CODE；
 * 3) 已过期（expires_at 非 NULL 且 <= 现在）→ CODE_EXPIRED；
 * 4) 已用尽（used_count >= max_uses）→ CODE_EXHAUSTED；
 * 5) `SELECT ... FOR UPDATE` 锁定用户行，若 has_access 已为 1 → ALREADY_HAS_ACCESS
 *    （锁用户行可串行化同一用户的并发兑换，避免重复消耗码次数）；
 * 6) used_count+1、插入 redemptions（uniq_code_user 唯一约束兜底防重复）、users.has_access=1。
 *
 * 任一失败分支返回失败结果（事务自然提交，但因未做写操作不产生副作用）；
 * 抛出的异常由 withTransaction 回滚。
 */
export async function redeemCode(
  userId: number,
  rawCode: string
): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);

  return withTransaction<RedeemResult>(async (conn) => {
    // 1) 锁码行
    const [codeRows] = await conn.query<CodeRow[]>(
      'SELECT id, code, max_uses, used_count, note, expires_at, created_at FROM redemption_codes WHERE code = ? FOR UPDATE',
      [code]
    );
    const codeRow = codeRows[0];

    // 2) 不存在
    if (!codeRow) {
      return { ok: false, code: 'INVALID_CODE' };
    }

    // 3) 已过期（NULL 表示永不过期）
    if (
      codeRow.expires_at !== null &&
      new Date(codeRow.expires_at).getTime() <= Date.now()
    ) {
      return { ok: false, code: 'CODE_EXPIRED' };
    }

    // 4) 次数耗尽
    if (codeRow.used_count >= codeRow.max_uses) {
      return { ok: false, code: 'CODE_EXHAUSTED' };
    }

    // 5) 锁用户行并判断是否已解锁
    const [userRows] = await conn.query<(RowDataPacket & { has_access: number })[]>(
      'SELECT has_access FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    const userRow = userRows[0];
    if (!userRow) {
      // 用户不存在：requireUser 已保证存在，此处兜底视为非法兑换主体
      return { ok: false, code: 'INVALID_CODE' };
    }
    if (userRow.has_access === 1) {
      return { ok: false, code: 'ALREADY_HAS_ACCESS' };
    }

    // 6) 落库：码次数 +1、记录兑换流水、置用户解锁
    await conn.execute<ResultSetHeader>(
      'UPDATE redemption_codes SET used_count = used_count + 1 WHERE id = ?',
      [codeRow.id]
    );
    await conn.execute<ResultSetHeader>(
      'INSERT INTO redemptions (code_id, user_id) VALUES (?, ?)',
      [codeRow.id, userId]
    );
    await conn.execute<ResultSetHeader>(
      'UPDATE users SET has_access = 1 WHERE id = ?',
      [userId]
    );

    return { ok: true };
  });
}
