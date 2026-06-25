/**
 * 共享按钮原子。导出约定：以「具名导出」为准（其它页面 import { Button }），
 * 同时提供同名默认导出以增强健壮性。颜色一律用 theme.css 变量。
 */
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  /** 加载态：显示旋转图标并禁用交互。 */
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      // 显式默认 type=button，避免在表单中被误当作 submit
      type={type ?? 'button'}
      className={clsx(
        styles.btn,
        styles[variant],
        styles[size],
        loading && styles.loading,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}

export default Button;
