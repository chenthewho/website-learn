# 课程学习平台 · 工程契约 (CONTRACT) — 单一事实来源

> 本文件是所有开发 Agent 必须严格遵守的唯一契约。任何接口形状、加密方案、数据结构、目录归属、设计 token 都以本文件为准。**动手前先完整读完本文件。**

平台：模仿 socratopia.app 风格的**付费课程展示/阅读网站**。内容为《从前端到 AI Agent 开发》中文电子书（31 章 Markdown）。前端 TS+React(Vite)，后端 Node.js(TS)+Express+MySQL(docker-compose)，CLI 管理脚本。

---

## 0. 仓库总览与目录归属（严格 — 各 Agent 只写自己拥有的文件）

```
website-learn/
├── CONTRACT.md                      # 本文件（只读，勿改）
├── README.md                        # [Integrate] 根说明：安装/运行/脚本
├── .gitignore                       # [Scaffold]
├── docker-compose.yml               # [Scaffold] MySQL 8（含 initdb 挂载 schema.sql）
├── package.json                     # [Scaffold] 根：仅 workspaces + 便捷脚本（无依赖）
├── shared/
│   └── types.ts                     # [Scaffold] 前后端共享的 TS 类型与常量（接口契约）
├── server/
│   ├── package.json tsconfig.json .env.example   # [Scaffold]
│   ├── content/                     # [Scaffold] 从课程 docs 复制来的 .md（导入源，非对外）
│   ├── db/schema.sql                # [Scaffold] 建库建表 DDL（也被 docker initdb 使用）
│   └── src/
│       ├── index.ts                 # [BE-core] Express 应用装配与启动
│       ├── config.ts                # [Scaffold] 读取 env（含校验）
│       ├── db.ts                    # [Scaffold] mysql2 连接池 + query 辅助
│       ├── http.ts                  # [Scaffold] 统一响应封装 ok()/fail() + AppError + asyncHandler
│       ├── crypto.ts                # [BE-core] HKDF 派生、AES-GCM 加密、零宽水印
│       ├── auth/jwt.ts              # [BE-core] 签发/校验 JWT
│       ├── auth/password.ts         # [BE-core] bcrypt 哈希/校验
│       ├── middleware/auth.ts       # [BE-core] optionalAuth / requireAuth / requireUser
│       ├── middleware/rateLimit.ts  # [BE-core] 限流器（auth 严格、内容中等）
│       ├── services/userService.ts  # [BE-data] 用户 CRUD
│       ├── services/chapterService.ts # [BE-data] 章节查询 + 访问可见性
│       ├── services/codeService.ts  # [BE-data] 兑换码校验/兑换（事务）
│       ├── routes/auth.ts           # [BE-routes] /api/auth/*
│       ├── routes/chapters.ts       # [BE-routes] /api/chapters/*
│       ├── routes/codes.ts          # [BE-routes] /api/codes/*
│       └── scripts/importContent.ts gen-codes.ts list-users.ts grant-access.ts  # [BE-scripts]
└── web/
    ├── package.json tsconfig.json tsconfig.node.json vite.config.ts index.html .env.example  # [Scaffold]
    └── src/
        ├── main.tsx App.tsx                 # [FE-core] 入口 + 路由
        ├── vite-env.d.ts                    # [Scaffold]
        ├── styles/theme.css                 # [Scaffold] 设计 token（CSS 变量）+ 全局 reset
        ├── styles/markdown.css              # [FE-reader] 阅读器排版样式
        ├── lib/api.ts                       # [FE-core] fetch 封装 + 类型化端点
        ├── lib/crypto.ts                    # [FE-core] WebCrypto AES-GCM 解密
        ├── context/AuthContext.tsx          # [FE-core] 鉴权 + contentKey（仅内存）
        ├── components/ (Nav, Footer, Button, Card, Logo, ...)   # [FE-ui]
        ├── components/Watermark.tsx         # [FE-reader] 全屏平铺水印
        ├── components/MarkdownView.tsx Mermaid.tsx CodeBlock.tsx  # [FE-reader]
        ├── hooks/useProtection.ts           # [FE-reader] 禁复制/右键/选择 + DevTools 检测
        ├── pages/Landing.tsx                # [FE-ui] 营销首页（模仿 socratopia）
        ├── pages/Login.tsx Register.tsx     # [FE-ui]
        ├── pages/Catalog.tsx                # [FE-ui] 课程目录（章节卡片 + 锁状态）
        ├── pages/Reader.tsx                 # [FE-reader] 章节阅读器（解密 + 防护 + 水印）
        └── pages/Redeem.tsx                 # [FE-ui] 输入课程码解锁
```

