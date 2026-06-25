/**
 * 登录页（FE-Auth）。
 * 卡片式表单：调用 useAuth().login，成功后跳转 /catalog；失败展示中文错误信息。
 * 表单输入框可正常选中/输入（theme.css 已对 input/textarea 放开 user-select）。
 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import styles from './Login.module.css';

export function Login(): JSX.Element {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 已登录用户无需再看到登录表单，直接进入课程目录。
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
    setError(null);
    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
      navigate('/catalog');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <header className={styles.head}>
          <p className={styles.kicker}>Agent 学堂</p>
          <h1 className={styles.title}>欢迎回来</h1>
          <p className={styles.subtitle}>登录以继续你的 AI Agent 学习之旅。</p>
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
            <span className={styles.label}>密码</span>
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="至少 8 位字符"
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
            登录
          </Button>
        </form>

        <p className={styles.foot}>
          还没有账号？<Link to="/register">免费注册</Link>
        </p>
      </Card>
    </div>
  );
}

export default Login;
