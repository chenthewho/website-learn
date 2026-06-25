/**
 * 手动授予访问权限脚本（CONTRACT §8，便于测试）。
 *
 * 用法：
 *   npm run grant-access -- user@example.com
 *   npm run grant-access -- --email user@example.com
 *
 * 按 email 找到用户并置 has_access=1；找不到用户则报错退出（非零退出码）。
 */
import { pool, queryOne, execute } from '../db';

/** users 表的精简投影。 */
interface UserRow {
  id: number;
  email: string;
  has_access: number;
}

/** 从命令行解析目标邮箱：支持位置参数或 `--email <值>` / `--email=<值>`。 */
function parseEmail(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--email') {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        return next.trim();
      }
    } else if (token.startsWith('--email=')) {
      return token.slice('--email='.length).trim();
    } else if (!token.startsWith('--')) {
      // 首个非旗标 token 视为位置参数 email
      return token.trim();
    }
  }
  return '';
}

async function main(): Promise<void> {
  const email = parseEmail(process.argv.slice(2));
  if (email === '') {
    throw new Error('请提供用户邮箱，例如：npm run grant-access -- user@example.com');
  }

  const user = await queryOne<UserRow>(
    'SELECT id, email, has_access FROM users WHERE email = ?',
    [email]
  );
  if (user === null) {
    throw new Error(`未找到邮箱为 ${email} 的用户。`);
  }

  if (user.has_access === 1) {
    console.log(`[grant-access] 用户 #${user.id} ${user.email} 已是解锁状态，无需变更。`);
    return;
  }

  await execute('UPDATE users SET has_access = 1 WHERE id = ?', [user.id]);
  console.log(`[grant-access] 已为用户 #${user.id} ${user.email} 授予全册访问权限（has_access=1）。`);
}

main()
  .catch((err: unknown) => {
    console.error('[grant-access] 失败：', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
