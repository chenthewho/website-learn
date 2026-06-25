// 章节数据服务层：章节查询、访问可见性裁决（CONTRACT §4）、DTO 映射。
// 访问控制的唯一裁决点之一：canReadChapter 决定某 principal 是否可读某章。
import { query, queryOne } from '../db';
import type { UserRow } from './userService';
import type { ChapterMeta } from '../../../shared/types';

/** chapters 表行结构（与 schema.sql 一一对应；布尔列以 0/1 的 number 表达）。 */
export interface ChapterRow {
  id: number;
  section_order: number;
  section_title: string;
  slug: string;
  title: string;
  order_index: number;
  /** 0/1：是否免费试读（仅 order_index=0 的章为 1）。 */
  is_free: number;
  word_count: number;
  /** 原始 Markdown 全文（仅后端持有；列表查询会以空串占位以省流量）。 */
  content: string;
  updated_at: Date;
}

/** 列表场景所需的元信息列（刻意排除 content 大字段）。 */
const META_COLUMNS =
  'id, section_order, section_title, slug, title, order_index, is_free, word_count, updated_at';

/**
 * 列出全部章节，按 order_index 升序。
 * 用于目录/卡片展示，故不取 content 大字段以省流量；
 * 以 '' 作为 content 占位，保持返回值符合 ChapterRow 形状（类型诚实，传输量可忽略）。
 * 需要正文时请改用 getChapterById()。
 */
export async function listChapters(): Promise<ChapterRow[]> {
  return query<ChapterRow>(
    `SELECT ${META_COLUMNS}, '' AS content FROM chapters ORDER BY order_index ASC`
  );
}

/** 按主键 id 查询单章全量信息（含 content 正文）；不存在返回 null。 */
export async function getChapterById(id: number): Promise<ChapterRow | null> {
  return queryOne<ChapterRow>(
    `SELECT ${META_COLUMNS}, content FROM chapters WHERE id = ? LIMIT 1`,
    [id]
  );
}

/**
 * 访问裁决（CONTRACT §4，服务端唯一权威）：
 * - 免费章（is_free===1）：任何人（未登录/guest/user）皆可读；
 * - 否则：仅当 principal.typ==='user' 且其 user.has_access===1 时可读；
 *   guest 与未解锁 user、未登录请求一律不可读。
 */
export function canReadChapter(
  row: ChapterRow,
  principal: { typ: 'user' | 'guest'; user?: UserRow } | undefined
): boolean {
  if (row.is_free === 1) {
    return true;
  }
  return principal?.typ === 'user' && principal.user?.has_access === 1;
}

/**
 * 将 ChapterRow 映射为对外的 ChapterMeta（不含正文）。
 * canRead 由调用方先用 canReadChapter 算出；locked = !canRead。
 */
export function toChapterMeta(row: ChapterRow, canRead: boolean): ChapterMeta {
  return {
    id: row.id,
    sectionOrder: row.section_order,
    sectionTitle: row.section_title,
    slug: row.slug,
    title: row.title,
    orderIndex: row.order_index,
    isFree: row.is_free === 1,
    locked: !canRead,
    wordCount: row.word_count,
  };
}
