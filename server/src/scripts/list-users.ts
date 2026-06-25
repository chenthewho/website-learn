/**
 * 用户清单脚本（CONTRACT §8）。
 *
 * 用法：
 *   npm run list-users
 *
 * 打印每个用户的 id / email / display_name / has_access / created_at，
 * 以及其兑换记录（兑换码 + 兑换时间，JOIN redemptions/redemption_codes）。
 */
import { pool, query } from '../db';

/** users 表的精简投影。 */
interface UserListRow {
  id: number;
  email: string;
  display_name: string;
  has_access: number;
  created_at: Date;
}

/** 兑换流水投影（含所用兑换码文本）。 */
interface RedemptionListRow {
  user_id: number;
  code: string;
  redeemed_at: Date;
}

/** 将 Date 格式化为可读的本地时间字符串。 */
function fmt(value: Date): string {
  // 直接交给 mysql2 解析出的 Date；若驱动返回字符串则原样输出
  return value instanceof Date ? value.toLocaleString('zh-CN') : String(value);
}

async function main(): Promise<void> {
  const users = await query<UserListRow>(
    `SELECT id, email, display_name, has_access, created_at
       FROM users
      ORDER BY id ASC`
  );

  if (users.length === 0) {
    console.log('[list-users] 暂无注册用户。');
    return;
  }

  // 一次性取出全部兑换记录，再按 user_id 分组（避免 N+1 查询）
  const redemptions = await query<RedemptionListRow>(
    `SELECT r.user_id AS user_id, rc.code AS code, r.redeemed_at AS redeemed_at
       FROM redemptions r
       JOIN redemption_codes rc ON rc.id = r.code_id
      ORDER BY r.redeemed_at ASC`
  );

  const byUser = new Map<number, RedemptionListRow[]>();
  for (const r of redemptions) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }

  console.log(`[list-users] 共 ${users.length} 个用户：\n`);
  for (const u of users) {
    const access = u.has_access === 1 ? '已解锁' : '未解锁';
    console.log(
      `#${u.id}  ${u.email}  (${u.display_name || '—'})  [${access}]  注册于 ${fmt(u.created_at)}`
    );
    const userRedemptions = byUser.get(u.id) ?? [];
    if (userRedemptions.length === 0) {
      console.log('     兑换记录：无');
    } else {
      for (const r of userRedemptions) {
        console.log(`     兑换：${r.code}  于 ${fmt(r.redeemed_at)}`);
      }
    }
    console.log('');
  }
}

main()
  .catch((err: unknown) => {
    console.error('[list-users] 失败：', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
