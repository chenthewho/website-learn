// Express 应用装配与启动：安全头、CORS、JSON 解析、访问日志、健康检查、业务路由、统一错误处理。
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { ok, AppError, errorMiddleware } from './http';
import { authRouter } from './routes/auth';
import { chaptersRouter } from './routes/chapters';
import { codesRouter } from './routes/codes';

const app = express();

// 反向代理后部署时，使限流等按真实客户端 IP 工作
app.set('trust proxy', 1);

// 安全响应头
app.use(helmet());
// 跨域：仅放行前端来源，允许携带凭证
app.use(cors({ origin: config.corsOrigin, credentials: true }));
// JSON 请求体解析（限制体积，防滥用）
app.use(express.json({ limit: '1mb' }));
// 开发环境打印访问日志
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// 健康检查
app.get('/api/health', (_req, res) => {
  ok(res, { status: 'ok' });
});

// 业务路由
app.use('/api/auth', authRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/codes', codesRouter);

// 未匹配任何路由 → 统一 404（交给错误中间件输出标准信封）
app.use((req, _res, next) => {
  next(new AppError('NOT_FOUND', `未找到接口：${req.method} ${req.originalUrl}`, 404));
});

// 统一错误处理（必须最后挂载）
app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`[server] 课程学习平台后端已启动 → http://localhost:${config.port}（环境：${config.nodeEnv}）`);
});
