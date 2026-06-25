/**
 * MarkdownView —— Markdown 渲染（CONTRACT §FE-reader）。
 *
 * 导出方式：统一具名导出（同时提供默认导出别名）。
 *
 * 技术栈：react-markdown v9 + remark-gfm + rehype-slug + rehype-highlight。
 *  - 顶部 import 一个 highlight.js 主题 css（atom-one-dark）。
 *  - components 覆写：
 *      · pre：透明包裹（实际 <pre> 由 CodeBlock 渲染），避免 <pre> 嵌套。
 *      · code：language-mermaid → <Mermaid/>；其余块级 → <CodeBlock/>；行内 → 行内代码。
 *  - 表格 / 引用 / 标题 / 列表等排版交给 styles/markdown.css。
 */
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import '../styles/markdown.css';
import { CodeBlock } from './CodeBlock';
import { Mermaid } from './Mermaid';

export interface MarkdownViewProps {
  /** 已解密的 Markdown 文本。 */
  markdown: string;
}

export function MarkdownView({ markdown }: MarkdownViewProps) {
  const components: Components = useMemo(
    () => ({
      // 透明 <pre>：真正的代码块容器由 CodeBlock 渲染，避免 pre>pre 嵌套。
      pre({ children }) {
        return <>{children}</>;
      },
      code({ className, children }) {
        const cls = className ?? '';
        const text = String(children ?? '');
        // 区分块级/行内：有 language- 类，或内容含换行，视为块级。
        const isBlock = /language-/.test(cls) || text.includes('\n');

        if (!isBlock) {
          return <CodeBlock inline>{children}</CodeBlock>;
        }
        if (cls.includes('language-mermaid')) {
          return <Mermaid chart={text.replace(/\n$/, '')} />;
        }
        return <CodeBlock className={cls}>{children}</CodeBlock>;
      },
    }),
    [],
  );

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { ignoreMissing: true, detect: false }]]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownView;
