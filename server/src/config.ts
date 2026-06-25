// 环境变量读取与校验：在模块加载期完成 fail-fast，缺少关键变量或格式非法时直接抛错。
import dotenv from 'dotenv';

// 从当前工作目录（server/）下的 .env 读取配置
dotenv.config();

/** 读取必填环境变量；缺失或为空字符串时抛错（启动期失败） */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`[config] 缺少必填环境变量 ${name}，请参考 .env.example 配置 .env`);
  }
  return value;
}

/** 读取可选字符串环境变量，缺失时回退到默认值 */
function envOr(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value;
}

/** 读取整数型环境变量，缺失时回退到默认值；非整数时抛错 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`[config] 环境变量 ${name} 必须为整数，当前值：${raw}`);
  }
  return parsed;
}

// 内容主密钥：必须为 64 位十六进制（32 字节），转成 Buffer 并校验长度
const masterKeyHex = requireEnv('CONTENT_MASTER_KEY');
if (!/^[0-9a-fA-F]{64}$/.test(masterKeyHex)) {
  throw new Error('[config] CONTENT_MASTER_KEY 必须为 64 位十六进制字符串（32 字节）');
}
const contentMasterKey: Buffer = Buffer.from(masterKeyHex, 'hex');
if (contentMasterKey.length !== 32) {
  throw new Error('[config] CONTENT_MASTER_KEY 解析后长度必须为 32 字节');
}

/** 应用配置（只读集中导出，供 db / http / 业务模块复用） */
export const config: {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
  };
  jwtSecret: string;
  contentMasterKey: Buffer;
  contentDir: string;
} = {
  port: envInt('PORT', 4000),
  nodeEnv: envOr('NODE_ENV', 'development'),
  corsOrigin: envOr('CORS_ORIGIN', 'http://localhost:5173'),
  db: {
    host: envOr('DB_HOST', '127.0.0.1'),
    port: envInt('DB_PORT', 3306),
    user: envOr('DB_USER', 'root'),
    password: envOr('DB_PASSWORD', 'course_pw'),
    database: envOr('DB_NAME', 'course_learn'),
    connectionLimit: envInt('DB_CONNECTION_LIMIT', 10),
  },
  jwtSecret: requireEnv('JWT_SECRET'),
  contentMasterKey,
  // 默认指向课程 docs 绝对路径（不把课程内容复制进仓库；导入脚本直接读此目录）
  contentDir: envOr('CONTENT_DIR', '/Users/thewho/code/project/ai-agent-learn/docs'),
};
