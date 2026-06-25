/**
 * Landing.tsx —— 营销落地页（FE-Landing 拥有）。
 * 参照 socratopia 风格，主题改造为《从前端到 AI Agent 开发》课程。
 * 区块：① Hero ② 5 大学习篇章 ③ 三大特点 ④ 解锁流程 ⑤ 学习路线/数据点缀 + 收尾 CTA。
 * 设计：严格使用 theme.css 的 CSS 变量（禁止硬编码色值）；中文文案；纸感 + 紫靛/暖金点缀。
 */
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import styles from './Landing.module.css';

/** 5 大学习篇章（CONTRACT §7：前言/基础/核心能力/工程/实战面试）。 */
const SECTIONS: ReadonlyArray<{ icon: string; num: string; name: string; desc: string }> = [
  {
    icon: '📖',
    num: '00',
    name: '前言',
    desc: '为什么是现在？读懂这本书的使用方式与全局学习地图。',
  },
  {
    icon: '🧩',
    num: '01',
    name: '基础篇',
    desc: '从 LLM 到 Agent：提示词、上下文与函数调用的第一性原理。',
  },
  {
    icon: '🧠',
    num: '02',
    name: '核心能力篇',
    desc: '记忆、规划、工具调用与多智能体协作，搭起 Agent 的「大脑」。',
  },
  {
    icon: '🛠️',
    num: '03',
    name: '工程篇',
    desc: '评测、可观测、成本与安全：让 Agent 从 Demo 走向生产。',
  },
  {
    icon: '🚀',
    num: '04',
    name: '实战与面试',
    desc: '完整项目实战，配套高频面试题，把知识变成可交付的 offer。',
  },
];

/** 三大特点（CONTRACT §7：双语代码 / 框架无关多模型 / 工程导向实战驱动）。 */
const FEATURES: ReadonlyArray<{ icon: string; title: string; desc: string }> = [
  {
    icon: '⌨️',
    title: '双语代码 · TS + Python',
    desc: '每个概念都给出 TypeScript 与 Python 两套可运行示例，前端同学与算法同学都不掉队。',
  },
  {
    icon: '🧭',
    title: '框架无关 · 多模型',
    desc: '原理优先，不绑定单一框架或厂商；Claude、OpenAI 等主流模型之间皆可平滑迁移。',
  },
  {
    icon: '🏗️',
    title: '工程导向 · 实战驱动',
    desc: '拒绝玩具示例，围绕真实工程问题展开，每一章都能落到可上线的代码。',
  },
];

/** 解锁流程三步（试读 → 课程码 → 全册）。 */
const STEPS: ReadonlyArray<{ num: string; title: string; desc: string }> = [
  {
    num: '1',
    title: '免费试读',
    desc: '无需注册即可阅读第一章，先尝后买，确认风格对味再继续。',
  },
  {
    num: '2',
    title: '获取课程码',
    desc: '购买后获得形如 CLW-XXXX-XXXX-XXXX 的专属课程码。',
  },
  {
    num: '3',
    title: '解锁全册',
    desc: '登录后输入课程码，31 章内容一次性全部解锁，终身可重读。',
  },
];

/** 学习路线 / 数据点缀。 */
const STATS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '31', label: '章精读' },
  { value: '5', label: '大篇章' },
  { value: '2', label: '种语言 · TS / Python' },
  { value: '∞', label: '终身重读' },
];