**铁律**：Agent 只创建/编辑“归属标签”属于自己的文件。`package.json`/`tsconfig`/`vite.config`/`theme.css`/`shared/types.ts`/`schema.sql` 由 Scaffold 一次性写全，实现 Agent **不得改动**它们（如发现缺依赖，记录在返回里交给 Integrate 阶段统一加）。

---

## 1. 技术栈与依赖（精确 — Scaffold 按此写 package.json，勿增减大版本）

- Node 18（CommonJS + `tsx` 运行 TS；`tsc` 仅做类型检查/构建）。
- **server/package.json**
  - dependencies: `express@^4.19`, `mysql2@^3.11`, `jsonwebtoken@^9.0`, `bcryptjs@^2.4`, `zod@^3.23`, `cors@^2.8`, `helmet@^7.1`, `express-rate-limit@^7.4`, `morgan@^1.10`, `dotenv@^16.4`, `nanoid@^3.3.7`
  - devDependencies: `typescript@^5.5`, `tsx@^4.16`, `@types/node@^20`, `@types/express@^4.17`, `@types/jsonwebtoken@^9.0`, `@types/bcryptjs@^2.4`, `@types/cors@^2.8`, `@types/morgan@^1.9`
  - scripts: `"dev":"tsx watch src/index.ts"`, `"build":"tsc -p tsconfig.json"`, `"start":"node dist/index.js"`, `"typecheck":"tsc --noEmit"`, `"import":"tsx src/scripts/importContent.ts"`, `"gen-codes":"tsx src/scripts/gen-codes.ts"`, `"list-users":"tsx src/scripts/list-users.ts"`, `"grant-access":"tsx src/scripts/grant-access.ts"`
  - tsconfig: `module:"commonjs"`, `target:"ES2021"`, `moduleResolution:"node"`, `esModuleInterop:true`, `strict:true`, `outDir:"dist"`, `rootDir:"src"`, `skipLibCheck:true`, `resolveJsonModule:true`. **注意**：nanoid 用的是 3.x（CJS 友好）。
- **web/package.json**
  - dependencies: `react@^18.3`, `react-dom@^18.3`, `react-router-dom@^6.26`, `react-markdown@^9.0`, `remark-gfm@^4.0`, `rehype-highlight@^7.0`, `rehype-slug@^6.0`, `highlight.js@^11.10`, `mermaid@^11`, `clsx@^2.1`
  - devDependencies: `typescript@^5.5`, `vite@^5.4`, `@vitejs/plugin-react@^4.3`, `@types/react@^18.3`, `@types/react-dom@^18.3`
  - scripts: `"dev":"vite"`, `"build":"tsc -b && vite build"`, `"preview":"vite preview"`, `"typecheck":"tsc -b --noEmit"` (若 `-b --noEmit` 不被支持则用 `"typecheck":"tsc --noEmit -p tsconfig.json"`)
  - `vite.config.ts`：plugin-react；`server.proxy` 把 `/api` 代理到 `http://localhost:4000`；`server.port:5173`。
  - tsconfig：`strict`, `jsx:"react-jsx"`, `module:"ESNext"`, `moduleResolution:"Bundler"`, `target:"ES2020"`, `lib:["ES2020","DOM","DOM.Iterable"]`, `skipLibCheck:true`, `noEmit:true`。

---

## 2. 数据库 Schema（server/db/schema.sql — Scaffold 写）

