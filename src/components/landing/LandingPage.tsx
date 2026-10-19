import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Menu,
  Moon,
  Play,
  Plus,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { Tone } from "@/types";
import { Brand, InstagramIcon, WhatsAppIcon } from "./Brand";
import ProductDemo from "./ProductDemo";
import SetupDialog, { DialogShell } from "./SetupDialog";
import "./landing.css";

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const steps = [
  {
    number: "01",
    title: "Bring your DMs together.",
    text: "Instagram and WhatsApp. One clean inbox, so a good conversation never gets lost between tabs.",
  },
  {
    number: "02",
    title: "Give it your know-how.",
    text: "Share what you sell and how you like to say it. Your business context makes every reply feel like you.",
  },
  {
    number: "03",
    title: "Turn a hello into a sale.",
    text: "Send a suggested reply, make it your own, or let high-confidence replies take care of themselves.",
  },
];

const toneReplies: Record<Tone, string> = {
  friendly:
    "Absolutely! The olive set is in stock and ready for you. We deliver to New York in 3-5 business days. Want me to send you the link?",
  premium:
    "The olive linen set is available, with delivery to New York in 3-5 business days. I would be delighted to arrange your order. May I share a checkout link?",
  aggressive:
    "Yes, the olive set is in stock. We can deliver to New York in 3-5 business days. Let's get your order started. Shall I send the checkout link?",
};

const questions = [
  {
    question: "Will the replies actually sound like my business?",
    answer:
      "That is the idea. DMCloser uses your business information, the conversation, and your chosen tone to suggest a relevant next reply. You can always edit the wording before sending. Try the tone preview above to see the difference.",
  },
  {
    question: "Can I approve replies before they are sent?",
    answer:
      "Always. Keep auto-send off to review every suggested reply. When live integrations are configured, high-confidence replies can be automated while uncertain conversations stay in your hands. The interactive demo lets you explore both modes without sending any real messages.",
  },
  {
    question: "Does it work with Instagram and WhatsApp?",
    answer:
      "DMCloser is designed for Instagram business messaging and the WhatsApp Cloud API. This preview uses sample conversations. Live messaging requires a configured Meta integration, an eligible business account, and the appropriate permissions.",
  },
  {
    question: "Do I need a credit card to try it?",
    answer:
      "No. You can explore the interactive inbox here or create a local demo workspace in a couple of clicks. No payment is collected, and selecting a preview plan does not start a paid subscription.",
  },
  {
    question: "Where is my demo workspace data stored?",
    answer:
      "Your demo workspace, business settings, and messages are saved locally in this browser. They are not sent to a messaging provider or an AI service. Avoid adding sensitive customer information to the demo. You can clear the saved data through your browser settings.",
  },
];

