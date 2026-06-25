/**
 * 顶部导航（sticky）。读取 useAuth 决定展示：
 *  - 未登录：登录 / 免费试读
 *  - 已登录：用户名 + 我的解锁 / 退出
 * 含中部链接 课程目录(/catalog)、课程码(/redeem)；品牌 Logo 链回首页(/)。
 * 导出约定：具名导出为准，附同名默认导出。
 */
import { Link, NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { Logo } from './Logo';
import styles from './Nav.module.css';

export function Nav(): JSX.Element {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = (): void => {
    logout();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    clsx(styles.link, isActive && styles.active);

  const isAuthed = status === 'authed' && !!user;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="返回首页">
          <Logo size="sm" />
        </Link>

        <nav className={styles.links} aria-label="主导航">
          <NavLink to="/catalog" className={linkClass}>
            课程目录
          </NavLink>
          <NavLink to="/redeem" className={linkClass}>
            课程码
          </NavLink>
        </nav>

        <div className={styles.actions}>
          {isAuthed ? (
            <>
              <span className={styles.user} title={user.email}>
                {user.displayName || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/redeem')}>
                我的解锁
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                退出
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                登录
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/catalog')}>
                免费试读
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Nav;
