import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 配置：React 插件 + 开发服务器（:5173）+ /api 代理到后端（:4000）。
// 不使用任何 Node API（如 path/__dirname），故无需 @types/node。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 开发期把 /api/* 透明转发到本地后端，避免 CORS。
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