export default function LandingPage({ onOpenApp }: { onOpenApp: () => void }) {
  const { theme, toggle } = useTheme();
  const reducedMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [tone, setTone] = useState<Tone>("friendly");
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = "DMCloser - Less typing. More closing.";
    document.body.classList.add("marketing-page");
    return () => document.body.classList.remove("marketing-page");
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 760px)");
    const onResize = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);

  function openSetup(plan: string | null = null) {
    setSelectedPlan(plan);
    setSetupOpen(true);
    setMobileMenuOpen(false);
  }

  function openApp() {
    setSetupOpen(false);
    onOpenApp();
  }

  return (
    <div className="landing">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="landing-header">
        <div className="landing-container header-inner">
          <a href="#top" className="brand-link" aria-label="DMCloser home">
            <Brand />
          </a>
          <nav className="desktop-navigation" aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQs</a>
          </nav>
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <a href="/workspace?login" className="header-login">
              Sign in
              <ArrowUpRight size={13} />
            </a>
            <button
              className="closer-button closer-button-primary header-cta"
              onClick={() => openSetup()}
            >
              Get started
              <ArrowUpRight size={14} />
            </button>
            <button
              className="mobile-menu-toggle"
              ref={menuButtonRef}
              aria-label={
                mobileMenuOpen ? "Close navigation" : "Open navigation"
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              id="mobile-navigation"
              className="mobile-navigation"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <a href="#product" onClick={() => setMobileMenuOpen(false)}>
                Product
                <ArrowUpRight size={16} />
              </a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                How it works
                <ArrowUpRight size={16} />
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
                Pricing
                <ArrowUpRight size={16} />
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
                FAQs
                <ArrowUpRight size={16} />
              </a>
              <button onClick={openApp}>
                Open the demo inbox
                <ArrowRight size={16} />
              </button>
              <a href="/workspace">
                Create your workspace
                <ArrowUpRight size={16} />
              </a>
              <button
                className="mobile-theme-action"
                onClick={toggle}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section
          className="landing-hero"
          id="top"
          aria-labelledby="hero-heading"
        >
          <motion.img
            className="hero-image"
            src="/images/dmcloser-studio.jpg"
            alt="A small business owner at work in her sunlit studio"
            width="1280"
            height="720"
            fetchPriority="high"
            initial={{ scale: reducedMotion ? 1 : 1.035 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="hero-photo-wash" />
          <div className="landing-container hero-inner">
            <motion.div
              className="hero-copy"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: { staggerChildren: 0.1, delayChildren: 0.08 },
                },
              }}
            >
              <h1 id="hero-heading">
                <motion.span
                  className="hero-brand"
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.65 },
                    },
                  }}
                >
                  DMCloser.
                </motion.span>
                <motion.span
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.65 },
                    },
                  }}
                >
                  Less typing.
                </motion.span>
                <motion.span
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.65 },
                    },
                  }}
                >
                  More closing.
                </motion.span>
              </h1>
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                }}
              >
                Turn Instagram and WhatsApp messages into customers, with an AI
                sales assistant that sounds like you.
              </motion.p>
              <motion.div
                className="hero-actions"
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                }}
              >
                <button
                  className="closer-button closer-button-primary"
                  onClick={() => openSetup()}
                >
                  Try DMCloser
                  <ArrowUpRight size={17} />
                </button>
                <a
                  href="#product"
                  className="closer-button closer-button-ghost"
                >
                  <Play size={13} fill="currentColor" />
                  See it in action
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="channel-strip">
          <div className="landing-container channel-strip-inner">
            <p>Right where your next customer is.</p>
            <div className="channel-brands">
              <span>
                <InstagramIcon />
                Instagram
              </span>
              <span className="channel-strip-divider" />
              <span>
                <WhatsAppIcon />
                WhatsApp
              </span>
            </div>
            <span className="channel-strip-note">
              Two channels. One closer.
            </span>
          </div>
        </div>

        <section
          className="product-section landing-section"
          id="product"
          aria-labelledby="product-heading"
        >
          <div className="landing-container">
            <Reveal className="section-intro product-intro">
              <div>
                <span className="eyebrow">
                  A LITTLE ASSISTANCE. A BIG DIFFERENCE.
                </span>
                <h2 id="product-heading">
                  All your DMs.
                  <br />
                  One clear next move.
                </h2>
              </div>
              <div className="section-intro-description">
                <p>
                  One calm inbox. Replies that are already one step ahead. More
                  time for the business you're building.
                </p>
                <button className="text-link" onClick={openApp}>
                  Explore the full inbox
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <ProductDemo onOpenApp={openApp} />
            </Reveal>
            <div className="product-caption">
              <span>
                <span className="caption-dot" />A suggestion when you need it.
                Your control, always.
              </span>
              <span>
                Try it above. It's a working demo.
                <ArrowUpRight size={13} />
              </span>
            </div>
          </div>
        </section>

        <section
          className="how-section landing-section"
          id="how-it-works"
          aria-labelledby="how-heading"
        >
          <div className="landing-container">
            <Reveal className="how-intro">
              <span className="eyebrow">LESS BUSYWORK. MORE BUSINESS.</span>
              <h2 id="how-heading">
                Your next sale starts
                <br />
                with a simple hello.
              </h2>
              <p>Getting to the good part shouldn't be complicated.</p>
            </Reveal>
            <div className="steps-grid">
              {steps.map((step, index) => (
                <Reveal
                  key={step.number}
                  delay={index * 0.1}
                  className="how-step"
                >
                  <span className="step-number">
                    {step.number}
                    <span />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          className="voice-section landing-section"
          aria-labelledby="voice-heading"
        >
          <div className="landing-container voice-grid">
            <Reveal className="voice-copy">
              <span className="eyebrow">HUMAN BY DESIGN.</span>
              <h2 id="voice-heading">
                Your business.
                <br />
                Your voice.
                <br />
                <span>Your right hand.</span>
              </h2>
              <p>
                Not another chatbot to manage. A sales assistant that knows what
                you sell, remembers the conversation, and leaves the final say
                to you.
              </p>
              <button className="text-link" onClick={() => openSetup()}>
                Find your voice
                <ArrowUpRight size={16} />
              </button>
            </Reveal>
            <Reveal className="tone-playground" delay={0.12}>
              <div className="tone-customer">
                <span>THE CUSTOMER</span>
                <p>"I love the olive set. Do you ship to New York?"</p>
              </div>
              <div
                className="tone-selector"
                role="group"
                aria-label="Preview a reply tone"
              >
                {(
                  [
                    { value: "friendly", label: "Friendly" },
                    { value: "premium", label: "Premium" },
                    { value: "aggressive", label: "Sales-focused" },
                  ] as { value: Tone; label: string }[]
                ).map((item) => (
                  <button
                    key={item.value}
                    aria-pressed={tone === item.value}
                    className={tone === item.value ? "is-selected" : ""}
                    onClick={() => setTone(item.value)}
                  >
                    {item.label}
                    {tone === item.value && <Check size={12} />}
                  </button>
                ))}
              </div>
              <div className="tone-reply" aria-live="polite" aria-atomic="true">
                <span>
                  <Sparkles size={13} />
                  YOUR SUGGESTED REPLY
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={tone}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {toneReplies[tone]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="tone-footer">
                <Check size={13} />
                Same business. A tone that's yours.
              </div>
            </Reveal>
          </div>
        </section>

        <section
          className="pricing-section landing-section"
          id="pricing"
          aria-labelledby="pricing-heading"
        >
          <div className="landing-container pricing-container">
            <Reveal className="section-intro pricing-intro">
              <div>
                <span className="eyebrow">
                  A SMALL INVESTMENT IN YOUR NEXT CHAPTER.
                </span>
                <h2 id="pricing-heading">
                  More sales.
                  <br />
                  Less overhead.
                </h2>
                <p>Simple plans for businesses with places to go.</p>
              </div>
              <div
                className="billing-switch"
                role="group"
                aria-label="Billing frequency"
              >
                <button
                  className={!annual ? "is-selected" : ""}
                  aria-pressed={!annual}
                  onClick={() => setAnnual(false)}
                >
                  Monthly
                </button>
                <button
                  className={annual ? "is-selected" : ""}
                  aria-pressed={annual}
                  onClick={() => setAnnual(true)}
                >
                  Yearly<span>Save up to 19%</span>
                </button>
              </div>
            </Reveal>
            <Reveal className="plans-grid">
              <article className="pricing-plan">
                <div className="plan-heading">
                  <h3>Starter</h3>
                  <p>For your next big little business.</p>
                </div>
                <div className="plan-price">
                  <span>$</span>
                  {annual ? "24" : "29"}
                  <small>/ month</small>
                </div>
                <p className="plan-billing">
                  {annual
                    ? "$288 billed yearly"
                    : "Billed monthly. Grow at your own pace."}
                </p>
                <button
                  className="closer-button closer-button-outline"
                  onClick={() => openSetup("Starter")}
                >
                  Start with Starter
                  <ArrowUpRight size={15} />
                </button>
                <ul>
                  <li>
                    <Check size={14} />
                    1,000 conversations per month
                  </li>
                  <li>
                    <Check size={14} />
                    Instagram + WhatsApp inbox
                  </li>
                  <li>
                    <Check size={14} />
                    AI replies in your brand voice
                  </li>
                  <li>
                    <Check size={14} />
                    You + one teammate
                  </li>
                </ul>
              </article>
              <article className="pricing-plan growth-plan">
                <div className="plan-heading">
                  <h3>
                    Growth<span>A little more room.</span>
                  </h3>
                  <p>For more conversations and more possibility.</p>
                </div>
                <div className="plan-price">
                  <span>$</span>
                  {annual ? "64" : "79"}
                  <small>/ month</small>
                </div>
                <p className="plan-billing">
                  {annual
                    ? "$768 billed yearly"
                    : "Billed monthly. Ready when you are."}
                </p>
                <button
                  className="closer-button closer-button-primary"
                  onClick={() => openSetup("Growth")}
                >
                  Make room to grow
                  <ArrowUpRight size={15} />
                </button>
                <ul>
                  <li>
                    <Check size={14} />
                    5,000 conversations per month
                  </li>
                  <li>
                    <Check size={14} />
                    Everything in Starter
                  </li>
                  <li>
                    <Check size={14} />
                    Advanced auto-send controls
                  </li>
                  <li>
                    <Check size={14} />
                    You + four teammates
                  </li>
                </ul>
              </article>
            </Reveal>
            <p className="pricing-note">
              Preview pricing. Explore the full demo with no payment or
              subscription.
            </p>
          </div>
        </section>

        <section
          className="faq-section landing-section"
          id="faq"
          aria-labelledby="faq-heading"
        >
          <div className="landing-container faq-grid">
            <Reveal>
              <span className="eyebrow">GOOD QUESTION.</span>
              <h2 id="faq-heading">
                A little clarity
                <br />
                goes a long way.
              </h2>
              <p>The things you might be wondering.</p>
            </Reveal>
            <Reveal className="faq-list">
              {questions.map((item, index) => (
                <details key={item.question} name="dmcloser-faq">
                  <summary>
                    <span className="faq-number">0{index + 1}</span>
                    <span>{item.question}</span>
                    <Plus size={17} />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-heading">
          <div className="landing-container closing-inner">
            <Reveal>
              <span className="eyebrow">
                YOUR NEXT CUSTOMER IS ALREADY TYPING.
              </span>
              <h2 id="closing-heading">
                Be there for the hello.
                <br />
                We'll help with the rest.
              </h2>
            </Reveal>
            <Reveal className="closing-actions" delay={0.1}>
              <button
                className="closer-button closer-button-cream"
                onClick={() => openSetup()}
              >
                Meet your new closer
                <ArrowUpRight size={17} />
              </button>
              <span>Try the demo. Make it yours.</span>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-main">
          <a href="#top" aria-label="DMCloser home" className="brand-link">
            <Brand />
          </a>
          <span className="footer-tagline">
            Better conversations. Better business.
          </span>
          <nav aria-label="Footer navigation">
            <a href="#product">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQs</a>
          </nav>
        </div>
        <div className="landing-container footer-bottom">
          <span>
            &copy; {new Date().getFullYear()} DMCloser. Made for the way you
            work.
          </span>
          <div>
            <button onClick={() => setLegal("privacy")}>Privacy</button>
            <button onClick={() => setLegal("terms")}>Terms</button>
            <span className="footer-status">
              <span />A little closer, every day.
            </span>
          </div>
        </div>
      </footer>

      {setupOpen && (
        <SetupDialog
          plan={selectedPlan}
          onClose={() => setSetupOpen(false)}
          onOpenApp={openApp}
        />
      )}
      {legal && (
        <DialogShell
          title={
            legal === "privacy"
              ? "Your privacy, simply."
              : "A note about this demo."
          }
          onClose={() => setLegal(null)}
          className="legal-dialog"
        >
          {legal === "privacy" ? (
            <div className="legal-copy">
              <p>
                This DMCloser preview saves workspace settings, sample
                conversations, and your theme preference locally in your
                browser.
              </p>
              <h3>No real messages are sent.</h3>
              <p>
                The demo does not connect to Instagram, WhatsApp, a payment
                provider, or an AI service. Do not enter sensitive customer
                information.
              </p>
              <h3>Your browser. Your choice.</h3>
              <p>
                You can remove saved demo information by clearing this site's
                browser storage. The page does not use analytics or advertising
                cookies.
              </p>
              <h3>Site assets</h3>
              <p>
                The site uses Google Fonts. Your browser may contact Google's
                servers to load those font files.
              </p>
            </div>
          ) : (
            <div className="legal-copy">
              <p>
                This is an interactive product preview of DMCloser, provided so
                you can explore the intended experience.
              </p>
              <h3>Explore without a subscription.</h3>
              <p>
                Plan prices are illustrative. Creating a demo workspace or
                selecting a plan does not collect a payment, create a
                subscription, or establish a live service connection.
              </p>
              <h3>Live use requires configuration.</h3>
              <p>
                Real account connections, message delivery, backend storage, AI
                generation, and billing require separately configured services.
                Demo replies and conversations are examples, not live customer
                interactions.
              </p>
            </div>
          )}
        </DialogShell>
      )}
    </div>
  );
}
