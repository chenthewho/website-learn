/**
 * 课程码兑换页（FE-Auth）。
 * - 未登录：提示需先登录，给出「去登录 / 注册」入口（Link → /login）。
 * - 已登录且未解锁：输入框 + 调用 useAuth().redeem(code)，成功后展示「已解锁全册」并引导去目录。
 * - 已解锁（hasAccess 或本次刚兑换成功）：展示成功面板。
 * 错误按错误码映射为中文文案（INVALID_CODE / CODE_EXHAUSTED / CODE_EXPIRED / ALREADY_HAS_ACCESS ...）。
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import styles from './Redeem.module.css';

/** 兑换错误码 → 中文提示（兜底用服务端 message）。 */
const CODE_MESSAGES: Record<string, string> = {
  INVALID_CODE: '课程码无效，请检查后重新输入。',
  CODE_EXHAUSTED: '该课程码兑换次数已用尽。',
  CODE_EXPIRED: '该课程码已过期。',
  ALREADY_HAS_ACCESS: '你已解锁全册，无需重复兑换。',
  VALIDATION: '课程码格式不正确，应形如 CLW-XXXX-XXXX-XXXX。',
  RATE_LIMITED: '操作过于频繁，请稍后再试。',
};

export function Redeem(): JSX.Element {
  const { status, hasAccess, redeem } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (submitting) return;
    const value = code.trim().toUpperCase();
    if (!value) {
      setError('请输入课程码。');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await redeem(value);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(CODE_MESSAGES[err.code] ?? err.message ?? '兑换失败，请稍后重试。');
      } else {
        setError('网络错误，请稍后重试。');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 已解锁：本次兑换成功，或上下文已标记 hasAccess。
  const unlocked = done || hasAccess;

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <header className={styles.head}>
          <p className={styles.kicker}>解锁全册</p>
          <h1 className={styles.title}>课程码兑换</h1>
          <p className={styles.subtitle}>输入课程码，一次性解锁全部章节。</p>
        </header>

        {status === 'loading' ? (
          <p className={styles.note}>正在确认登录状态…</p>
        ) : status === 'anon' ? (
          <div className={styles.panel}>
            <p className={styles.panelText}>
              兑换课程码前需要先登录账号。登录后输入课程码，即可永久解锁全册内容。
            </p>
            <Link to="/login" className={styles.linkBtn}>
              去登录 / 注册
            </Link>
          </div>
        ) : unlocked ? (
          <div className={styles.panel}>
            <div className={styles.successMark} aria-hidden="true">
              ✓
            </div>
            <p className={styles.successText}>已解锁全册！现在你可以阅读全部章节了。</p>
            <Link to="/catalog" className={styles.linkBtn}>
              前往课程目录
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.field}>
              <span className={styles.label}>课程码</span>
              <input
                className={styles.input}
                type="text"
                name="code"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="CLW-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={submitting}
              />
            </label>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" variant="gold" size="lg" loading={submitting} className={styles.submit}>
              解锁全册
            </Button>

            <p className={styles.hint}>没有课程码？请联系课程发布方获取。</p>
          </form>
        )}
      </Card>
    </div>
  );
}

export default Redeem;
