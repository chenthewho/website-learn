/**
 * fetch 封装 + 类型化端点（CONTRACT §3/§4）。
 *
 * - 统一信封：成功 {ok:true,data}，失败 {ok:false,error:{code,message}}。
 * - 自动附带 Authorization: Bearer <token>（来自 localStorage 键 'clw_token'）。
 * - 失败时抛出 ApiError(code, message)，调用方据 code 做 UI 提示。
 * 所有路径以 '/api' 开头，开发期由 vite 代理到后端 :4000。
 */
import type {
  AuthResponse,
  ChapterContentResponse,
  ChapterMeta,
  GuestResponse,
  MeResponse,
  ApiResponse,
} from '../../../shared/types';

/** localStorage 中保存 JWT 的键。 */
const TOKEN_KEY = 'clw_token';

/** 统一的 API 错误：携带契约错误码（VALIDATION/UNAUTHORIZED/...）与中文消息。 */
export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** 读取当前 token（localStorage 不可用时安全回退 null）。 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 写入 token。 */
export function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* 隐私模式等场景忽略写入失败 */
  }
}

/** 清除 token（登出 / 鉴权失效时调用）。 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 忽略 */
  }
}

interface RequestOptions {
  method?: string;
  /** JSON 请求体；为 undefined 时不发送 body，也不设置 Content-Type。 */
  body?: unknown;
}

/** 底层请求：解析信封，失败抛 ApiError。 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError('NETWORK', '网络连接失败，请检查网络后重试。');
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('INTERNAL', `服务器返回异常（HTTP ${res.status}）。`);
  }

  if (!payload || typeof payload !== 'object' || !('ok' in payload)) {
    throw new ApiError('INTERNAL', '服务器返回了无法识别的响应。');
  }

  if (payload.ok === false) {
    throw new ApiError(payload.error.code, payload.error.message);
  }

  return payload.data;
}

/** 类型化端点集合（签名严格对应 CONTRACT §4）。 */
export const api = {
  register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
    });
  },

  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  me(): Promise<MeResponse> {
    return request<MeResponse>('/api/auth/me');
  },

  guest(): Promise<GuestResponse> {
    return request<GuestResponse>('/api/auth/guest', { method: 'POST' });
  },

  listChapters(): Promise<{ chapters: ChapterMeta[] }> {
    return request<{ chapters: ChapterMeta[] }>('/api/chapters');
  },

  getChapterContent(id: number): Promise<ChapterContentResponse> {
    return request<ChapterContentResponse>(`/api/chapters/${id}/content`);
  },

  redeem(code: string): Promise<{ hasAccess: boolean }> {
    return request<{ hasAccess: boolean }>('/api/codes/redeem', {
      method: 'POST',
      body: { code },
    });
  },
};
