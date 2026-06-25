/**
 * 兑换码生成脚本（CONTRACT §8）。
 *
 * 用法：
 *   npm run gen-codes -- --count 20 --uses 1 --note "首发批次" --expires 2026-12-31
 *
 * 参数：
 *   --count   N            生成数量（默认 1，>=1）
 *   --uses    M            每个码最大可用次数 max_uses（默认 1，>=1）
 *   --note    "批次备注"    note（默认空串，<=120 字）
 *   --expires YYYY-MM-DD   过期日期（含当日，落库为该日 23:59:59；省略=永不过期）
 *
 * 码形如 `CLW-XXXX-XXXX-XXXX`，字符取自无歧义大写字母表（排除易混的 I/O/0/1）。
 * 批量写入 redemption_codes 并打印所有生成的码。
 */
import { customAlphabet } from 'nanoid';
import { pool, execute } from '../db';

/** 无歧义大写字母表：A-H、J-N、P-Z、2-9（剔除易混的 I、O、0、1）。 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** 每组生成 4 个字符。 */
const nanoidGroup = customAlphabet(CODE_ALPHABET, 4);

/** 解析后的命令行参数。 */
interface CliArgs {
  count: number;
  uses: number;
  note: string;
  /** DATETIME 字符串（如 `2026-12-31 23:59:59`）或 null（永不过期）。 */
  expiresAt: string | null;
}

/**
 * 极简命令行解析：支持 `--key value` 与 `--key=value` 两种写法。
 * 返回 key→value 的字典（仅取最后一次出现）。
 */
function parseRawArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const body = token.slice(2);
    const eqAt = body.indexOf('=');
    if (eqAt >= 0) {
      // --key=value 形式
      result[body.slice(0, eqAt)] = body.slice(eqAt + 1);
    } else {
      // --key value 形式：吞掉下一个非 -- 开头的 token 作为值
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        result[body] = next;
        i += 1;
      } else {
        result[body] = 'true'; // 布尔旗标
      }
    }
  }
  return result;
}

/** 解析正整数参数；非法时抛出友好错误。 */
function parsePositiveInt(raw: string | undefined, fallback: number, label: string): number {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < 1) {
    throw new Error(`参数 ${label} 必须为 >=1 的整数，当前值：${raw}`);
  }
  return value;
}

/** 解析过期日期：要求 YYYY-MM-DD 且为真实日期；返回当日 23:59:59 的 DATETIME 字符串。 */
function parseExpires(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  const text = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`参数 --expires 必须为 YYYY-MM-DD 格式，当前值：${raw}`);
  }
  const [y, m, d] = text.split('-').map((s) => Number.parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  const valid =
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  if (!valid) {
    throw new Error(`参数 --expires 不是合法日期：${raw}`);
  }
  return `${text} 23:59:59`;
}

/** 汇总解析命令行参数。 */
function parseArgs(): CliArgs {
  const raw = parseRawArgs(process.argv.slice(2));
  const note = (raw.note ?? '').slice(0, 120);
  return {
    count: parsePositiveInt(raw.count, 1, '--count'),
    uses: parsePositiveInt(raw.uses, 1, '--uses'),
    note,
    expiresAt: parseExpires(raw.expires),
  };
}

/** 生成一个形如 `CLW-XXXX-XXXX-XXXX` 的兑换码。 */
function generateCode(): string {
  return `CLW-${nanoidGroup()}-${nanoidGroup()}-${nanoidGroup()}`;
}

/**
 * 写入单个码；若与既有码冲突（UNIQUE 约束）则重试，最多若干次。
 * 返回最终成功写入的码。
 */
async function insertUniqueCode(
  args: CliArgs,
  maxRetry = 8
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetry; attempt += 1) {
    const code = generateCode();
    try {
      await execute(
        `INSERT INTO redemption_codes (code, max_uses, used_count, note, expires_at)
         VALUES (?, ?, 0, ?, ?)`,
        [code, args.uses, args.note, args.expiresAt]
      );
      return code;
    } catch (err: unknown) {
      // 仅在唯一键冲突时重试，其它错误直接抛出
      const dup =
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: string }).code === 'ER_DUP_ENTRY';
      if (!dup || attempt === maxRetry) {
        throw err;
      }
    }
  }
  // 理论不可达（循环内必然 return 或 throw）
  throw new Error('生成唯一兑换码失败：重试次数耗尽');
}

async function main(): Promise<void> {
  const args = parseArgs();
  console.log(
    `[gen-codes] 生成 ${args.count} 个码（max_uses=${args.uses}，note="${args.note}"，` +
      `expires=${args.expiresAt ?? '永不过期'}）`
  );

  const created: string[] = [];
  for (let i = 0; i < args.count; i += 1) {
    created.push(await insertUniqueCode(args));
  }

  console.log(`[gen-codes] 完成，生成的兑换码如下：`);
  for (const code of created) {
    console.log(`  ${code}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error('[gen-codes] 失败：', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
