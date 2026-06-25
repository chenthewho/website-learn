// 鉴权路由：注册 / 登录 / 当前用户 / 访客令牌。挂载于 /api/auth（见 index.ts 装配）。
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { ok, asyncHandler, AppError } from '../http';
import { signUserToken, signGuestToken } from '../auth/jwt';
import { hashPassword, verifyPassword } from '../auth/password';
import { deriveContentKeyHex } from '../crypto';
import {
  findUserByEmail,
  createUser,
  toPublicUser,
  UserRow,
} from '../services/userService';
import { requireUser } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { AuthResponse, GuestResponse, MeResponse } from '../../../shared/types';

export const authRouter = Router();

/**
 * 统一用 zod 解析请求体；失败时抛 VALIDATION(400)，把各字段错误信息合并为中文提示。
 * 不直接把 zod 原始错误透传给客户端，避免泄露内部结构。
 */
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message =
      result.error.issues.map((issue) => issue.message).join('；') || '请求参数校验失败';
    throw new AppError('VALIDATION', message, 400);
  }
  return result.data;
}

// 邮箱：去空格、转小写后校验格式与长度（注册/登录共用，保证可一致匹配）
const emailSchema = z
  .string({ required_error: '请输入邮箱' })
  .trim()
  .toLowerCase()
  .email('邮箱格式不正确')
  .max(190, '邮箱长度不能超过 190 个字符');

// 注册校验：密码 8–72 字符；显示名可选且 ≤60（CONTRACT §4）
const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: '请输入密码' })
    .min(8, '密码至少 8 个字符')
    .max(72, '密码最多 72 个字符'),
  displayName: z.string().trim().max(60, '昵称最多 60 个字符').optional(),
});

// 登录校验：邮箱格式 + 非空密码（长度由凭据校验兜底，避免泄露具体原因）
const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: '请输入密码' })
    .min(1, '请输入密码')
    .max(72, '密码最多 72 个字符'),
});

/** 构造统一的登录态响应：token + 公开用户信息 + 内容密钥（仅此一次下发）。 */
function buildAuthResponse(user: UserRow): AuthResponse {
  return {
    token: signUserToken({ id: user.id, email: user.email }),
    user: toPublicUser(user),
    // 服务端始终自己派生 contentKey（typ=user，subjectId=用户 id），绝不信任客户端
    contentKey: deriveContentKeyHex('user', String(user.id)),
  };
}

/**
 * POST /api/auth/register —— 注册新用户。
 * 限流（authLimiter）；邮箱已占用 → EMAIL_TAKEN(409)；成功返回 AuthResponse（201）。
 */
authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = parse(registerSchema, req.body);

    const existing = await findUserByEmail(email);
    if (existing) {
      throw new AppError('EMAIL_TAKEN', '该邮箱已被注册', 409);
    }

    // 未提供昵称时回退为邮箱本地部分（截断至 60 字符），避免空昵称
    const finalDisplayName =
      displayName && displayName.length > 0 ? displayName : email.split('@')[0].slice(0, 60);

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, finalDisplayName);

    ok(res, buildAuthResponse(user), 201);
  }),
);

/**
 * POST /api/auth/login —— 邮箱密码登录。
 * 限流（authLimiter）；邮箱不存在或密码错误统一返回 BAD_CREDENTIALS(401)，不区分以防枚举。
 */
authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);

    const user = await findUserByEmail(email);
    if (!user) {
      throw new AppError('BAD_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new AppError('BAD_CREDENTIALS', '邮箱或密码错误', 401);
    }

    ok(res, buildAuthResponse(user));
  }),
);

/**
 * GET /api/auth/me —— 返回当前登录用户信息与内容密钥。
 * requireUser 已将 UserRow 载入 req.principal.user。
 */
authRouter.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.principal?.user;
    if (!user) {
      // 理论上不可达（requireUser 已保证），此处仅为类型收窄与防御
      throw new AppError('UNAUTHORIZED', '未认证', 401);
    }

    const body: MeResponse = {
      user: toPublicUser(user),
      contentKey: deriveContentKeyHex('user', String(user.id)),
    };
    ok(res, body);
  }),
);

/**
 * POST /api/auth/guest —— 签发访客令牌（typ=guest），仅供免费章解密。
 * 用随机 UUID 作为 guestId，并据此派生 guest 内容密钥。
 */
authRouter.post(
  '/guest',
  asyncHandler(async (_req, res) => {
    const guestId = randomUUID();
    const body: GuestResponse = {
      token: signGuestToken(guestId),
      contentKey: deriveContentKeyHex('guest', guestId),
    };
    ok(res, body);
  }),
);