库名 `course_learn`，引擎 InnoDB，`utf8mb4`。schema.sql 开头 `CREATE DATABASE IF NOT EXISTS course_learn ...; USE course_learn;`（docker initdb 与脚本都能用）。

```sql
-- users
id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
email         VARCHAR(190) NOT NULL UNIQUE
password_hash VARCHAR(100) NOT NULL
display_name  VARCHAR(60)  NOT NULL DEFAULT ''
has_access    TINYINT(1)   NOT NULL DEFAULT 0   -- 是否已用有效码解锁全册
created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP

-- chapters（导入脚本写入）
id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
section_order INT NOT NULL                      -- 篇序（来自目录名 00..06）
section_title VARCHAR(60) NOT NULL              -- 篇名（前言/基础篇/...）
slug          VARCHAR(190) NOT NULL UNIQUE      -- 稳定标识：如 "01-基础篇__01-从llm到agent"
title         VARCHAR(190) NOT NULL             -- 章标题（取文件首个 H1，回退文件名）
order_index   INT NOT NULL                      -- 全局顺序（0 起，唯一）
is_free       TINYINT(1) NOT NULL DEFAULT 0     -- 仅 order_index=0 的章为 1（免费试读）
word_count    INT NOT NULL DEFAULT 0
content       MEDIUMTEXT NOT NULL               -- 原始 Markdown（仅后端持有，绝不明文直出）
updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
KEY idx_order (order_index)

-- redemption_codes（兑换码 — gen-codes 写入）
id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
code          VARCHAR(40) NOT NULL UNIQUE       -- 形如 CLW-XXXX-XXXX-XXXX（大写无歧义字符）
max_uses      INT NOT NULL DEFAULT 1
used_count    INT NOT NULL DEFAULT 0
note          VARCHAR(120) NOT NULL DEFAULT ''  -- 批次备注
expires_at    DATETIME NULL                     -- NULL=永不过期
created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

-- redemptions（兑换流水 — 谁用了哪个码，可溯源）
id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
code_id       BIGINT UNSIGNED NOT NULL
user_id       BIGINT UNSIGNED NOT NULL
redeemed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY uniq_code_user (code_id, user_id)     -- 同一码同一用户只记一次
FOREIGN KEY (code_id) REFERENCES redemption_codes(id)
FOREIGN KEY (user_id) REFERENCES users(id)
```

---

## 3. 共享类型（shared/types.ts — Scaffold 写；前后端都从这里 import 类型）

```ts
export interface PublicUser { id: number; email: string; displayName: string; hasAccess: boolean; }
export interface ChapterMeta {
  id: number; sectionOrder: number; sectionTitle: string;
  slug: string; title: string; orderIndex: number;
  isFree: boolean; locked: boolean;   // locked = 当前请求者无权读取
  wordCount: number;
}
export interface EncryptedPayload { iv: string; data: string; tag: string; } // 均为 base64
export interface ChapterContentResponse extends EncryptedPayload {
  meta: { chapterId: number; title: string; updatedAt: string; };
}
export interface AuthResponse { token: string; user: PublicUser; contentKey: string; } // contentKey: hex(32B)
export interface MeResponse { user: PublicUser; contentKey: string; }
export interface GuestResponse { token: string; contentKey: string; }
export interface ApiOk<T>  { ok: true;  data: T; }
export interface ApiErr    { ok: false; error: { code: string; message: string; }; }
export type ApiResponse<T> = ApiOk<T> | ApiErr;
export const FREE_PREVIEW_LIMIT = 1; // 未解锁可读章数
```

---

## 4. HTTP API 契约（全部前缀 `/api`；统一信封 `{ok:true,data}` / `{ok:false,error:{code,message}}`）

鉴权头：`Authorization: Bearer <token>`。错误码集合：`VALIDATION`,`UNAUTHORIZED`,`EMAIL_TAKEN`,`BAD_CREDENTIALS`,`NOT_FOUND`,`LOCKED`,`INVALID_CODE`,`CODE_EXHAUSTED`,`CODE_EXPIRED`,`ALREADY_HAS_ACCESS`,`RATE_LIMITED`,`INTERNAL`。

