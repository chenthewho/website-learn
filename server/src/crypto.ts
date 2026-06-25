// 内容加密核心：HKDF 派生内容密钥、AES-256-GCM 加密、零宽水印注入。
// 与前端 web/src/lib/crypto.ts（WebCrypto）严格对齐：data=密文 base64，tag=16B authTag base64，iv=12B base64。
import { hkdfSync, createCipheriv, randomBytes } from 'node:crypto';
import { config } from './config';

/** HKDF 派生标签（CONTRACT §5）：info 固定为版本化常量，便于将来轮换。 */
const HKDF_INFO = 'content-key-v1';
/** 派生密钥长度（字节）：AES-256 需要 32 字节。 */
const CONTENT_KEY_LENGTH = 32;
/** AES-GCM 推荐 IV 长度（字节）。 */
const GCM_IV_LENGTH = 12;

/**
 * 从主密钥派生“每主体”内容密钥（HKDF-SHA256）。
 * salt = "clw|" + typ + "|" + subjectId；info = "content-key-v1"；输出 32 字节。
 * 服务端永远依据 JWT 的 typ/sub 重新派生，绝不信任客户端传入的 key。
 */
export function deriveContentKey(typ: 'user' | 'guest', subjectId: string): Buffer {
  const salt = `clw|${typ}|${subjectId}`;
  // hkdfSync 返回 ArrayBuffer，包装为 Buffer 便于后续 crypto API 使用
  const derived = hkdfSync('sha256', config.contentMasterKey, salt, HKDF_INFO, CONTENT_KEY_LENGTH);
  return Buffer.from(derived);
}

/** 派生内容密钥并以 hex 字符串返回（即 AuthResponse.contentKey / GuestResponse.contentKey）。 */
export function deriveContentKeyHex(typ: 'user' | 'guest', subjectId: string): string {
  return deriveContentKey(typ, subjectId).toString('hex');
}

/**
 * AES-256-GCM 加密明文。
 * iv 为 12 字节随机；返回 iv / data(密文) / tag(16B authTag) 三者均为 base64。
 * 前端 WebCrypto 解密时需将 data 与 tag 拼接（tagLength=128）。
 */
export function encryptContent(
  plain: string,
  key: Buffer
): { iv: string; data: string; tag: string } {
  const iv = randomBytes(GCM_IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 字节
  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

// —— 零宽水印 ——（位 0→U+200B，位 1→U+200C，分隔→U+200D；不可见但随复制外泄，可溯源）
// 使用显式 Unicode 转义，避免源码中出现不可见字符导致误编辑。
const ZW_BIT_0 = '​'; // 位 0
const ZW_BIT_1 = '‌'; // 位 1
const ZW_SEPARATOR = '‍'; // 字节分隔

/** 将标签编码为零宽字符序列：逐字节展开为 8 位，字节之间用 U+200D 分隔。 */
function encodeZeroWidth(label: string): string {
  const bytes = Buffer.from(label, 'utf8');
  const encodedBytes: string[] = [];
  for (const byte of bytes) {
    let bits = '';
    for (let i = 7; i >= 0; i -= 1) {
      bits += ((byte >> i) & 1) === 1 ? ZW_BIT_1 : ZW_BIT_0;
    }
    encodedBytes.push(bits);
  }
  return encodedBytes.join(ZW_SEPARATOR);
}

/**
 * 在 Markdown 中注入零宽水印（仅服务端使用，注入后再加密）。
 * label 形如 "<userId|guest>:<issuedAtEpoch>"。
 * 注入位置：每个二级标题（## ）行尾各一处 + 正文末尾一处，提高复制溯源命中率。
 */
export function embedWatermark(markdown: string, label: string): string {
  const mark = encodeZeroWidth(label);
  const lines = markdown.split('\n');
  const watermarked = lines.map((line) =>
    // 仅匹配二级标题 "## "（"### " 等更深标题首字符非空格，自然不匹配）
    /^## /.test(line) ? line + mark : line
  );
  // 正文末尾再追加一处，确保整段复制必然带出可溯源标记
  return `${watermarked.join('\n')}\n${mark}`;
}
