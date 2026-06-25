// 统一 HTTP 响应封装：成功信封 ok()、应用错误 AppError、异步处理器包装、错误中间件。
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * 业务/应用层错误。携带稳定错误码 code（见 CONTRACT §4）与 HTTP 状态码 status。
 * 由 errorMiddleware 统一转换为 { ok:false, error:{ code, message } } 信封。
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    // 继承内置 Error 时修正原型链，保证 instanceof 正常工作
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** 发送成功响应：{ ok:true, data }，默认 200 */
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true, data });
}

/**
 * 包装异步路由处理器：自动捕获 Promise 异常并交给 next（进入 errorMiddleware），
 * 避免在每个 handler 内手写 try/catch。
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * 全局错误中间件（必须保留 4 个参数，Express 以此识别错误处理器）。
 * AppError → 对应状态码 + { code, message }；未知错误 → 500 INTERNAL，不向客户端泄露堆栈。
 */
export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  // eslint 友好：保留 next 以满足错误处理器的 4 参签名
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      ok: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // 未知错误：服务端记录详情，客户端仅得到通用提示
  console.error('[errorMiddleware] 未处理的错误:', err);
  res.status(500).json({
    ok: false,
    error: { code: 'INTERNAL', message: '服务器内部错误' },
  });
}
