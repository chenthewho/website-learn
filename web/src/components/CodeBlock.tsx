/**
 * CodeBlock —— 代码块 / 行内代码容器（CONTRACT §FE-reader）。
 *
 * 导出方式：统一具名导出（同时提供默认导出别名）。
 *
 * 说明：
 *  - 语法高亮由 rehype-highlight 在 hast 阶段完成（已给 <code> 加上 `hljs language-xxx` 类，
 *    并把 children 替换为带 token 类名的 <span>）。本组件只负责 <pre><code> 容器、深色背景、
 *    可选语言角标，以及行内代码样式。
 *  - 不提供复制按钮（按契约：禁用复制）。
 *  - 具体配色/排版见 styles/markdown.css，全部走 theme.css 变量。
 */
import type { ReactNode } from 'react';

export interface CodeBlockProps {
  /** 来自 markdown 的类名，块级形如 "hljs language-ts"。 */
  className?: string;
  /** 是否为行内代码。 */
  inline?: boolean;
  children: ReactNode;
}

/** 从 className 中解析语言名（用于角标），无则返回空串。 */
function parseLanguage(className: string | undefined): string {
  const m = /language-([\w-]+)/.exec(className ?? '');
  return m ? m[1] : '';
}

export function CodeBlock({ className, inline, children }: CodeBlockProps) {
  if (inline) {
    return <code className="clw-code-inline">{children}</code>;
  }

  const lang = parseLanguage(className);
  return (
    <div className="clw-codeblock">
      {lang ? <span className="clw-codeblock__lang">{lang}</span> : null}
      <pre className="clw-pre">
        {/* 保留 hljs / language-* 类以应用高亮主题样式 */}
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export default CodeBlock;
