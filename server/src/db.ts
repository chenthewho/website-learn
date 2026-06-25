// MySQL 连接池与查询辅助（mysql2/promise）。
import mysql, {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';
import { config } from './config';

/** 全局连接池（应用生命周期内复用） */
export const pool: Pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4_general_ci',
});

/** 执行查询并返回行数组（SELECT 用） */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

/** 执行查询并返回首行；无结果返回 null */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** 执行写操作（INSERT/UPDATE/DELETE），返回结果头（含 insertId / affectedRows） */
export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

/**
 * 事务封装：自动 begin/commit；回调抛错时 rollback 并向上抛出；最终释放连接。
 * 在回调内务必使用传入的 conn 执行 SQL（如 conn.query / conn.execute），以保证落在同一事务。
 */
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
