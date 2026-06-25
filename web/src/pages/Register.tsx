/**
 * 注册页（FE-Auth）。
 * 卡片式表单：调用 useAuth().register，成功后跳转 /catalog；失败展示中文错误信息。
 * displayName 选填；为空时以 undefined 传入（不发送空字符串覆盖默认值）。
 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import styles from './Register.module.css';

export function Register(): JSX.Element {
  const { register, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 已登录用户无需注册，直接进入课程目录。
  if (status === 'authed') {
    return <Navigate to="/catalog" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('请填写邮箱和密码。');
      return;
    }
    if (password.length < 8) {
      setError('密码至少需要 8 位字符。');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const name = displayName.trim();
      await register(trimmedEmail, password, name || undefined);
      navigate('/catalog');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '注册失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <header className={styles.head}>
          <p className={styles.kicker}>Agent 学堂</p>
          <h1 className={styles.title}>创建账号</h1>
          <p className={styles.subtitle}>注册后即可免费试读第一章，输入课程码解锁全册。</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>邮箱</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              昵称<span className={styles.optional}>（选填）</span>
            </span>
            <input
              className={styles.input}
              type="text"
              name="displayName"
              autoComplete="nickname"
              placeholder="如何称呼你？"
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={submitting}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>密码</span>
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="8–72 位字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={submitting} className={styles.submit}>
            注册并开始学习
          </Button>
        </form>

        <p className={styles.foot}>
          已经有账号了？<Link to="/login">直接登录</Link>
        </p>
      </Card>
    </div>
  );
}

export default Register;
