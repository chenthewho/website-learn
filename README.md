# Agent 学堂 · 从前端到 AI Agent 开发

一个模仿 [socratopia.app](https://socratopia.app) 风格的**付费课程展示 / 阅读网站**。内容为《从前端到 AI Agent 开发》中文电子书（共 31 章 Markdown）。第一章永久免费试读，其余章节通过**课程码（兑换码）**一次性解锁全册。

平台核心特性：

- 学术 + 温暖纸感的设计系统（衬线大标题、米白纸底、紫靛 / 暖金点缀）。
- 章节正文**全程加密下发**：内容绝不以明文出现在任何网络响应或前端 bundle 中，普通用户在浏览器 Network / Console 里只能看到 base64 密文。
- 多层内容防护：禁复制 / 右键 / 选择、开发者工具检测遮罩、全屏可见水印、服务端零宽水印溯源。
- 访问控制**只在服务端裁决**，前端的锁状态仅用于 UI 展示与引导。

> 本仓库的唯一权威工程契约见 [`CONTRACT.md`](./CONTRACT.md)（接口形状、加密方案、目录归属、设计 token 均以其为准）。

---

## 一、整体架构

```
┌─────────────────────────┐        /api 代理         ┌──────────────────────────┐
│  前端 web (Vite + React) │ ───────────────────────▶ │  后端 server (Express)     │
│  :5173                   │   Bearer <JWT> 鉴权       │  :4000                     │
│                          │                          │                            │
│  · 营销落地页 / 目录      │   加密载荷 {iv,data,tag}  │  · JWT 签发与校验           │
│  · 阅读器（内存解密）     │ ◀─────────────────────── │  · HKDF 派生内容密钥        │
│  · 可见水印 + 防护        │                          │  · AES-256-GCM 加密正文     │
│  · contentKey 仅存内存    │                          │  · 零宽水印注入溯源         │
└─────────────────────────┘                          └─────────────┬──────────────┘
                                                                    │ mysql2 连接池
                                                                    ▼
                                                       ┌──────────────────────────┐
                                                       │  MySQL 8 (docker-compose) │
                                                       │  库 course_learn          │
                                                       │  users / chapters /       │
                                                       │  redemption_codes /       │
                                                       │  redemptions              │
                                                       └──────────────────────────┘
```

- **前端（`web/`）**：Vite + React 18 + TypeScript。负责营销落地页、登录 / 注册、课程目录、课程码兑换、章节阅读器。阅读器在内存中用 WebCrypto 解密正文，叠加可见水印与内容防护。开发期所有 `/api` 请求由 Vite `server.proxy` 透明转发到后端 `:4000`，避免跨域。
- **后端（`server/`）**：Node.js + Express + TypeScript（CommonJS，`tsx` 运行，`tsc` 仅做类型检查 / 构建）。负责鉴权、访问可见性裁决、内容加密下发、兑换码事务、内容导入与运维脚本。统一响应信封 `{ok:true,data}` / `{ok:false,error:{code,message}}`。
- **数据库（MySQL 8）**：由 `docker-compose.yml` 拉起，首次启动自动执行 `server/db/schema.sql` 建库建表（`utf8mb4`，InnoDB）。
- **共享类型（`shared/types.ts`）**：前后端共用的 TypeScript 接口与常量，是接口契约的单一事实来源，前后端均从此 import。

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + React Router v6 + TypeScript（严格模式） |
| 前端构建 | Vite 5（`@vitejs/plugin-react`） |
| Markdown 渲染 | react-markdown v9 + remark-gfm + rehype-slug + rehype-highlight + highlight.js |
| 图表 | mermaid v11（异步 `render` 受控注入，失败回退原始代码块） |
| 前端加密 | WebCrypto `SubtleCrypto`（AES-256-GCM 解密） |
| 后端框架 | Express 4 + TypeScript（CommonJS，`tsx` 运行） |
| 数据库 / 驱动 | MySQL 8 + mysql2 连接池 |
| 鉴权 | jsonwebtoken（JWT，含 exp）+ bcryptjs（密码哈希，cost ≥ 10） |
| 加密 / 派生 | Node `crypto`：HKDF-SHA256 派生 + AES-256-GCM 加密 + 零宽水印 |
| 校验 / 安全中间件 | zod、helmet、cors、express-rate-limit、morgan |
| 兑换码生成 | nanoid 3.x（无歧义大写字母表） |
| 容器化 | Docker Compose（MySQL 8） |

> 依赖主版本以 `CONTRACT.md §1` 为准，请勿擅自升级大版本。Node 要求 `>= 18`。

---

## 三、目录结构

```
website-learn/
├── CONTRACT.md                 # 唯一权威工程契约（只读）
├── README.md                   # 本文件
├── docker-compose.yml          # MySQL 8（首次启动挂载 schema.sql 建库建表）
├── package.json                # 根：npm workspaces + 便捷转发脚本（本身不装依赖）
├── package-lock.json           # 工作区统一锁文件（依赖 hoist 到根 node_modules）
├── shared/
│   └── types.ts                # 前后端共享 TS 类型与常量（接口契约）
├── server/
│   ├── package.json tsconfig.json .env.example
│   ├── content/                # 课程 .md 导入源（gitignore，不入库仓库）
│   ├── db/schema.sql           # 建库建表 DDL（docker initdb 与脚本共用）
│   └── src/
│       ├── index.ts            # Express 装配与启动
│       ├── config.ts           # 读取并校验环境变量
│       ├── db.ts               # mysql2 连接池 + query 辅助
│       ├── http.ts             # 统一响应封装 ok()/fail() + AppError + asyncHandler
│       ├── crypto.ts           # HKDF 派生、AES-GCM 加密、零宽水印
│       ├── auth/               # jwt.ts（签发/校验）password.ts（bcrypt）
│       ├── middleware/         # auth.ts（鉴权）rateLimit.ts（限流）
│       ├── services/           # userService / chapterService / codeService
│       ├── routes/             # auth.ts / chapters.ts / codes.ts
│       └── scripts/            # importContent / gen-codes / list-users / grant-access
└── web/
    ├── package.json tsconfig.json tsconfig.node.json vite.config.ts index.html .env.example
    └── src/
        ├── main.tsx App.tsx            # 入口 + 路由
        ├── styles/                     # theme.css（设计 token）markdown.css（阅读排版）
        ├── lib/                        # api.ts（fetch 封装）crypto.ts（WebCrypto 解密）
        ├── context/AuthContext.tsx     # 鉴权 + contentKey（仅内存）
        ├── hooks/useProtection.ts      # 禁复制/右键/选择 + DevTools 检测
        ├── components/                 # Nav Footer Button Card Logo Watermark
        │                               # MarkdownView Mermaid CodeBlock
        └── pages/                      # Landing Login Register Catalog Reader Redeem
```

> **目录归属铁律**：各实现模块只编辑自己拥有的文件；`package.json` / `tsconfig` / `vite.config` / `theme.css` / `shared/types.ts` / `schema.sql` 为脚手架一次性写全，实现阶段不得改动。

---

## 四、完整运行步骤

> 前置：本机已安装 Node.js（>= 18）、npm，以及 Docker（用于 MySQL）。

### 1. 启动数据库（MySQL 8）

```bash
# 在仓库根目录
docker compose up -d
```

首次启动会自动执行 `server/db/schema.sql` 建库建表（库名 `course_learn`，root 密码 `course_pw`）。

> 注意：initdb 脚本仅在数据卷为空（首次创建）时执行。若改了 `schema.sql` 需重新建表，请先 `docker compose down -v` 清空数据卷再 `up`。
> 根目录也提供了便捷脚本：`npm run db:up` / `npm run db:down` / `npm run db:reset`。

### 2. 配置并启动后端（`server/`，端口 4000）

```bash
cd server
cp .env.example .env       # 然后编辑 .env，替换其中的 JWT_SECRET 与 CONTENT_MASTER_KEY
npm install                # 工作区已 hoist，在根目录执行 npm install 也会一次性装好前后端
npm run import             # 从 CONTENT_DIR 导入 31 章 Markdown 到数据库
npm run dev                # tsx watch 启动，监听 :4000
```

**必须替换的环境变量**（详见 `server/.env.example`）：

| 变量 | 说明 |
|---|---|
| `JWT_SECRET` | JWT 签名密钥，替换为足够长的随机串（缺失或非法时服务启动直接报错）。 |
| `CONTENT_MASTER_KEY` | 内容主密钥，**必须是 64 位十六进制（32 字节）**。生成：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CONTENT_DIR` | 课程 Markdown 源目录（导入脚本读取，默认 `./content`）。 |
| `DB_*` | MySQL 连接信息，需与 docker-compose 保持一致（`DB_PASSWORD=course_pw`、`DB_NAME=course_learn`）。 |
| `CORS_ORIGIN` | 允许跨域的前端来源，默认 `http://localhost:5173`。 |

### 3. 生成课程码（兑换码）

```bash
# 在 server/ 目录
npm run gen-codes -- --count 20 --uses 1 --note 首发
```

打印出形如 `CLW-XXXX-XXXX-XXXX` 的兑换码，分发给购买用户。

### 4. 配置并启动前端（`web/`，端口 5173）

```bash
cd web
npm install
npm run dev                # Vite 启动，监听 :5173，已把 /api 代理到 :4000
```

打开 `http://localhost:5173` 即可访问。无需注册即可免费试读第一章；注册 / 登录后输入课程码可解锁全册。

> 前端默认零配置：所有 `/api` 请求由 `vite.config.ts` 的 `server.proxy` 转发到后端。仅当需要让前端直连非同源后端时，才在 `web/.env` 中设置 `VITE_API_BASE_URL`（见 `web/.env.example`）。

### 5. 生产构建（验证用）

```bash
# 前端：类型检查 + 打包到 web/dist
npm --prefix web run build

# 后端：tsc 编译到 server/dist
npm --prefix server run build
```

---

## 五、CLI 管理脚本

所有脚本在 `server/` 目录下用 `npm run <script> -- <参数>` 运行（`--` 之后才是脚本参数）。根目录也提供同名转发脚本（`npm run import` / `gen-codes` / `list-users` / `grant-access`）。

| 脚本 | 作用 | 用法示例 |
|---|---|---|
| `import` | 从 `CONTENT_DIR` 遍历 `NN-篇名/` 子目录导入章节 Markdown，按 (篇序, 文件序) 计算全局 `order_index`，`order_index===0` 的章标记为免费。`INSERT ... ON DUPLICATE KEY UPDATE`（按 slug）幂等可重跑。 | `npm run import` |
| `gen-codes` | 批量生成兑换码并写库。`--count N`（数量，默认 1）`--uses M`（每码可用次数，默认 1）`--note "批次"`（备注，≤120 字）`--expires YYYY-MM-DD`（过期日，落库为当日 23:59:59；省略=永不过期）。 | `npm run gen-codes -- --count 20 --uses 1 --note "首发批次" --expires 2026-12-31` |
| `list-users` | 打印所有用户及其解锁状态与兑换记录，便于排查。 | `npm run list-users` |
| `grant-access` | 按邮箱手动将某用户置为已解锁（`has_access=1`），便于本地测试。 | `npm run grant-access -- user@example.com` |

---

## 六、安全与内容防护

### 6.1 鉴权与访问控制

- 密码用 bcrypt 哈希（cost ≥ 10），绝不明文存储；`PublicUser` 永不含 `password_hash`。
- 登录 / 注册下发带 `exp` 的 JWT；前端以 `Authorization: Bearer <token>` 携带。
- 未登录访客可调 `POST /api/auth/guest` 获取 **guest token**，仅用于免费章解密。
- **访问可见性由服务端唯一裁决**（`CONTRACT §4`）：
  - `chapter.isFree === true` → 任何人（含未登录 / guest / user）可读。
  - 否则仅当 `principal.typ === 'user'` 且 `user.has_access === true` 时可读；其余 `/content` 返回 `403 LOCKED`。
  - guest token 请求非免费章一律 `403 LOCKED`。
- 前端 `ChapterMeta.locked` 仅用于 UI 展示与引导，**不是安全边界**——真正的拦截始终在服务端。
- 安全中间件：helmet（安全响应头）、cors（限定来源）、express-rate-limit（鉴权端点严格限流、内容端点中等限流）。错误统一走 `http.ts` 的 `AppError` + 信封，不向客户端泄露堆栈。

### 6.2 内容加密机制

目标：**正文绝不以明文出现在任何网络响应或前端 bundle 中**；密钥仅在登录 / guest 初始化时单独下发一次，之后内容响应不再携带密钥。

1. **密钥派生（服务端）**：`CONTENT_MASTER_KEY`（64 hex = 32 字节）存于 env。每个主体派生独立内容密钥：

   ```
   contentKey = HKDF-SHA256(
     ikm  = bytes(CONTENT_MASTER_KEY),
     salt = utf8("clw|" + typ + "|" + subjectId),   // typ ∈ {user, guest}
     info = utf8("content-key-v1"),
     L    = 32
   ) → hex 字符串
   ```

   服务端**永远从 JWT 的 `sub`/`typ` 重新派生 key 来加密，绝不信任客户端传来的 key**。该 hex key 在登录 / guest 时通过 `AuthResponse.contentKey` / `GuestResponse.contentKey` 下发一次。

2. **正文加密（每次 `/content` 请求）**：取章节 Markdown → 注入零宽水印 → `iv = randomBytes(12)`，`AES-256-GCM` 加密 → 返回 `{iv, data, tag}`（均 base64）+ 章节 meta。

3. **客户端解密（WebCrypto，`web/src/lib/crypto.ts`）**：用内存中的 `contentKey` 把 `data || tag` 拼接后 `subtle.decrypt` 还原 UTF-8 Markdown。**解密后的明文只在内存中渲染，绝不写入任何持久化存储（localStorage / IndexedDB / 磁盘）**；`contentKey` 也只存 React state（内存），绝不写 localStorage。

### 6.3 水印与溯源

- **服务端零宽水印**（`server/src/crypto.ts`）：把 `userId(或 guest):issuedAtEpoch` 编码为零宽字符（U+200B/200C/200D），在加密前注入正文末尾及部分二级标题后。渲染时不可见，但会随**复制**外泄，可用于泄露溯源（截图不含零宽字符，故对截图无效）。
- **前端可见水印**（`web/src/components/Watermark.tsx`）：全屏 `position:fixed` 平铺、旋转 -22°、低透明度（约 0.08）、`pointer-events:none`、`user-select:none`，文案为 `email · #userId · YYYY-MM-DD HH:mm`（访客显示「访客 · 未登录」）。截图时一并入图，便于追责。

### 6.4 内容防护（前端）

`web/src/hooks/useProtection.ts` + 阅读器在展示解密正文时启用：

- 内容区与 body 默认 `user-select:none`（登录 / 注册 / 兑换等表单的 `input`/`textarea` 显式放开，保证可用性）。
- 拦截 `contextmenu`（右键）、`copy`、`cut`、`dragstart`、`selectstart`，并尽力拦截 `Ctrl/Cmd + C/X/S/U/P` 与 `PrintScreen`。
- 开发者工具检测（窗口内外尺寸差阈值，节流执行）：检测到时显示**可关闭 / 自动复检的警告遮罩并模糊正文**，而非永久白屏；DevTools 关闭后自动恢复。

### 6.5 诚实声明（重要 · 局限性）

> 上述**防复制、防截图、开发者工具检测、键盘拦截、可见 / 零宽水印**等措施，本质都是**「提高门槛 + 便于溯源」的尽力（best-effort）手段，并非不可绕过的安全保证**。
>
> 浏览器端的代码与最终渲染出来的像素终究对用户可达：有决心的技术用户仍可通过修改前端代码、读取内存、操作系统级截图 / 录屏、外部拍照等方式获取内容。
>
> - `PrintScreen` 与系统级截图 / 录屏，浏览器在原理上**无法真正阻止**，前端拦截仅作威慑。
> - 开发者工具检测基于启发式（尺寸差等），存在误报 / 漏报，且可被绕过。
> - 真正可靠的访问控制只有服务端裁决与逐请求加密下发；前端防护用于抬高随手复制 / 转载的成本，并通过水印实现事后溯源追责。
>
> 因此本平台的定位是：**让正文不在网络层与 bundle 中明文暴露、让随手搬运变得麻烦、让泄露可被追溯**，而不是宣称内容「无法被复制」。

---

## 七、HTTP API 速览

所有接口前缀 `/api`，统一信封 `{ok:true,data}` / `{ok:false,error:{code,message}}`。完整契约见 `CONTRACT.md §4`。

| 方法 | 路径 | 鉴权 | data 响应 |
|---|---|---|---|
| POST | `/api/auth/register` | 无 | `AuthResponse` |
| POST | `/api/auth/login` | 无 | `AuthResponse` |
| GET  | `/api/auth/me` | requireUser | `MeResponse` |
| POST | `/api/auth/guest` | 无 | `GuestResponse` |
| GET  | `/api/chapters` | optionalAuth | `{chapters: ChapterMeta[]}` |
| GET  | `/api/chapters/:id/content` | requireAuth | `ChapterContentResponse`（无权 → 403 `LOCKED`） |
| POST | `/api/codes/redeem` | requireUser | `{hasAccess:true}` |
| GET  | `/api/health` | 无 | `{status:'ok'}` |

错误码集合：`VALIDATION`、`UNAUTHORIZED`、`EMAIL_TAKEN`、`BAD_CREDENTIALS`、`NOT_FOUND`、`LOCKED`、`INVALID_CODE`、`CODE_EXHAUSTED`、`CODE_EXPIRED`、`ALREADY_HAS_ACCESS`、`RATE_LIMITED`、`INTERNAL`。

---

## 八、开发约定

- 严格 TypeScript（`strict:true`），不留 `any` 漏网（必要处用 `unknown` + 收窄）。前后端 `npm run typecheck` 均须 0 错误。
- 颜色 / 字体一律使用 `web/src/styles/theme.css` 的 CSS 变量，禁止硬编码色值。
- UI 文案与代码注释用中文，标识符用英文。
- 不引入契约之外的大依赖；不硬编码密钥（一律从 env 读取）。

---

## 九、常见问题

- **目录页 / 阅读器一直转圈或报网络错误**：确认后端 `npm run dev`（:4000）已启动、MySQL 容器健康、`server/.env` 已正确配置。
- **正文解密失败 / 提示缺少密钥**：通常是 token 与 `contentKey` 不匹配（例如更换了 `CONTENT_MASTER_KEY`）。退出后重新登录即可重新下发匹配的 `contentKey`。
- **章节列表为空**：尚未导入内容，先在 `server/` 执行 `npm run import`（确认 `CONTENT_DIR` 指向正确的课程目录）。
- **改了 `schema.sql` 不生效**：initdb 仅在数据卷首建时执行，需 `docker compose down -v` 后重新 `up`。
- **Node 18 下 `npm install` 出现 `EBADENGINE`（marked 要求 Node >= 20）警告**：这是 mermaid 的传递依赖发出的**警告**，不影响安装、类型检查与构建；如需消除可升级到 Node 20。