| 方法 | 路径 | 鉴权 | 请求体 | data 响应 |
|---|---|---|---|---|
| POST | `/api/auth/register` | 无 | `{email,password,displayName?}` | `AuthResponse` |
| POST | `/api/auth/login` | 无 | `{email,password}` | `AuthResponse` |
| GET  | `/api/auth/me` | requireUser | — | `MeResponse` |
| POST | `/api/auth/guest` | 无 | — | `GuestResponse`（typ=guest，仅供免费章解密） |
| GET  | `/api/chapters` | optionalAuth | — | `{chapters: ChapterMeta[]}`（按 orderIndex；locked 依请求者权限计算） |
| GET  | `/api/chapters/:id/content` | requireAuth(user 或 guest) | — | `ChapterContentResponse`，无权 → 403 `LOCKED` |
| POST | `/api/codes/redeem` | requireUser | `{code}` | `{hasAccess:true}` |
| GET  | `/api/health` | 无 | — | `{status:'ok'}` |

**校验（zod）**：email 合法且 ≤190；password 8–72 字符；displayName ≤60；code 去空格转大写后匹配 `^CLW-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`（但服务端按 DB 精确匹配即可，格式校验只为早失败）。

**访问可见性（access 规则，服务端唯一裁决，前端只做展示）**：
- `chapter.isFree === true` → 任何人（含未登录/guest/user）都可读，`locked=false`。
- 否则：仅当 `principal.typ==='user'` 且 `user.has_access===true` 时可读；其余 `locked=true`，`/content` 返回 403 `LOCKED`。
- guest token 只能读 `isFree` 章；请求非免费章一律 403 `LOCKED`。

---

## 5. 加密与水印方案（BE-core `crypto.ts` + FE-core `lib/crypto.ts` 必须严格对齐）

目标：内容**绝不以明文出现在任何网络响应/前端 bundle**；普通用户在 Network/Console 只能看到 base64 密文；密钥仅在登录/guest 初始化时单独下发一次，之后内容响应不再携带密钥。

**密钥派生（服务端）**：`CONTENT_MASTER_KEY` = 64 hex（32 字节）存于 env。
```
contentKey(principal) = HKDF-SHA256(
  ikm  = bytes(CONTENT_MASTER_KEY),
  salt = utf8("clw|" + typ + "|" + subjectId),   // typ ∈ {user,guest}; subjectId = userId 或 guestId
  info = utf8("content-key-v1"),
  L    = 32
) → 返回 hex 字符串（即 AuthResponse.contentKey / GuestResponse.contentKey）
```
Node 实现：`crypto.hkdfSync('sha256', ikm, salt, info, 32)`。**服务端永远自己从 JWT 的 sub/typ 重新派生 key 来加密，绝不信任客户端传来的 key。** 客户端独立持有同一把 key（登录/guest 时下发）用于解密 → 内容响应里不含 key。

**内容加密（每次 `/content` 请求）**：
1. 取章节 Markdown，先注入零宽水印（见下）。
2. `iv = randomBytes(12)`；`cipher = createCipheriv('aes-256-gcm', key, iv)`；`enc = cipher.update(utf8)+final()`；`tag = cipher.getAuthTag()`（16B）。
3. 返回 `{ iv:b64(iv), data:b64(enc), tag:b64(tag), meta:{...} }`。

**客户端解密（WebCrypto，`lib/crypto.ts`）**：
```
key = await subtle.importKey('raw', hexToBytes(contentKey), {name:'AES-GCM'}, false, ['decrypt'])
combined = concat(b64ToBytes(data), b64ToBytes(tag))   // WebCrypto 要求密文尾部拼接 tag
plain = await subtle.decrypt({name:'AES-GCM', iv:b64ToBytes(iv), tagLength:128}, key, combined)
markdown = new TextDecoder().decode(plain)
```

**零宽水印（服务端，注入进明文后再加密，用于泄露溯源）**：把 `userId(或 guest):issuedAtEpoch` 编码为零宽字符（位 0→U+200B，位 1→U+200C，分隔用 U+200D），追加到内容末尾且可在每个二级标题后插入一处。前端渲染时这些零宽字符不可见但会随复制/截图外泄（截图无效，复制有效），可溯源。导出函数 `embedWatermark(md, label)` / 仅服务端使用。