export function Landing(): JSX.Element {
  const navigate = useNavigate();
  const { status, hasAccess } = useAuth();
  const isAuthed = status === 'authed';

  const primaryLabel = isAuthed ? '继续学习' : '免费试读第一章';
  const goCatalog = () => navigate('/catalog');
  const goRedeem = () => navigate('/redeem');

  return (
    <div className={styles.page}>
      {/* ① Hero ------------------------------------------------------------ */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>一本写给开发者的 AI Agent 实战书</span>
            <h1 className={styles.title}>
              从前端，
              <br />
              到 <span className={styles.titleAccent}>AI Agent</span>
            </h1>
            <p className={styles.subtitle}>
              不止是调用一个 API。从 LLM 的本质，到生产级智能体的设计与落地，
              用 TypeScript 与 Python 双语，带你把「会聊天的模型」打造成「能干活的 Agent」。
            </p>

            <div className={styles.ctaRow}>
              <Button variant="primary" size="lg" onClick={goCatalog}>
                {primaryLabel}
              </Button>

              {hasAccess ? (
                <span className={styles.unlockedNote}>✦ 你已解锁全部章节</span>
              ) : (
                <Button variant="gold" size="lg" onClick={goRedeem}>
                  输入课程码解锁
                </Button>
              )}
            </div>

            <p className={styles.heroHint}>
              第一章永久免费 ·{' '}
              {isAuthed ? (
                <Link className={styles.textLink} to="/catalog">
                  回到我的课程
                </Link>
              ) : (
                <>
                  已有账号？
                  <Link className={styles.textLink} to="/login">
                    登录
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* 对话 / 学习意象（装饰性，不参与可访问性朗读） */}
          <aside className={styles.heroAside} aria-hidden="true">
            <div className={styles.chatCard}>
              <div className={styles.chatHeader}>
                <span className={styles.chatDot} />
                <span className={styles.chatDot} />
                <span className={styles.chatDot} />
                <span className={styles.chatTitle}>agent.session</span>
              </div>
              <div className={styles.chatBody}>
                <div className={`${styles.msg} ${styles.msgUser}`}>
                  帮我查一下今天的待办，并安排一封跟进邮件。
                </div>
                <div className={`${styles.msg} ${styles.msgAgent}`}>
                  好的，已读取日历与任务清单 →
                  <span className={styles.toolTag}>🔧 调用 calendar.list</span>
                </div>
                <div className={`${styles.msg} ${styles.msgAgent}`}>
                  共 3 项待办。草拟跟进邮件 →
                  <span className={styles.toolTag}>🔧 调用 mail.draft</span>
                </div>
                <div className={`${styles.msg} ${styles.msgUser}`}>很好，发出去吧。</div>
              </div>
              <div className={styles.chatFoot}>规划 · 记忆 · 工具调用 · 自主执行</div>
            </div>
          </aside>
        </div>
      </section>

      {/* ② 5 大学习篇章 ---------------------------------------------------- */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <span className={styles.kicker}>课程地图</span>
          <h2 className={styles.sectionTitle}>五大篇章，一条完整的成长路线</h2>
          <p className={styles.sectionLead}>
            从原理到工程，从写下第一个 Prompt 到交付一个可上线的 Agent，循序渐进，环环相扣。
          </p>
        </header>

        <div className={styles.chapterGrid}>
          {SECTIONS.map((s) => (
            <Card key={s.num} as="article" className={styles.chapterCard}>
              <div className={styles.chapterTop}>
                <span className={styles.chapterIcon} aria-hidden="true">
                  {s.icon}
                </span>
                <span className={styles.chapterNum}>{s.num}</span>
              </div>
              <h3 className={styles.chapterName}>{s.name}</h3>
              <p className={styles.chapterDesc}>{s.desc}</p>
            </Card>
          ))}
        </div>

        <div className={styles.sectionFoot}>
          <Link className={styles.textLink} to="/catalog">
            查看完整目录 →
          </Link>
        </div>
      </section>

      {/* ③ 三大特点 -------------------------------------------------------- */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <header className={styles.sectionHead}>
          <span className={styles.kicker}>为什么是这本书</span>
          <h2 className={styles.sectionTitle}>三个让你坚持读完的理由</h2>
          <p className={styles.sectionLead}>
            不堆砌名词，不贩卖焦虑。只把「如何真正做出一个 Agent」讲清楚、讲透。
          </p>
        </header>

        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <Card key={f.title} as="article" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                {f.icon}
              </span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ④ 解锁流程说明 ---------------------------------------------------- */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <span className={styles.kicker}>如何开始</span>
          <h2 className={styles.sectionTitle}>三步解锁，立即上路</h2>
          <p className={styles.sectionLead}>试读 → 课程码 → 全册，没有订阅，没有套路。</p>
        </header>

        <ol className={styles.stepFlow}>
          {STEPS.map((step, i) => (
            <li key={step.num} className={styles.step}>
              <span className={styles.stepNum}>{step.num}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
              {i < STEPS.length - 1 && (
                <span className={styles.stepArrow} aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ⑤ 学习路线 / 数据点缀 -------------------------------------------- */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.statRow}>
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <span className={styles.statNum}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 收尾 CTA band ----------------------------------------------------- */}
      <section className={styles.ctaBand}>
        <div className={styles.ctaBandInner}>
          <Logo size="md" />
          <h2 className={styles.ctaBandTitle}>准备好把模型变成生产力了吗？</h2>
          <p className={styles.ctaBandText}>
            先读第一章，分文不取。读得进去，再用课程码解锁余下的全部旅程。
          </p>
          <div className={styles.ctaRow}>
            <Button variant="primary" size="lg" onClick={goCatalog}>
              {primaryLabel}
            </Button>
            {!hasAccess && (
              <Button variant="ghost" size="lg" onClick={goRedeem}>
                我有课程码
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;
