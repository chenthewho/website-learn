// 章节路由：目录列表（含锁状态）与单章加密正文。挂载于 /api/chapters（见 index.ts 装配）。
import { Router } from 'express';

import { ok, asyncHandler, AppError } from '../http';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { contentLimiter } from '../middleware/rateLimit';
import {
  listChapters,
  getChapterById,
  canReadChapter,
  toChapterMeta,
} from '../services/chapterService';
import { deriveContentKey, encryptContent, embedWatermark } from '../crypto';
import { ChapterContentResponse } from '../../../shared/types';

export const chaptersRouter = Router();

/**
 * GET /api/chapters —— 列出全部章节元信息（按 orderIndex）。
 * optionalAuth：登录与否都可访问；每章的 locked 由服务端按请求者权限裁决。
 */
chaptersRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const rows = await listChapters();
    const chapters = rows.map((row) =>
      toChapterMeta(row, canReadChapter(row, req.principal)),
    );
    ok(res, { chapters });
  }),
);

/**
 * GET /api/chapters/:id/content —— 返回单章加密正文（AES-256-GCM）。
 * requireAuth(user 或 guest) + 内容限流。访问裁决（CONTRACT §4）：
 *   免费章任何登录态可读；否则仅 user 且 has_access 可读，无权 → 403 LOCKED。
 * 正文加密前注入零宽水印用于泄露溯源；密钥由服务端按 JWT 的 typ/sub 重新派生，绝不信任客户端。
 */
chaptersRouter.get(
  '/:id/content',
  contentLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('VALIDATION', '章节 ID 非法', 400);
    }

    const row = await getChapterById(id);
    if (!row) {
      throw new AppError('NOT_FOUND', '章节不存在', 404);
    }

    const principal = req.principal;
    if (!principal) {
      // requireAuth 已保证存在，此处仅为类型收窄与防御
      throw new AppError('UNAUTHORIZED', '未认证', 401);
    }

    if (!canReadChapter(row, principal)) {
      throw new AppError('LOCKED', '本章尚未解锁', 403);
    }

    // 水印标签：登录用户用「邮箱 · #章节id」，访客用「访客」，并附签发时间戳
    const label = principal.user ? `${principal.user.email} · #${id}` : '访客';
    const markdown = embedWatermark(row.content, `${label}:${Date.now()}`);

    const key = deriveContentKey(principal.typ, principal.sub);
    const encrypted = encryptContent(markdown, key);

    const body: ChapterContentResponse = {
      iv: encrypted.iv,
      data: encrypted.data,
      tag: encrypted.tag,
      meta: {
        chapterId: row.id,
        title: row.title,
        updatedAt: new Date(row.updated_at).toISOString(),
      },
    };
    ok(res, body);
  }),
);
