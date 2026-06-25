/**
 * useProtection —— 内容防护 Hook（CONTRACT §6）。
 *
 * 职责：
 *  1) enabled 时在 document 上拦截 contextmenu / copy / cut / dragstart / selectstart，
 *     并尽力拦截 Ctrl/Cmd+C/X/S/U/P 与 PrintScreen 键。
 *  2) 节流（每 ~1s）检测开发者工具是否打开（窗口尺寸差阈值 + 可选 debugger 计时），
 *     通过返回的 devtoolsOpen 让上层对内容做模糊遮罩；关闭后自动恢复。
 *
 * 诚实声明：以上均为“提高门槛 / 便于溯源”的尽力措施，无法对抗有决心的技术用户
 * （浏览器端代码与像素终究可达）。
 */
import { useEffect, useState } from 'react';

export interface UseProtectionOptions {
  /** 是否启用防护（通常仅在真正展示解密内容时为 true）。 */
  enabled: boolean;
}

export interface UseProtectionResult {
  /** 是否检测到开发者工具开启。 */
  devtoolsOpen: boolean;
}

/** 窗口外内尺寸差阈值（像素）：超过则判定 DevTools 可能停靠开启。 */
const SIZE_GAP_THRESHOLD = 160;
/** DevTools 检测节流间隔（毫秒）。 */
const CHECK_INTERVAL_MS = 1000;
/**
 * 是否启用 `debugger` 计时陷阱作为补充检测（默认关闭）。
 * 开启后：DevTools 关闭时 `debugger` 为即时空操作（无卡顿）；DevTools 打开时会被反复
 * 命中暂停以增加调试成本。考虑到“谨慎避免卡顿”，默认关闭，仅保留窗口尺寸启发式。
 */
const ENABLE_DEBUGGER_TRAP = false;
/** debugger 计时阈值（毫秒）：耗时超过则判定 DevTools 打开。 */
const DEBUGGER_DELAY_THRESHOLD = 120;

export function useProtection({ enabled }: UseProtectionOptions): UseProtectionResult {
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      // 关闭防护时确保状态复位，避免离开后内容仍被模糊。
      setDevtoolsOpen(false);
      return;
    }

    // 统一的“阻止默认行为”处理器（右键 / 复制 / 剪切 / 拖拽 / 起始选择）。
    const prevent = (e: Event): void => {
      e.preventDefault();
    };

    // 键盘拦截：Ctrl/Cmd + C/X/S/U/P，以及 PrintScreen（尽力，浏览器无法真正阻止截图）。
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ['c', 'x', 's', 'u', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('dragstart', prevent);
    document.addEventListener('selectstart', prevent);
    document.addEventListener('keydown', onKeyDown);

    // —— DevTools 检测（节流）——
    const detect = (): boolean => {
      // 1) 窗口外内尺寸差启发式：停靠式 DevTools 会显著拉大该差值。
      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;
      let open = widthGap > SIZE_GAP_THRESHOLD || heightGap > SIZE_GAP_THRESHOLD;

      // 2) 可选：debugger 计时陷阱（覆盖独立窗口 DevTools 的情况）。
      if (!open && ENABLE_DEBUGGER_TRAP) {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        if (performance.now() - start > DEBUGGER_DELAY_THRESHOLD) {
          open = true;
        }
      }
      return open;
    };

    const tick = (): void => {
      const open = detect();
      // 仅在变化时 setState，避免无谓渲染；关闭后自动恢复（非永久白屏）。
      setDevtoolsOpen((prev) => (prev !== open ? open : prev));
    };

    tick();
    const timer = window.setInterval(tick, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('dragstart', prevent);
      document.removeEventListener('selectstart', prevent);
      document.removeEventListener('keydown', onKeyDown);
      window.clearInterval(timer);
    };
  }, [enabled]);

  return { devtoolsOpen };
}

export default useProtection;