**可见水印（前端 `Watermark.tsx`）**：全屏 `position:fixed` 平铺、旋转 -22°、低透明度（约 0.08）、`pointer-events:none`、`z-index:9999`、`user-select:none`，文案 = `email · #userId · YYYY-MM-DD HH:mm`（guest 用“访客 · 未登录”）。覆盖整个阅读器，截图时一并入图。

---

## 6. 内容防护强度 = “强力但平滑”（FE-reader `useProtection.ts` + Reader/全局）

启用项：
- 阅读器容器与全局 `user-select:none`（输入框/代码可单独允许选中？否——统一禁选以防复制；登录表单输入框需可用，故仅对内容区与 body 默认禁选，`input,textarea` 显式 `user-select:text`）。
- 监听并 `preventDefault`：`contextmenu`（右键）、`copy`、`cut`、`dragstart`、`selectstart`（在内容区）。可选拦截 `Ctrl/Cmd+C/S/U/P` 与 `PrintScreen`（PrintScreen 仅尽力，浏览器无法真正阻止截图）。
- DevTools 检测（尺寸差阈值 + `debugger` 计时法，节流执行）：**检测到时显示一层可关闭/自动复检的警告遮罩并模糊内容**，而非永久白屏；DevTools 关闭后自动恢复。
- 内容通过 §5 加密下发并在内存解密；解密后的 Markdown 不写入任何持久存储；不在 DOM 里留可整段复制的纯文本副本之外的明文（正常渲染即可）。
- **诚实声明**：以上均为“提高门槛/可溯源”的尽力措施，无法对抗有决心的技术用户（浏览器端代码与像素终究可达）。Integrate 阶段需在 README 写明此局限。表单页（登录/注册/兑换）不启用禁选，保证可用性。

---

## 7. 设计系统（Scaffold 写入 `web/src/styles/theme.css`；所有 UI Agent 复用这些变量，勿硬编码颜色）

参照 socratopia：**学术 + 温暖纸感 + 克制的活泼**。衬线大标题、充足留白、米白纸底、卡片化课程世界、紫靛/暖金点缀。

```css
:root{
  /* 颜色 */
  --paper:#FAF7F0; --paper-2:#F3EEE3; --surface:#FFFFFF;
  --ink:#1B1A17; --ink-soft:#5A5246; --ink-faint:#8C8472;
  --accent:#5A4FE0; --accent-ink:#3A32A8; --accent-soft:#ECE9FB;
  --gold:#E0A335; --gold-soft:#FBF1DC;
  --success:#2F855A; --danger:#C0392B;
  --line:#E9E1D2; --line-strong:#D9CFBA;
  /* 字体 */
  --font-serif:"Noto Serif SC","Source Han Serif SC",Georgia,"Songti SC",serif;
  --font-sans:"Noto Sans SC",Inter,system-ui,-apple-system,"PingFang SC",sans-serif;
  --font-mono:"JetBrains Mono","Fira Code",ui-monospace,Menlo,monospace;
  /* 间距/圆角/阴影 */
  --r-sm:8px; --r-md:14px; --r-lg:22px; --r-pill:999px;
  --shadow-sm:0 1px 2px rgba(27,26,23,.06),0 1px 1px rgba(27,26,23,.04);
  --shadow-md:0 8px 24px rgba(27,26,23,.08);
  --shadow-lg:0 24px 60px rgba(58,50,168,.12);
  --maxw:1120px;
}
```
- 字体通过 `web/index.html` 的 Google Fonts `<link>` 引入：Noto Serif SC、Noto Sans SC、Inter、JetBrains Mono（带 `display=swap`）。
- 标题用 `--font-serif`，正文用 `--font-sans`，代码用 `--font-mono`。
- 组件统一圆角、柔和阴影、纸感背景；按钮主态为 `--accent` 实心 + 圆角 pill，次态描边。
- 落地页区块（参照 socratopia，改造为本课程主题）：① 顶部导航（Logo「Agent 学堂」/课程/价格/登录-开始学习）② Hero：衬线大标题 + 一句副标题 + 主 CTA「免费试读第一章」+ 次 CTA「输入课程码解锁」，配一段“对话/学习”意象③ 5 大学习篇章卡片（前言/基础/核心能力/工程/实战面试，各配 emoji 或简笔图标 + 一句话）④ “为什么是这本书”三特点（双语代码/框架无关/工程实战，取自 docs/README.md）⑤ 解锁说明（试读→课程码→全册）⑥ 页脚。文案取自 `docs/README.md` 与 `00-序言与导读.md`，中文。

