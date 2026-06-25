/**
 * Reader —— 章节阅读器（CONTRACT §FE-reader，最关键页面）。
 *
 * 流程：
 *  1) api.listChapters() 取全部章节 meta，用于左侧目录(TOC，按 section 分组、当前高亮)、
 *     章标题与上一章/下一章导航、锁状态展示。
 *  2) api.getChapterContent(id)：
 *       - 抛 ApiError(code='LOCKED'|'UNAUTHORIZED') → 渲染“锁定”视图（模糊占位 + 遮罩引导）：
 *           未登录 → 去登录 / 免费试读；已登录未解锁 → 去兑换。
 *       - 否则用 useAuth().contentKey 调 decryptContent 解密为 markdown，交给 <MarkdownView/>。
 *  3) 阅读区应用防护（useProtection）：禁复制/右键/选择 + DevTools 检测遮罩；叠加全屏 <Watermark/>。
 *
 * 诚实声明：防护为“提高门槛 / 可溯源”的尽力措施，无法对抗有决心的技术用户。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import type { ChapterMeta } from '../../../shared/types';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { decryptContent } from '../lib/crypto';
import { MarkdownView } from '../components/MarkdownView';
import { Watermark } from '../components/Watermark';
import { Button } from '../components/Button';
import { useProtection } from '../hooks/useProtection';
import styles from './Reader.module.css';

interface TocSection {
  sectionOrder: number;
  sectionTitle: string;
  items: ChapterMeta[];
}

/** 按 section 分组（保持 orderIndex 顺序）。 */
function buildSections(sorted: ChapterMeta[]): TocSection[] {
  const map = new Map<number, TocSection>();
  const order: number[] = [];
  for (const ch of sorted) {
    let sec = map.get(ch.sectionOrder);
    if (!sec) {
      sec = { sectionOrder: ch.sectionOrder, sectionTitle: ch.sectionTitle, items: [] };
      map.set(ch.sectionOrder, sec);
      order.push(ch.sectionOrder);
    }
    sec.items.push(ch);
  }
  return order.map((o) => map.get(o) as TocSection);
}

