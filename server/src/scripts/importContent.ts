/**
 * 内容导入脚本（CONTRACT §8）。
 *
 * 用法：
 *   npm run import                 # 读取 config.contentDir（默认课程 docs 绝对路径）
 *   CONTENT_DIR=/path npm run import
 *
 * 规则：
 *   - 遍历 contentDir 下一级子目录 `NN-篇名/`（排除根 README.md，及非 `NN-` 目录）。
 *   - 目录名 `00-前言` → section_order=0、section_title="前言"（按第一个 `-` 切分）。
 *   - 目录内 `.md` 文件按文件名升序；章 title 取文件首个 `# H1`，回退为去序号文件名。
 *   - slug = `<dir>__<filebase>`（保留中文，仅作唯一标识）。
 *   - 全局 order_index 按 (section_order, 文件序) 从 0 递增；is_free = (order_index===0)。
 *   - word_count：去除代码块后按中文字符 + 英文词粗估。
 *   - content：文件原始 Markdown 全文。
 *   - INSERT ... ON DUPLICATE KEY UPDATE（按 slug）实现幂等可重跑。
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { pool, withTransaction } from '../db';

/** 单个待导入章节的解析结果。 */
interface ParsedChapter {
  sectionOrder: number;
  sectionTitle: string;
  slug: string;
  title: string;
  orderIndex: number;
  isFree: boolean;
  wordCount: number;
  content: string;
}

/**
 * 粗略估算字数：先剔除围栏代码块与行内代码，再统计中文字符数 + 英文单词数之和。
 * 仅用于目录展示，精度要求不高。
 */
function estimateWordCount(markdown: string): number {
  const noCode = markdown
    .replace(/```[\s\S]*?```/g, ' ') // 围栏代码块
    .replace(/`[^`]*`/g, ' '); // 行内代码
  const chineseCount = (noCode.match(/[一-鿿]/g) ?? []).length;
  const englishWordCount = (noCode.match(/[A-Za-z]+/g) ?? []).length;
  return chineseCount + englishWordCount;
}

/**
 * 提取章标题：优先取文件首个 `# H1`（去掉前导 `#` 与首尾空白）；
 * 找不到时回退为去掉前导序号（如 `00-` 或 `项目1-`）的文件名。
 */
function extractTitle(markdown: string, fileBase: string): string {
  for (const line of markdown.split(/\r?\n/)) {
    const matched = line.match(/^#\s+(.+?)\s*$/);
    if (matched) {
      return matched[1].trim();
    }
  }
  return fileBase.replace(/^(?:项目)?\d+-/, '').trim() || fileBase;
}

/**
 * 扫描 contentDir，按规则解析出有序的章节列表（不写库）。
 */
function collectChapters(contentDir: string): ParsedChapter[] {
  if (!fs.existsSync(contentDir)) {
    throw new Error(`内容目录不存在：${contentDir}（请检查 CONTENT_DIR 配置）`);
  }

  // 一级子目录：仅保留目录、且目录名形如 `NN-篇名`
  const sectionDirs = fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^\d+-/.test(name))
    .sort();

  const chapters: ParsedChapter[] = [];
  let orderIndex = 0;

  for (const dirName of sectionDirs) {
    const dashAt = dirName.indexOf('-');
    const sectionOrder = Number.parseInt(dirName.slice(0, dashAt), 10);
    const sectionTitle = dirName.slice(dashAt + 1);

    const dirPath = path.join(contentDir, dirName);
    const mdFiles = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map((entry) => entry.name)
      .sort();

    for (const fileName of mdFiles) {
      const filePath = path.join(dirPath, fileName);
      const content = fs.readFileSync(filePath, 'utf8');
      const fileBase = path.basename(fileName, '.md');

      chapters.push({
        sectionOrder,
        sectionTitle,
        slug: `${dirName}__${fileBase}`,
        title: extractTitle(content, fileBase),
        orderIndex,
        isFree: orderIndex === 0,
        wordCount: estimateWordCount(content),
        content,
      });
      orderIndex += 1;
    }
  }

  return chapters;
}

/**
 * 将解析出的章节写入数据库（按 slug 幂等 upsert）。
 *
 * 由于 chapters 表对 order_index 也建有 UNIQUE 约束，若章节重排可能在逐行更新时产生
 * 临时性的 order_index 冲突。这里在同一事务内先把存量行的 order_index 整体平移到高位区间，
 * 腾空目标区间后再 upsert，从而保证既幂等又能安全重排。
 */
async function writeChapters(chapters: ParsedChapter[]): Promise<void> {
  const OFFSET = 1_000_000; // 平移量：远大于实际章节数，保证不与目标 order_index 冲突

  await withTransaction(async (conn) => {
    await conn.execute('UPDATE chapters SET order_index = order_index + ?', [OFFSET]);

    for (const ch of chapters) {
      await conn.execute(
        `INSERT INTO chapters
           (section_order, section_title, slug, title, order_index, is_free, word_count, content)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           section_order = VALUES(section_order),
           section_title = VALUES(section_title),
           title         = VALUES(title),
           order_index   = VALUES(order_index),
           is_free       = VALUES(is_free),
           word_count    = VALUES(word_count),
           content       = VALUES(content)`,
        [
          ch.sectionOrder,
          ch.sectionTitle,
          ch.slug,
          ch.title,
          ch.orderIndex,
          ch.isFree ? 1 : 0,
          ch.wordCount,
          ch.content,
        ]
      );
    }
  });
}

async function main(): Promise<void> {
  const contentDir = config.contentDir;
  console.log(`[import] 内容目录：${contentDir}`);

  const chapters = collectChapters(contentDir);
  if (chapters.length === 0) {
    console.warn('[import] 未发现任何章节（请确认目录结构为 `NN-篇名/*.md`）。');
    return;
  }

  await writeChapters(chapters);

  // 打印导入概览
  console.log(`[import] 完成：共导入/更新 ${chapters.length} 章。`);
  const freeChapter = chapters.find((c) => c.isFree);
  if (freeChapter) {
    console.log(`[import] 免费试读章：#${freeChapter.orderIndex}「${freeChapter.title}」(${freeChapter.slug})`);
  }
  console.log('[import] 章节清单：');
  for (const ch of chapters) {
    const tag = ch.isFree ? '免费' : '锁定';
    console.log(
      `  [${String(ch.orderIndex).padStart(2, '0')}] (${tag}) ${ch.sectionTitle} / ${ch.title}  ~${ch.wordCount} 字`
    );
  }
}

main()
  .catch((err: unknown) => {
    console.error('[import] 失败：', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
