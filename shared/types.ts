/**
 * 前后端共享的 TypeScript 类型与常量（接口契约的单一事实来源）。
 * 严格对应 CONTRACT.md §3 / §4。前后端都从这里 import，禁止各自重复定义偏离形状。
 */

/** 对外暴露的用户信息（绝不含 password_hash 等敏感字段）。 */
export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
  /** 是否已用有效兑换码解锁全册。 */
  hasAccess: boolean;
}

/** 章节元信息（目录/卡片展示用，不含正文）。 */
export interface ChapterMeta {
  id: number;
  /** 篇序（来自目录名 00..06）。 */
  sectionOrder: number;
  /** 篇名（前言/基础篇/...）。 */
  sectionTitle: string;
  /** 稳定唯一标识：如 "01-基础篇__01-从llm到agent"。 */
  slug: string;
  /** 章标题（取文件首个 H1，回退文件名）。 */
  title: string;
  /** 全局顺序（0 起，唯一）。 */
  orderIndex: number;
  /** 是否免费试读（仅 orderIndex===0 的章为 true）。 */
  isFree: boolean;
  /** locked = 当前请求者无权读取（服务端按权限计算，前端仅用于展示）。 */
  locked: boolean;
  wordCount: number;
}

/** AES-GCM 加密载荷，三个字段均为 base64。 */
export interface EncryptedPayload {
  iv: string;
  data: string;
  tag: string;
}

/** 章节正文响应：加密载荷 + 章节元信息。 */
export interface ChapterContentResponse extends EncryptedPayload {
  meta: {
    chapterId: number;
    title: string;
    /** ISO 字符串。 */
    updatedAt: string;
  };
}

/** 注册/登录响应：token + 用户信息 + 内容密钥。contentKey 为 hex(32B)，仅此一次下发。 */
export interface AuthResponse {
  token: string;
  user: PublicUser;
  /** hex(32B)，客户端持有用于解密内容；之后内容响应不再携带密钥。 */
  contentKey: string;
}

/** GET /api/auth/me 响应。 */
export interface MeResponse {
  user: PublicUser;
  contentKey: string;
}

/** 访客令牌响应（typ=guest，仅供免费章解密）。 */
export interface GuestResponse {
  token: string;
  contentKey: string;
}

/** 统一成功信封。 */
export interface ApiOk<T> {
  ok: true;
  data: T;
}

/** 统一失败信封。 */
export interface ApiErr {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

/** API 响应联合类型。 */
export type ApiResponse<T> = ApiOk<T> | ApiErr;

/** 未解锁（未登录/guest/未购买用户）可读章数。 */
export const FREE_PREVIEW_LIMIT = 1;
