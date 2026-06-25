-- ============================================================================
-- 课程学习平台 · 数据库 Schema（建库 + 建表 DDL）
-- 严格对应 CONTRACT.md §2。引擎 InnoDB，字符集 utf8mb4。
-- 本文件可重复执行（IF NOT EXISTS），同时被 docker initdb 与本地脚本复用。
-- docker-compose 将其挂载到 /docker-entrypoint-initdb.d/01-schema.sql 实现首次自动建表。
-- ============================================================================

CREATE DATABASE IF NOT EXISTS course_learn
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE course_learn;

-- ----------------------------------------------------------------------------
-- users：注册用户
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name  VARCHAR(60)  NOT NULL DEFAULT '',
  has_access    TINYINT(1)   NOT NULL DEFAULT 0,           -- 是否已用有效码解锁全册
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- chapters：章节（由导入脚本写入）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_order INT NOT NULL,                              -- 篇序（来自目录名 00..06）
  section_title VARCHAR(60) NOT NULL,                      -- 篇名（前言/基础篇/...）
  slug          VARCHAR(190) NOT NULL UNIQUE,              -- 稳定标识：如 "01-基础篇__01-从llm到agent"
  title         VARCHAR(190) NOT NULL,                     -- 章标题（取文件首个 H1，回退文件名）
  order_index   INT NOT NULL,                              -- 全局顺序（0 起，唯一）
  is_free       TINYINT(1) NOT NULL DEFAULT 0,             -- 仅 order_index=0 的章为 1（免费试读）
  word_count    INT NOT NULL DEFAULT 0,
  content       MEDIUMTEXT NOT NULL,                       -- 原始 Markdown（仅后端持有，绝不明文直出）
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order_index (order_index),
  KEY idx_order (order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- redemption_codes：兑换码（由 gen-codes 脚本写入）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS redemption_codes (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(40) NOT NULL UNIQUE,                  -- 形如 CLW-XXXX-XXXX-XXXX（大写无歧义字符）
  max_uses   INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  note       VARCHAR(120) NOT NULL DEFAULT '',             -- 批次备注
  expires_at DATETIME NULL,                                -- NULL=永不过期
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- redemptions：兑换流水（谁用了哪个码，可溯源）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS redemptions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_code_user (code_id, user_id),            -- 同一码同一用户只记一次
  KEY idx_redemptions_user (user_id),
  CONSTRAINT fk_redemptions_code FOREIGN KEY (code_id) REFERENCES redemption_codes(id),
  CONSTRAINT fk_redemptions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
