/**
 * Mermaid —— 渲染 Mermaid 图表（CONTRACT §FE-reader）。
 *
 * 导出方式：统一具名导出（同时提供默认导出别名）。
 *
 * 实现要点：
 *  - mermaid.initialize({ startOnLoad:false, theme:'neutral', securityLevel:'strict' })，全局只初始化一次。
 *  - 每个实例用 useId 生成唯一 id，避免多图冲突。
 *  - 采用 mermaid.render(id, source) 异步生成 SVG 后注入容器（比 run() 更适合 React 受控渲染，
 *    且不会向 document.body 注入错误 DOM）；解析失败 try/catch 回退为原始代码块，避免整页崩。
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import mermaid from 'mermaid';

export interface MermaidProps {
  /** Mermaid 图表源码。 */
  chart: string;
}

let initialized = false;
/** 确保 mermaid 全局只初始化一次。 */
function ensureInitialized(): void {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'strict',
    fontFamily: 'var(--font-sans)',
  });
  initialized = true;
}

const wrapperStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  margin: '1.5rem 0',
  overflowX: 'auto',
};

export function Mermaid({ chart }: MermaidProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  // useId 含冒号，转为合法 DOM/CSS id。
  const renderId = `clw-mermaid-${reactId.replace(/[:]/g, '')}`;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    const source = chart.trim();
    if (!source) {
      host.innerHTML = '';
      return;
    }

    setFailed(false);
    ensureInitialized();

    (async () => {
      try {
        const { svg } = await mermaid.render(renderId, source);
        if (!cancelled && hostRef.current) {
          hostRef.current.innerHTML = svg;
        }
      } catch {
        // 解析/渲染失败：回退为原始代码块（见下方 JSX），不让异常冒泡导致整页白屏。
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, renderId]);

  if (failed) {
    // 回退：以代码块形式展示原始 mermaid 源码。
    return (
      <pre className="clw-pre clw-pre--fallback">
        <code>{chart}</code>
      </pre>
    );
  }

  return <div ref={hostRef} className="clw-mermaid" style={wrapperStyle} />;
}

export default Mermaid;
