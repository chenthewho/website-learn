/**
 * 纸感卡片原子（--surface / --shadow-sm / --r-md）。
 * 导出约定：具名导出为准，附同名默认导出。
 */
import type { ElementType, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** 渲染为哪个 HTML 标签，默认 div（如 'article'、'li'）。 */
  as?: keyof JSX.IntrinsicElements;
}

export function Card({ children, className, as }: CardProps): JSX.Element {
  const Tag = (as ?? 'div') as ElementType;
  return <Tag className={clsx(styles.card, className)}>{children}</Tag>;
}

export default Card;
