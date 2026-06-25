// JWT 签发与校验。用户令牌有效期 7 天，访客令牌 1 天；校验失败抛 AppError('UNAUTHORIZED', 401)。
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../http';

/** 令牌载荷：sub=主体标识（userId 或 guestId），typ 区分用户/访客，email 仅用户携带。 */
export interface JwtPayload {
  sub: string;
  typ: 'user' | 'guest';
  email?: string;
}

// 以“秒”表示有效期，规避 @types/jsonwebtoken 对字符串时长（StringValue）的类型收紧
const USER_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天
const GUEST_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 1 天

/** 签发用户令牌（typ=user，含 email）。 */
export function signUserToken(u: { id: number; email: string }): string {
  const payload: JwtPayload = { sub: String(u.id), typ: 'user', email: u.email };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: USER_TOKEN_TTL_SECONDS });
}

/** 签发访客令牌（typ=guest，仅供免费章解密）。 */
export function signGuestToken(guestId: string): string {
  const payload: JwtPayload = { sub: guestId, typ: 'guest' };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: GUEST_TOKEN_TTL_SECONDS });
}

/** 校验并解析令牌；签名/过期/格式任一不合法均抛 UNAUTHORIZED(401)。 */
export function verifyToken(token: string): JwtPayload {
  let raw: unknown;
  try {
    raw = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError('UNAUTHORIZED', '登录状态无效或已过期，请重新登录', 401);
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new AppError('UNAUTHORIZED', '登录令牌格式不合法', 401);
  }

  const obj = raw as Record<string, unknown>;
  const { sub, typ, email } = obj;
  if (typeof sub !== 'string' || (typ !== 'user' && typ !== 'guest')) {
    throw new AppError('UNAUTHORIZED', '登录令牌内容不合法', 401);
  }

  const payload: JwtPayload = { sub, typ };
  if (typeof email === 'string') {
    payload.email = email;
  }
  return payload;
}
