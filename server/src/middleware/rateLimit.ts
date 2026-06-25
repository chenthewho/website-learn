// 限流中间件（express-rate-limit）。超限统一返回 429 + 标准错误信封 RATE_LIMITED。
import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

/** 超限统一响应：429 + { ok:false, error:{ code:'RATE_LIMITED', message } }。 */
function rateLimited(message: string): RequestHandler {
  // 复用同一处理逻辑，避免两处重复
  return (_req, res) => {
    res.status(429).json({
      ok: false,
      error: { code: 'RATE_LIMITED', message },
    });
  };
}

/** 登录/注册等鉴权端点：约 20 次 / 15 分钟 / IP，防暴力撞库。 */
export const authLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimited('操作过于频繁，请 15 分钟后再试'),
});

/** 内容端点：约 240 次 / 5 分钟 / IP，放宽以支持正常连续阅读。 */
export const contentLimiter: RequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimited('请求过于频繁，请稍后再试'),
});
