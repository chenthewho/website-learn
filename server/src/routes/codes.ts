// 兑换码路由：用课程码解锁全册。挂载于 /api/codes（见 index.ts 装配）。
import { Router } from 'express';
import { z } from 'zod';

import { ok, asyncHandler, AppError } from '../http';
import { requireUser } from '../middleware/auth';
import { redeemCode } from '../services/codeService';

export const codesRouter = Router();

// 课程码格式：CLW-XXXX-XXXX-XXXX（大写无歧义字符）。格式校验仅为早失败，最终以 DB 精确匹配为准。
const CODE_PATTERN = /^CLW-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// 校验并规范化（去空格 + 转大写）课程码
const redeemSchema = z.object({
  code: z
    .string({ required_error: '请输入课程码' })
    .trim()
    .toUpperCase()
    .regex(CODE_PATTERN, '课程码格式不正确'),
});

/** zod 解析请求体；失败抛 VALIDATION(400)。 */
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message =
      result.error.issues.map((issue) => issue.message).join('；') || '请求参数校验失败';
    throw new AppError('VALIDATION', message, 400);
  }
  return result.data;
}

/**
 * POST /api/codes/redeem —— 用课程码为当前用户解锁全册（requireUser）。
 * 事务化兑换在 codeService.redeemCode 内完成；这里把 RedeemResult 映射为对应错误码：
 *   INVALID_CODE/CODE_EXPIRED → 400；CODE_EXHAUSTED/ALREADY_HAS_ACCESS → 409。
 * 成功返回 { hasAccess: true }。
 */
codesRouter.post(
  '/redeem',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.principal?.user;
    if (!user) {
      // 理论上不可达（requireUser 已保证），此处仅为类型收窄与防御
      throw new AppError('UNAUTHORIZED', '未认证', 401);
    }

    const { code } = parse(redeemSchema, req.body);
    const result = await redeemCode(user.id, code);

    if (!result.ok) {
      switch (result.code) {
        case 'INVALID_CODE':
          throw new AppError('INVALID_CODE', '课程码无效', 400);
        case 'CODE_EXPIRED':
          throw new AppError('CODE_EXPIRED', '课程码已过期', 400);
        case 'CODE_EXHAUSTED':
          throw new AppError('CODE_EXHAUSTED', '课程码兑换次数已用尽', 409);
        case 'ALREADY_HAS_ACCESS':
          throw new AppError('ALREADY_HAS_ACCESS', '你已拥有全册访问权限', 409);
        default: {
          // 穷尽性检查：若未来新增结果码而未处理，此处编译期报错
          const exhaustive: never = result.code;
          throw new AppError('INTERNAL', `未知兑换结果：${String(exhaustive)}`, 500);
        }
      }
    }

    ok(res, { hasAccess: true });
  }),
);
