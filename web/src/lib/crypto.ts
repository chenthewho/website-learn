/**
 * 客户端内容解密（WebCrypto，AES-256-GCM）。严格对齐 CONTRACT §5。
 *
 * 服务端用 HKDF 派生出的 contentKey（hex(32B)）加密章节 Markdown，
 * 通过 EncryptedPayload({iv,data,tag} 均为 base64) 下发；本模块在内存中解密还原明文。
 * 仅具名导出 decryptContent，不持久化任何明文/密钥。
 */
import type { EncryptedPayload } from '../../../shared/types';

/**
 * hex 字符串 → Uint8Array（每两位十六进制为一字节）。
 * 显式以 ArrayBuffer 作为底层缓冲，保证可作为 WebCrypto 的 BufferSource 使用
 * （TS 5.7+ 的 Uint8Array 默认泛型为 ArrayBufferLike，含 SharedArrayBuffer，不满足 DOM 类型约束）。
 */
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) {
    throw new Error('非法的 hex 密钥长度');
  }
  const bytes = new Uint8Array(new ArrayBuffer(clean.length / 2));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** base64 字符串 → Uint8Array（底层为 ArrayBuffer，便于直接喂给 WebCrypto）。 */
function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * 解密单个章节加密载荷，返回原始 Markdown 文本。
 *
 * 流程（与服务端 createCipheriv('aes-256-gcm') 对齐）：
 *  1. importKey('raw', hexToBytes(key), 'AES-GCM', ['decrypt'])；
 *  2. combined = data || tag（WebCrypto 要求密文尾部拼接 16B 认证标签）；
 *  3. subtle.decrypt({name:'AES-GCM', iv, tagLength:128}, key, combined)；
 *  4. TextDecoder 还原 UTF-8 文本。
 */
export async function decryptContent(
  payload: { iv: string; data: string; tag: string },
  contentKeyHex: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(contentKeyHex),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  const data = b64ToBytes(payload.data);
  const tag = b64ToBytes(payload.tag);
  const combined = new Uint8Array(data.length + tag.length);
  combined.set(data, 0);
  combined.set(tag, data.length);

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv), tagLength: 128 },
    key,
    combined,
  );

  return new TextDecoder().decode(plain);
}

/** 便于类型对齐：EncryptedPayload 结构与 decryptContent 第一参数等价。 */
export type { EncryptedPayload };
