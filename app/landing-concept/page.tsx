import styles from "./page.module.css";

const capabilities = ["Market research", "SEO audit", "Content", "Distribution"];

const partners = [
  "Semrush",
  "Firecrawl",
  "OpenAI",
  "Telegram",
  "Slack",
  "Postiz",
];

const services = [
  {
    number: "1",
    title: "Market intelligence",
    tags: ["Competitors", "Demand", "Category", "Opportunities"],
  },
  {
    number: "2",
    title: "SEO systems",
    tags: ["Technical audit", "Content gaps", "Priorities", "Monitoring"],
  },
  {
    number: "3",
    title: "Content engine",
    tags: ["Strategy", "Briefs", "Drafts", "Publishing"],
  },
  {
    number: "4",
    title: "Always-on agents",
    tags: ["Research", "Approvals", "Execution", "Reporting"],
  },
];

const faqs = [
  "What does Viral Bridge automate?",
  "Can our team approve every action?",
  "How fast can we launch a pilot?",
  "Which channels and tools are supported?",
];

export default function LandingConceptPage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.brandGroup}>
          <a className={styles.logo} href="#top" aria-label="Viral Bridge">
            viralbridge
          </a>
          <span className={styles.barcode} aria-hidden="true" />
          <span className={styles.descriptor}>AI GROWTH OS</span>
        </div>
        <nav className={styles.navLinks} aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#services">Services</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
          <button className={styles.menu} aria-label="Open menu">
            <span />
            <span />
          </button>
        </nav>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroTitle}>
          <h1>Viral</h1>
          <h1>Bridge</h1>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.aurora} aria-hidden="true">
            <span className={styles.auroraOne} />
            <span className={styles.auroraTwo} />
            <span className={styles.auroraThree} />
          </div>

          <div className={styles.heroCapabilities}>
            {capabilities.map((capability) => (
              <div className={styles.heroCapability} key={capability}>
                <span>{capability}</span>
                <span className={styles.capabilityLine} />
              </div>
            ))}
          </div>

          <div className={styles.heroMessage}>
            <span>WE ARE VIRAL BRIDGE®</span>
            <h2>
              Not just a tool,
              <br />
              your AI growth team.
            </h2>
          </div>

          <div className={styles.scrollCue}>— SCROLL TO REVEAL —</div>

          <div className={styles.agentCard}>
            <div className={styles.agentAvatar}>VB</div>
            <div>
              <strong>Ask your agent</strong>
              <span>Growth operator at Viral Bridge®</span>
            </div>
            <i />
          </div>
        </div>
      </section>

      <section className={styles.partners} aria-label="Integrations">
        <p>Connected to the tools your growth team already uses.</p>
        <div className={styles.partnerGrid}>
          {partners.map((partner) => (
            <div key={partner}>{partner}</div>
          ))}
        </div>
      </section>

      <section className={styles.selected} id="product">
        <div className={styles.sectionHeading}>
          <h2>
            Selected
            <br />
            Growth.
          </h2>
          <div className={styles.sectionNumber}>
            <strong>3</strong>
            <span>Systems</span>
          </div>
          <p>
            Viral Bridge turns fragmented signals into one continuous operating
            loop: understand the market, select the next move and execute it.
          </p>
          <span className={styles.year}>©26</span>
        </div>

        <div className={styles.systemGrid}>
          <article className={`${styles.systemCard} ${styles.systemBlue}`}>
            <div className={styles.systemMeta}>
              <span>01</span>
              <span>Intelligence</span>
            </div>
            <h3>See what the market sees.</h3>
            <div className={styles.orbitGraphic}>
              <i />
              <i />
              <i />
              <strong>38%</strong>
            </div>
          </article>
          <article className={`${styles.systemCard} ${styles.systemDark}`}>
            <div className={styles.systemMeta}>
              <span>02</span>
              <span>Priorities</span>
            </div>
            <h3>Know the next best move.</h3>
            <div className={styles.queue}>
              <span>Fix duplicate intent pages</span>
              <span>Publish comparison page</span>
              <span>Refresh declining article</span>
            </div>
          </article>
          <article className={`${styles.systemCard} ${styles.systemLight}`}>
            <div className={styles.systemMeta}>
              <span>03</span>
              <span>Execution</span>
            </div>
            <h3>Keep the growth loop moving.</h3>
            <div className={styles.statusList}>
              <span>Research complete</span>
              <span>Draft ready</span>
              <span>Approval needed</span>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.why}>
        <div className={styles.whyHeading}>
          <span>Why work with us</span>
          <h2>
            We help ambitious teams grow with more clarity and less operational
            noise.
          </h2>
        </div>
        <div className={styles.whyGrid}>
          <article className={styles.expertCard}>
            <div className={styles.agentStack}>
              <span>S</span>
              <span>M</span>
              <span>E</span>
            </div>
            <h3>A focused team of AI specialists</h3>
            <p>Research, SEO and content agents share one business context.</p>
          </article>
          <article className={styles.collabCard}>
            <div className={styles.chatBubble}>The audit is ready to review.</div>
            <div className={styles.chatBubbleAlt}>
              Great — send the top priorities to Slack.
            </div>
            <h3>Real-time collaboration</h3>
          </article>
          <article className={styles.quoteCard}>
            <blockquote>
              “The system does not add another dashboard. It tells the team what
              matters and moves the work forward.”
            </blockquote>
            <span>Viral Bridge operating principle</span>
          </article>
        </div>
      </section>

      <section className={styles.about}>
        <span>About Viral Bridge</span>
        <h2>
          We’re building an AI operating system that connects market
          intelligence, SEO strategy, content and execution.
        </h2>
        <div className={styles.aboutFooter}>
          <p>
            One shared context. Clear ownership. Continuous learning from every
            action and result.
          </p>
          <a href="#contact">More about the platform ↗</a>
        </div>
      </section>

      <section className={styles.services} id="services">
        <div className={styles.servicesHeader}>
          <h2>Services</h2>
          <span>(04)</span>
        </div>
        <div className={styles.serviceList}>
          {services.map((service) => (
            <article className={styles.serviceRow} key={service.number}>
              <span className={styles.serviceNumber}>{service.number}</span>
              <h3>{service.title}</h3>
              <div className={styles.serviceTags}>
                {service.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <span className={styles.serviceArrow}>↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.metrics}>
        <div className={styles.metricIntro}>
          <span>Some data about the system</span>
          <h2>Built to make growth work visible and actionable.</h2>
        </div>
        <div className={styles.metricGrid}>
          <article>
            <strong>24/7</strong>
            <span>market and website monitoring</span>
          </article>
          <article>
            <strong>4</strong>
            <span>specialist agents in one context</span>
          </article>
          <article>
            <strong>1</strong>
            <span>continuous growth operating loop</span>
          </article>
        </div>
      </section>

      <section className={styles.pricing} id="pricing">
        <div className={styles.pricingTitle}>
          <span>2 pilot slots available</span>
          <h2>Pricing</h2>
        </div>
        <div className={styles.priceGrid}>
          <article>
            <span>Focused launch</span>
            <h3>Pilot</h3>
            <strong>€950</strong>
            <ul>
              <li>Company onboarding and setup</li>
              <li>Market and SEO opportunity map</li>
              <li>30-day prioritized action queue</li>
              <li>Telegram or Slack channel</li>
            </ul>
            <a href="#contact">Start pilot ↗</a>
          </article>
          <article className={styles.featuredPrice}>
            <span>Always-on system</span>
            <h3>Growth</h3>
            <strong>€2,400</strong>
            <ul>
              <li>Full AI growth team</li>
              <li>Continuous monitoring</li>
              <li>Content and execution workflows</li>
              <li>Approvals in your channels</li>
            </ul>
            <a href="#contact">Start growth ↗</a>
          </article>
        </div>
      </section>

      <section className={styles.faq}>
        <div className={styles.faqHeading}>
          <span>FAQ</span>
          <h2>Answered questions.</h2>
          <p>Everything you might want to know — up front.</p>
        </div>
        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div key={faq}>
              <span>{index + 1}</span>
              <strong>{faq}</strong>
              <i>+</i>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta} id="contact">
        <span>Start your growth loop with Viral Bridge®</span>
        <h2>
          Ready to turn
          <br />
          signals into action?
        </h2>
        <a href="#top">Enter dashboard ↗</a>
        <div className={styles.ctaMarquee}>
          <span>RESEARCH</span>
          <span>SEO</span>
          <span>CONTENT</span>
          <span>EXECUTION</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.footerLogo} href="#top">
          viralbridge
        </a>
        <div>
          <a href="#product">Product</a>
          <a href="#services">Services</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>
        <p>© 2026 Viral Bridge</p>
      </footer>
    </main>
  );
}
