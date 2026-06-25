/**
 * 鉴权上下文：用户态 + contentKey（仅内存）。严格对齐 CONTRACT §4/§5 与前端内部契约。
 *
 * 初始化：localStorage 有 token → api.me()（失败则 clearToken 并退回 guest）；
 *         无 token → api.guest() 取 guest token + contentKey（仅供免费章解密）。
 * contentKey 只存 React state（内存），绝不写 localStorage。
 * hasAccess = !!user?.hasAccess（最终裁决在服务端，前端仅用于展示）。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { PublicUser } from '../../../shared/types';
import { api, clearToken, getToken, setToken } from '../lib/api';

export interface AuthValue {
  user: PublicUser | null;
  /** 内容解密密钥 hex(32B)，仅内存持有。 */
  contentKey: string | null;
  status: 'loading' | 'authed' | 'anon';
  hasAccess: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName?: string): Promise<void>;
  logout(): void;
  redeem(code: string): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [contentKey, setContentKey] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>('loading');

  /** 获取访客令牌与 contentKey（用于免费章解密）。失败则进入纯匿名态。 */
  const initGuest = useCallback(async (): Promise<void> => {
    try {
      const g = await api.guest();
      setToken(g.token); // 内容请求需携带 guest token（requireAuth 接受 user 或 guest）
      setContentKey(g.contentKey);
      setUser(null);
      setStatus('anon');
    } catch {
      // 后端不可达等情况：退回纯匿名，UI 仍可浏览营销页
      setUser(null);
      setContentKey(null);
      setStatus('anon');
    }
  }, []);

  /** 重新拉取当前身份：有 token 试 me()，失败/无 token 则回退 guest。 */
  const refresh = useCallback(async (): Promise<void> => {
    const token = getToken();
    if (token) {
      try {
        const r = await api.me();
        setUser(r.user);
        setContentKey(r.contentKey);
        setStatus('authed');
        return;
      } catch {
        // token 失效或为 guest token（me 需 user）→ 清除后退回 guest
        clearToken();
      }
    }
    await initGuest();
  }, [initGuest]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const r = await api.login(email, password);
    setToken(r.token);
    setUser(r.user);
    setContentKey(r.contentKey);
    setStatus('authed');
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string): Promise<void> => {
      const r = await api.register(email, password, displayName);
      setToken(r.token);
      setUser(r.user);
      setContentKey(r.contentKey);
      setStatus('authed');
    },
    [],
  );

  const logout = useCallback((): void => {
    clearToken();
    setUser(null);
    setContentKey(null);
    setStatus('anon'); // 立即视为未登录，避免导航闪烁
    void initGuest(); // 重新取 guest token/contentKey 以便继续读免费章
  }, [initGuest]);

  const redeem = useCallback(
    async (code: string): Promise<void> => {
      await api.redeem(code); // 成功（或 ALREADY_HAS_ACCESS 由调用方区分）后刷新用户态
      await refresh();
    },
    [refresh],
  );

  // 应用挂载时初始化身份（只跑一次）。
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      contentKey,
      status,
      hasAccess: !!user?.hasAccess,
      login,
      register,
      logout,
      redeem,
      refresh,
    }),
    [user, contentKey, status, login, register, logout, redeem, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 读取鉴权上下文；必须在 <AuthProvider> 内调用。 */
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  }
  return ctx;
}
