/**
 * Watermark —— 全屏平铺可见水印（CONTRACT §5）。
 *
 * 导出方式：统一具名导出（同时提供默认导出别名，便于灵活 import）。
 *
 * 特性：position:fixed 覆盖整屏、平铺重复、旋转 -22°、低透明度(.08)、
 * pointer-events:none、user-select:none、z-index:9999、文字色 var(--ink)。
 * 截图时一并入图，用于泄露溯源；不可点击、不可选中、不干扰交互。
 */
import type { CSSProperties } from 'react';

export interface WatermarkProps {
  /** 水印文案，如 "email · #id · YYYY-MM-DD HH:mm" 或 "访客 · 未登录"。 */
  label: string;
}

/** 平铺单元数量：配合放大的内层容器与旋转，足量铺满整屏。 */
const TILE_COUNT = 260;

const containerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  overflow: 'hidden',
  pointerEvents: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const innerStyle: CSSProperties = {
  // 放大并居中偏移，确保旋转后四角不留空白。
  position: 'absolute',
  top: '-50%',
  left: '-50%',
  width: '200%',
  height: '200%',
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  transform: 'rotate(-22deg)',
  transformOrigin: 'center',
  opacity: 0.08,
};

const cellStyle: CSSProperties = {
  width: '340px',
  padding: '46px 0',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  color: 'var(--ink)',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.05em',
};

export function Watermark({ label }: WatermarkProps) {
  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={innerStyle}>
        {Array.from({ length: TILE_COUNT }).map((_, i) => (
          <span key={i} style={cellStyle}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Watermark;
