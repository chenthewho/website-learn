// 鉴权中间件：optionalAuth / requireAuth / requireUser。
// 通过 declare global 在 Express.Request 上挂载 principal（请求主体）。
// 对 typ==='user' 的主体统一载入 UserRow，便于下游 canReadChapter 等按 has_access 裁决访问权限。
import { Request, RequestHandler } from 'express';
import { verifyToken, JwtPayload } from '../auth/jwt';
import { AppError, asyncHandler } from '../http';
import { findUserById, UserRow } from '../services/userService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 当前请求主体；未鉴权时为 undefined。user 仅在 typ==='user' 时载入。 */
      principal?: { typ: 'user' | 'guest'; sub: string; user?: UserRow };
    }
  }
}

/** 请求主体（与 req.principal 同形）。 */
type Principal = { typ: 'user' | 'guest'; sub: string; user?: UserRow };

/** 从 Authorization: Bearer <token> 头提取令牌；无则返回 null。 */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

/**
 * 依据令牌载荷构建请求主体。
 * 用户主体会从库中载入对应 UserRow；用户不存在则抛 UNAUTHORIZED（令牌指向已失效账号）。
 */
async function buildPrincipal(payload: JwtPayload): Promise<Principal> {
  if (payload.typ === 'user') {
    const userId = Number.parseInt(payload.sub, 10);
    const user = Number.isNaN(userId) ? null : await findUserById(userId);
    if (!user) {
      throw new AppError('UNAUTHORIZED', '用户不存在或登录已失效，请重新登录', 401);
    }
    return { typ: 'user', sub: payload.sub, user };
  }
  return { typ: 'guest', sub: payload.sub };
}

/** 可选鉴权：携带合法令牌则填充 req.principal，否则静默放过（不报错）。 */
export const optionalAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      req.principal = await buildPrincipal(payload);
    } catch {
      // 可选鉴权：令牌无效/用户失效时不报错，按匿名处理
    }
  }
  next();
});

/** 强制鉴权：用户或访客均可；缺失/失效令牌抛 UNAUTHORIZED(401)。 */
export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new AppError('UNAUTHORIZED', '需要登录后访问', 401);
  }
  const payload = verifyToken(token); // 失败抛 UNAUTHORIZED
  req.principal = await buildPrincipal(payload);
  next();
});

/** 仅注册用户：拒绝访客；载入 UserRow 到 req.principal.user；否则 UNAUTHORIZED(401)。 */
export const requireUser: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new AppError('UNAUTHORIZED', '需要登录后访问', 401);
  }
  const payload = verifyToken(token);
  if (payload.typ !== 'user') {
    throw new AppError('UNAUTHORIZED', '该操作需要注册用户身份', 401);
  }
  req.principal = await buildPrincipal(payload);
  next();
});
