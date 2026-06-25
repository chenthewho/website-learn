/**
 * 前端入口：引入全局设计 token（theme.css），用 createRoot 渲染 <App/>。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('找不到 #root 挂载点');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