---

## 8. 内容导入脚本（BE-scripts `importContent.ts`）规则

- 源目录：`CONTENT_DIR`（env，默认 `./content`，即 server/content）。遍历一级子目录 `NN-篇名/`（排除根 `README.md` 不作为章节）。
- 每个子目录名 `00-前言` → `section_order=0`, `section_title="前言"`（split 第一个 `-`）。目录内 `.md` 文件按文件名排序。
- 文件名 `00-序言与导读.md` → 章 `title` 取文件内首个 `# H1`（去掉前导 `#`），回退为去序号文件名。`slug = "<dir>__<filebase>"`（保留中文，URL 端用 id 而非 slug 导航，slug 仅唯一标识）。
- 全局 `order_index` 按 (section_order, 文件序) 递增从 0 开始；`is_free = (order_index===0)`。
- `word_count`：去除代码块后按中文字符 + 英文词估算（粗略即可）。
- `content`：文件原始 Markdown 全文。脚本用 `INSERT ... ON DUPLICATE KEY UPDATE`（按 slug）实现幂等可重跑。
- 运行：`npm run import`。打印导入了多少章、哪一章是免费试读。

其余脚本：`gen-codes.ts`（参数 `--count N --uses M --note "批次" --expires YYYY-MM-DD`，用 nanoid 大写无歧义字母表生成 `CLW-XXXX-XXXX-XXXX`，写库并打印）；`list-users.ts`（打印用户与是否解锁、兑换记录）；`grant-access.ts`（参数 email，手动给某用户解锁，便于测试）。

---

## 9. 运行方式（README 由 Integrate 写）

1. `docker compose up -d`（起 MySQL 8，自动执行 schema.sql 建库建表）。
2. server：`cp .env.example .env`（填好随机 `JWT_SECRET`/`CONTENT_MASTER_KEY`）→ `npm i` → `npm run import` → `npm run dev`（:4000）。
3. 生成码：`npm run gen-codes -- --count 20 --uses 1 --note 首发`。
4. web：`npm i` → `npm run dev`（:5173，已代理 /api）。

环境变量（server/.env.example）：`PORT=4000`、`DB_HOST=127.0.0.1`、`DB_PORT=3306`、`DB_USER=root`、`DB_PASSWORD=course_pw`、`DB_NAME=course_learn`、`JWT_SECRET=<改我>`、`CONTENT_MASTER_KEY=<64位hex，改我>`、`CONTENT_DIR=./content`、`CORS_ORIGIN=http://localhost:5173`、`NODE_ENV=development`。docker-compose 的 MySQL root 密码与 `DB_PASSWORD` 一致（`course_pw`），数据库名 `course_learn`。

---

## 10. 质量红线（所有 Agent）

- 严格 TypeScript（`strict:true`），不留 `any` 漏网（必要处 `unknown`+收窄）。两端 `npm run typecheck` 必须 0 错误（Integrate 负责跑通）。
- 访问控制只在服务端裁决；前端的 locked 只用于 UI。`/content` 必须强制 §4 规则。
- 不硬编码密钥；从 env 读。密码 bcrypt（cost≥10）。JWT 有 exp。
- 中文 UI 文案；代码注释中文；标识符英文。
- 不引入契约之外的大依赖；颜色/字体一律用 theme.css 变量。
- 错误统一走 `http.ts` 的 AppError + 信封，不向客户端泄露堆栈。