/** 本地时间 YYYY-MM-DD HH:mm（用于水印）。 */
function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, contentKey, status } = useAuth();

  const chapterId = Number(id);
  const validId = Number.isInteger(chapterId) && chapterId > 0;

  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [contentTitle, setContentTitle] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  // —— 拉取章节列表（依赖鉴权：locked 随权限变化）——
  useEffect(() => {
    if (status === 'loading') return;
    let active = true;
    api
      .listChapters()
      .then((r) => {
        if (active) setChapters(r.chapters);
      })
      .catch(() => {
        if (active) setChapters([]);
      });
    return () => {
      active = false;
    };
  }, [status]);

  // —— 拉取并解密本章内容 ——
  useEffect(() => {
    if (status === 'loading') return;
    if (!validId) {
      setLoadingContent(false);
      setError('章节不存在。');
      return;
    }

    let active = true;
    setLoadingContent(true);
    setLocked(false);
    setError(null);
    setMarkdown(null);
    setContentTitle(null);

    (async () => {
      try {
        const res = await api.getChapterContent(chapterId);
        if (!active) return;
        if (!contentKey) {
          setError('缺少内容解密密钥，请重新登录后重试。');
          return;
        }
        const md = await decryptContent({ iv: res.iv, data: res.data, tag: res.tag }, contentKey);
        if (!active) return;
        setMarkdown(md);
        setContentTitle(res.meta.title);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && (err.code === 'LOCKED' || err.code === 'UNAUTHORIZED')) {
          setLocked(true);
        } else if (err instanceof ApiError && err.code === 'NOT_FOUND') {
          setError('章节不存在。');
        } else if (err instanceof ApiError) {
          setError(err.message || '内容加载失败。');
        } else {
          setError('内容加载或解密失败，请稍后重试。');
        }
      } finally {
        if (active) setLoadingContent(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [chapterId, validId, status, contentKey]);

  // 切章回到顶部
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [chapterId]);

  const sorted = useMemo(
    () => [...chapters].sort((a, b) => a.orderIndex - b.orderIndex),
    [chapters],
  );
  const sections = useMemo(() => buildSections(sorted), [sorted]);

  const currentIndex = sorted.findIndex((c) => c.id === chapterId);
  const current = currentIndex >= 0 ? sorted[currentIndex] : undefined;
  const prev = currentIndex > 0 ? sorted[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : undefined;
  const firstFree = useMemo(() => sorted.find((c) => c.isFree), [sorted]);

  const showContent = !!markdown && !locked && !error && !loadingContent;
  const { devtoolsOpen } = useProtection({ enabled: showContent });

  const watermarkLabel = useMemo(
    () => (user ? `${user.email} · #${user.id} · ${formatNow()}` : '访客 · 未登录'),
    [user],
  );

  const go = (target: number) => navigate(`/reader/${target}`);
  const displayTitle = contentTitle ?? current?.title ?? (loadingContent ? '加载中…' : '');

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.status}>正在初始化…</div>
      </div>
    );
  }

  const renderLocked = () => {
    const needLogin = !user;
    return (
      <div className={styles.lockedWrap}>
        <div className={styles.lockedFake} aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={styles.lockedFakeLine}
              style={{ width: `${68 + ((i * 9) % 30)}%` }}
            />
          ))}
        </div>
        <div className={styles.lockedOverlay}>
          <div className={styles.lockedCard}>
            <div className={styles.lockedBadge} aria-hidden="true">
              🔒
            </div>
            <h2 className={styles.lockedTitle}>本章尚未解锁</h2>
            <p className={styles.lockedText}>
              {needLogin
                ? '登录后即可继续阅读；你也可以从第一章开始免费试读。'
                : '你的账号尚未解锁本册，输入课程码即可阅读全部章节。'}
            </p>
            <div className={styles.lockedActions}>
              {needLogin ? (
                <>
                  <Button variant="primary" onClick={() => navigate('/login')}>
                    去登录
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/register')}>
                    注册账号
                  </Button>
                  {firstFree ? (
                    <Button variant="ghost" onClick={() => go(firstFree.id)}>
                      免费试读第一章
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <Button variant="gold" onClick={() => navigate('/redeem')}>
                    输入课程码解锁
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/catalog')}>
                    返回目录
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBody = () => {
    if (loadingContent) {
      return <div className={styles.status}>正在解密并加载本章…</div>;
    }
    if (error) {
      return <div className={clsx(styles.status, styles.statusError)}>{error}</div>;
    }
    if (locked) {
      return renderLocked();
    }
    if (markdown) {
      return (
        <div className={clsx(devtoolsOpen && styles.contentBlur)}>
          <MarkdownView markdown={markdown} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.page}>
      {showContent ? <Watermark label={watermarkLabel} /> : null}
      {showContent && devtoolsOpen ? (
        <div className={styles.devtoolsMask}>
          <div className={styles.devtoolsCard}>
            <h3>检测到开发者工具</h3>
            <p>为保护版权内容，正文已暂时隐藏。关闭开发者工具后将自动恢复。</p>
          </div>
        </div>
      ) : null}

      <div className={styles.layout}>
        <aside className={styles.toc}>
          <p className={styles.tocTitle}>目录</p>
          {sections.map((sec) => (
            <div key={sec.sectionOrder} className={styles.tocSection}>
              <p className={styles.tocSectionTitle}>{sec.sectionTitle}</p>
              <ul className={styles.tocList}>
                {sec.items.map((item) => (
                  <li key={item.id} className={styles.tocItem}>
                    <Link
                      to={`/reader/${item.id}`}
                      className={clsx(
                        styles.tocLink,
                        item.id === chapterId && styles.tocLinkActive,
                      )}
                    >
                      <span>{item.title}</span>
                      {item.locked ? (
                        <span className={styles.tocLockIcon} aria-label="未解锁">
                          🔒
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <section className={styles.main}>
          <header className={styles.header}>
            {current?.sectionTitle ? (
              <span className={styles.sectionLabel}>{current.sectionTitle}</span>
            ) : null}
            <h1 className={styles.title}>{displayTitle}</h1>
            <div className={styles.pager}>
              <Button
                variant="ghost"
                size="sm"
                disabled={!prev}
                onClick={() => prev && go(prev.id)}
              >
                ← 上一章
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!next}
                onClick={() => next && go(next.id)}
              >
                下一章 →
              </Button>
            </div>
          </header>

          <div className={styles.contentWrap}>{renderBody()}</div>

          {showContent && (prev || next) ? (
            <div className={styles.pagerBottom}>
              <Button variant="ghost" disabled={!prev} onClick={() => prev && go(prev.id)}>
                {prev ? `← ${prev.title}` : '← 上一章'}
              </Button>
              <Button variant="ghost" disabled={!next} onClick={() => next && go(next.id)}>
                {next ? `${next.title} →` : '下一章 →'}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default Reader;
