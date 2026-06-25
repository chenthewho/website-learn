/**
 * 页脚：品牌 + 一句仿「苏格拉底来信」风格的中文寄语 + 版权。
 * 导出约定：具名导出为准，附同名默认导出。
 */
import { Logo } from './Logo';
import styles from './Footer.module.css';

const YEAR = new Date().getFullYear();

export function Footer(): JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo size="sm" />
        </div>
        <p className={styles.letter}>
          「亲爱的求知者：真正的学问，不在于记住多少答案，而在于敢于不断追问。
          愿你在每一次与机器、与自己的对话里，遇见更清醒、更自由的心智。」
        </p>
        <p className={styles.copy}>
          © {YEAR} Agent 学堂 · 从前端到 AI Agent 开发 · 保留所有权利
        </p>
      </div>
    </footer>
  );
}

export default Footer;
