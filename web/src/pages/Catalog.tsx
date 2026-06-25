/**
 * 课程目录页（FE-Auth）。
 * - 调用 api.listChapters() 拉取章节，按 section 分组展示卡片列表。
 * - 每章显示标题 / 字数 / 锁状态；免费章标「免费试读」，locked 章显示锁图标并提示解锁方式。
 * - 未锁章 → Link 到 /reader/:id；锁章点击 → 已登录去 /redeem，未登录去 /login。
 * - 顶部状态条用 useAuth 展示当前解锁状态。
 * 访问控制由服务端裁决（locked 字段），前端仅做展示与引导。
 */
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { ChapterMeta } from '../../../shared/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import styles from './Catalog.module.css';

/** 同篇章节聚合结构。 */
interface Section {
  order: number;
  title: string;
  chapters: ChapterMeta[];
}

/** 按 sectionOrder 分组，保持组内章节原有顺序（接口已按 orderIndex 排序）。 */
function groupBySection(chapters: ChapterMeta[]): Section[] {
  const map = new Map<number, Section>();
  for (const ch of chapters) {
    let sec = map.get(ch.sectionOrder);
    if (!sec) {
      sec = { order: ch.sectionOrder, title: ch.sectionTitle, chapters: [] };
      map.set(ch.sectionOrder, sec);
    }
    sec.chapters.push(ch);
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}

/** 小锁图标（描边用 currentColor，随主题色变化）。 */
function LockIcon(): JSX.Element {
  return (
    <svg
      className={styles.lockIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function Catalog(): JSX.Element {
  const { status, user, hasAccess } = useAuth();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<ChapterMeta[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listChapters();
      setChapters(res.chapters);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '无法加载课程目录，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(() => (chapters ? groupBySection(chapters) : []), [chapters]);

  // 锁章点击：已登录引导去兑换，未登录引导去登录。
  const handleLocked = useCallback((): void => {
    navigate(status === 'authed' ? '/redeem' : '/login');
  }, [navigate, status]);

  // 锁章键盘可达（Enter / 空格 触发，与点击一致）。
  const handleLockedKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleLocked();
      }
    },
    [handleLocked],
  );

  const displayName = user ? user.displayName || user.email : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>课程目录</p>
        <h1 className={styles.title}>从前端到 AI Agent 开发</h1>
        <p className={styles.lede}>
          沿着「前言 → 基础 → 核心能力 → 工程 → 实战」的脉络拾级而上。第一章免费试读，输入课程码即可解锁全册。
        </p>

        <div className={styles.statusBar}>
          <span className={clsx(styles.statusDot, hasAccess ? styles.dotGold : styles.dotAccent)} />
          <span className={styles.statusText}>
            {status === 'loading' ? (
              <>正在确认你的阅读权限…</>
            ) : status === 'authed' ? (
              hasAccess ? (
                <>
                  已登录为 <strong>{displayName}</strong> · 已解锁全册，可阅读全部章节
                </>
              ) : (
                <>
                  已登录为 <strong>{displayName}</strong> · 当前仅可免费试读第一章
                </>
              )
            ) : (
              <>你尚未登录 · 仅可免费试读第一章</>
            )}
          </span>
          <span className={styles.statusSpacer} />
          {status === 'authed' ? (
            !hasAccess && (
              <Link className={styles.statusCta} to="/redeem">
                输入课程码解锁全册 →
              </Link>
            )
          ) : (
            <Link className={styles.statusCta} to="/login">
              登录 / 注册 →
            </Link>
          )}
        </div>
      </header>

      {loading && <p className={styles.note}>正在加载课程目录…</p>}

      {error && (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            重试
          </Button>
        </div>
      )}

      {!loading &&
        !error &&
        sections.map((sec) => (
          <section key={sec.order} className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{sec.title}</h2>
              <span className={styles.sectionCount}>{sec.chapters.length} 章</span>
            </div>

            <div className={styles.grid}>
              {sec.chapters.map((ch) => {
                const inner = (
                  <Card className={clsx(styles.chapterCard, ch.locked && styles.locked)}>
                    <div className={styles.cardTop}>
                      <span className={styles.orderNum}>
                        {String(ch.orderIndex + 1).padStart(2, '0')}
                      </span>
                      {ch.isFree ? (
                        <span className={styles.freeTag}>免费试读</span>
                      ) : ch.locked ? (
                        <span className={styles.lockBadge}>
                          <LockIcon />
                        </span>
                      ) : (
                        <span className={styles.openTag}>可阅读</span>
                      )}
                    </div>

                    <h3 className={styles.chapterTitle}>{ch.title}</h3>

                    <div className={styles.meta}>
                      <span className={styles.words}>{ch.wordCount.toLocaleString('zh-CN')} 字</span>
                      <span className={clsx(styles.metaCta, ch.locked && styles.metaMuted)}>
                        {ch.locked ? '登录并输入课程码解锁' : '开始阅读 →'}
                      </span>
                    </div>
                  </Card>
                );

                return ch.locked ? (
                  <div
                    key={ch.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${ch.title}（未解锁，点击查看解锁方式）`}
                    className={styles.cardLink}
                    onClick={handleLocked}
                    onKeyDown={handleLockedKey}
                  >
                    {inner}
                  </div>
                ) : (
                  <Link key={ch.id} to={`/reader/${ch.id}`} className={styles.cardLink}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}

export default Catalog;
