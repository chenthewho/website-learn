/**
 * 「Agent 学堂」文字标识（衬线）+ 简笔对话图标。
 * 导出约定：具名导出为准，附同名默认导出。
 */
import clsx from 'clsx';
import styles from './Logo.module.css';

export interface LogoProps {
  size?: 'sm' | 'md';
}

export function Logo({ size = 'md' }: LogoProps): JSX.Element {
  return (
    <span className={clsx(styles.logo, styles[size])} aria-label="Agent 学堂">
      <span className={styles.mark} aria-hidden="true">
        {/* 对话气泡 + 三点：呼应「苏格拉底式追问」的学习意象 */}
        <svg viewBox="0 0 24 24" className={styles.icon} role="presentation">
          <path
            fill="currentColor"
            d="M6 4h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7l-4 3.4V16H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"
          />
          <circle cx="8.5" cy="10" r="1.05" fill="var(--paper)" />
          <circle cx="12" cy="10" r="1.05" fill="var(--paper)" />
          <circle cx="15.5" cy="10" r="1.05" fill="var(--paper)" />
        </svg>
      </span>
      <span className={styles.word}>Agent 学堂</span>
    </span>
  );
}

export default Logo;
