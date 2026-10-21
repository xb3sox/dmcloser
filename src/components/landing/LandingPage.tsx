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
import { useStrings } from "@/context/LocaleContext";
import { landingStrings } from "@/i18n/surfaces/landing";
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
  { number: "01", title: "landing.how.step1Title", text: "landing.how.step1Text" },
  { number: "02", title: "landing.how.step2Title", text: "landing.how.step2Text" },
  { number: "03", title: "landing.how.step3Title", text: "landing.how.step3Text" },
] as const;

const toneReplies = {
  friendly: "landing.voice.replyFriendly",
  premium: "landing.voice.replyPremium",
  aggressive: "landing.voice.replyAggressive",
} as const satisfies Record<Tone, string>;

const toneLabels = {
  friendly: "landing.voice.toneFriendly",
  premium: "landing.voice.tonePremium",
  aggressive: "landing.voice.toneAggressive",
} as const satisfies Record<Tone, string>;

const questions = [
  { question: "landing.faq.q1", answer: "landing.faq.a1" },
  { question: "landing.faq.q2", answer: "landing.faq.a2" },
  { question: "landing.faq.q3", answer: "landing.faq.a3" },
  { question: "landing.faq.q4", answer: "landing.faq.a4" },
  { question: "landing.faq.q5", answer: "landing.faq.a5" },
] as const;

export default function LandingPage({ onOpenApp }: { onOpenApp: () => void }) {
  const { theme, toggle } = useTheme();
  const t = useStrings(landingStrings);
  const reducedMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [tone, setTone] = useState<Tone>("friendly");
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = t("landing.hero.documentTitle");
    document.body.classList.add("marketing-page");
    return () => document.body.classList.remove("marketing-page");
  }, [t]);

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
        {t("landing.nav.skipToContent")}
      </a>
      <header className="landing-header">
        <div className="landing-container header-inner">
          <a href="#top" className="brand-link" aria-label={t("landing.nav.home")}>
            <Brand />
          </a>
          <nav className="desktop-navigation" aria-label={t("landing.nav.main")}>
            <a href="#product">{t("landing.nav.product")}</a>
            <a href="#how-it-works">{t("landing.nav.howItWorks")}</a>
            <a href="#pricing">{t("landing.nav.pricing")}</a>
            <a href="#faq">{t("landing.nav.faqs")}</a>
          </nav>
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={toggle}
              aria-label={t(
                theme === "dark" ? "landing.theme.switchToLight" : "landing.theme.switchToDark",
              )}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <a href="/workspace?login" className="header-login">
              {t("landing.nav.signIn")}
              <ArrowUpRight size={13} />
            </a>
            <button
              className="closer-button closer-button-primary header-cta"
              onClick={() => openSetup()}
            >
              {t("landing.nav.getStarted")}
              <ArrowUpRight size={14} />
            </button>
            <button
              className="mobile-menu-toggle"
              ref={menuButtonRef}
              aria-label={t(
                mobileMenuOpen ? "landing.nav.close" : "landing.nav.open",
              )}
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
              aria-label={t("landing.nav.mobile")}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <a href="#product" onClick={() => setMobileMenuOpen(false)}>
                {t("landing.nav.product")}
                <ArrowUpRight size={16} />
              </a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                {t("landing.nav.howItWorks")}
                <ArrowUpRight size={16} />
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
                {t("landing.nav.pricing")}
                <ArrowUpRight size={16} />
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
                {t("landing.nav.faqs")}
                <ArrowUpRight size={16} />
              </a>
              <button onClick={openApp}>
                {t("landing.nav.openDemoInbox")}
                <ArrowRight size={16} />
              </button>
              <a href="/workspace">
                {t("landing.nav.createWorkspace")}
                <ArrowUpRight size={16} />
              </a>
              <button
                className="mobile-theme-action"
                onClick={toggle}
                aria-label={t(
                  theme === "dark" ? "landing.theme.switchToLight" : "landing.theme.switchToDark",
                )}
              >
                {t(theme === "dark" ? "landing.theme.lightMode" : "landing.theme.darkMode")}
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
            alt={t("landing.hero.imageAlt")}
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
                  {t("landing.hero.brand")}
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
                  {t("landing.hero.lessTyping")}
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
                  {t("landing.hero.moreClosing")}
                </motion.span>
              </h1>
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                }}
              >
                {t("landing.hero.subtitle")}
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
                  {t("landing.hero.ctaTry")}
                  <ArrowUpRight size={17} />
                </button>
                <a
                  href="#product"
                  className="closer-button closer-button-ghost"
                >
                  <Play size={13} fill="currentColor" />
                  {t("landing.hero.ctaWatch")}
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="channel-strip">
          <div className="landing-container channel-strip-inner">
            <p>{t("landing.channels.heading")}</p>
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
              {t("landing.channels.note")}
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
                  {t("landing.product.eyebrow")}
                </span>
                <h2 id="product-heading">
                  {t("landing.product.titleTop")}
                  <br />
                  {t("landing.product.titleBottom")}
                </h2>
              </div>
              <div className="section-intro-description">
                <p>{t("landing.product.description")}</p>
                <button className="text-link" onClick={openApp}>
                  {t("landing.product.cta")}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <ProductDemo onOpenApp={openApp} />
            </Reveal>
            <div className="product-caption">
              <span>
                <span className="caption-dot" />
                {t("landing.product.captionLeft")}
              </span>
              <span>
                {t("landing.product.captionRight")}
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
              <span className="eyebrow">{t("landing.how.eyebrow")}</span>
              <h2 id="how-heading">
                {t("landing.how.titleTop")}
                <br />
                {t("landing.how.titleBottom")}
              </h2>
              <p>{t("landing.how.subtitle")}</p>
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
                  <h3>{t(step.title)}</h3>
                  <p>{t(step.text)}</p>
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
              <span className="eyebrow">{t("landing.voice.eyebrow")}</span>
              <h2 id="voice-heading">
                {t("landing.voice.titleBusiness")}
                <br />
                {t("landing.voice.titleVoice")}
                <br />
                <span>{t("landing.voice.titleHand")}</span>
              </h2>
              <p>{t("landing.voice.description")}</p>
              <button className="text-link" onClick={() => openSetup()}>
                {t("landing.voice.cta")}
                <ArrowUpRight size={16} />
              </button>
            </Reveal>
            <Reveal className="tone-playground" delay={0.12}>
              <div className="tone-customer">
                <span>{t("landing.voice.customerLabel")}</span>
                <p>{t("landing.voice.customerMessage")}</p>
              </div>
              <div
                className="tone-selector"
                role="group"
                aria-label={t("landing.voice.toneGroupLabel")}
              >
                {(["friendly", "premium", "aggressive"] as Tone[]).map((value) => (
                  <button
                    key={value}
                    aria-pressed={tone === value}
                    className={tone === value ? "is-selected" : ""}
                    onClick={() => setTone(value)}
                  >
                    {t(toneLabels[value])}
                    {tone === value && <Check size={12} />}
                  </button>
                ))}
              </div>
              <div className="tone-reply" aria-live="polite" aria-atomic="true">
                <span>
                  <Sparkles size={13} />
                  {t("landing.voice.suggestedReplyLabel")}
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={tone}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {t(toneReplies[tone])}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="tone-footer">
                <Check size={13} />
                {t("landing.voice.footer")}
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
                  {t("landing.pricing.eyebrow")}
                </span>
                <h2 id="pricing-heading">
                  {t("landing.pricing.titleSales")}
                  <br />
                  {t("landing.pricing.titleOverhead")}
                </h2>
                <p>{t("landing.pricing.subtitle")}</p>
              </div>
              <div
                className="billing-switch"
                role="group"
                aria-label={t("landing.pricing.billingGroupLabel")}
              >
                <button
                  className={!annual ? "is-selected" : ""}
                  aria-pressed={!annual}
                  onClick={() => setAnnual(false)}
                >
                  {t("landing.pricing.monthly")}
                </button>
                <button
                  className={annual ? "is-selected" : ""}
                  aria-pressed={annual}
                  onClick={() => setAnnual(true)}
                >
                  {t("landing.pricing.yearly")}
                  <span>{t("landing.pricing.yearlySave")}</span>
                </button>
              </div>
            </Reveal>
            <Reveal className="plans-grid">
              <article className="pricing-plan">
                <div className="plan-heading">
                  <h3>{t("landing.pricing.starterName")}</h3>
                  <p>{t("landing.pricing.starterTagline")}</p>
                </div>
                <div className="plan-price">
                  <span>$</span>
                  {annual ? "24" : "29"}
                  <small>{t("landing.pricing.priceSuffix")}</small>
                </div>
                <p className="plan-billing">
                  {t(
                    annual
                      ? "landing.pricing.starterBilledYearly"
                      : "landing.pricing.starterBilledMonthly",
                  )}
                </p>
                <button
                  className="closer-button closer-button-outline"
                  onClick={() => openSetup("Starter")}
                >
                  {t("landing.pricing.starterCta")}
                  <ArrowUpRight size={15} />
                </button>
                <ul>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.starterFeatureConversations")}
                  </li>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.starterFeatureInbox")}
                  </li>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.starterFeatureVoice")}
                  </li>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.starterFeatureTeammates")}
                  </li>
                </ul>
              </article>
              <article className="pricing-plan growth-plan">
                <div className="plan-heading">
                  <h3>
                    {t("landing.pricing.growthName")}
                    <span>{t("landing.pricing.growthBadge")}</span>
                  </h3>
                  <p>{t("landing.pricing.growthTagline")}</p>
                </div>
                <div className="plan-price">
                  <span>$</span>
                  {annual ? "64" : "79"}
                  <small>{t("landing.pricing.priceSuffix")}</small>
                </div>
                <p className="plan-billing">
                  {t(
                    annual
                      ? "landing.pricing.growthBilledYearly"
                      : "landing.pricing.growthBilledMonthly",
                  )}
                </p>
                <button
                  className="closer-button closer-button-primary"
                  onClick={() => openSetup("Growth")}
                >
                  {t("landing.pricing.growthCta")}
                  <ArrowUpRight size={15} />
                </button>
                <ul>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.growthFeatureConversations")}
                  </li>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.growthFeatureStarter")}
                  </li>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.growthFeatureAutoSend")}
                  </li>
                  <li>
                    <Check size={14} />
                    {t("landing.pricing.growthFeatureTeammates")}
                  </li>
                </ul>
              </article>
            </Reveal>
            <p className="pricing-note">{t("landing.pricing.note")}</p>
          </div>
        </section>

        <section
          className="faq-section landing-section"
          id="faq"
          aria-labelledby="faq-heading"
        >
          <div className="landing-container faq-grid">
            <Reveal>
              <span className="eyebrow">{t("landing.faq.eyebrow")}</span>
              <h2 id="faq-heading">
                {t("landing.faq.titleTop")}
                <br />
                {t("landing.faq.titleBottom")}
              </h2>
              <p>{t("landing.faq.subtitle")}</p>
            </Reveal>
            <Reveal className="faq-list">
              {questions.map((item, index) => (
                <details key={item.question} name="dmcloser-faq">
                  <summary>
                    <span className="faq-number">0{index + 1}</span>
                    <span>{t(item.question)}</span>
                    <Plus size={17} />
                  </summary>
                  <p>{t(item.answer)}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-heading">
          <div className="landing-container closing-inner">
            <Reveal>
              <span className="eyebrow">{t("landing.closing.eyebrow")}</span>
              <h2 id="closing-heading">
                {t("landing.closing.titleTop")}
                <br />
                {t("landing.closing.titleBottom")}
              </h2>
            </Reveal>
            <Reveal className="closing-actions" delay={0.1}>
              <button
                className="closer-button closer-button-cream"
                onClick={() => openSetup()}
              >
                {t("landing.closing.cta")}
                <ArrowUpRight size={17} />
              </button>
              <span>{t("landing.closing.note")}</span>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-main">
          <a href="#top" aria-label={t("landing.nav.home")} className="brand-link">
            <Brand />
          </a>
          <span className="footer-tagline">{t("landing.footer.tagline")}</span>
          <nav aria-label={t("landing.nav.footer")}>
            <a href="#product">{t("landing.nav.product")}</a>
            <a href="#pricing">{t("landing.nav.pricing")}</a>
            <a href="#faq">{t("landing.nav.faqs")}</a>
          </nav>
        </div>
        <div className="landing-container footer-bottom">
          <span>{t("landing.footer.copyright", { year: new Date().getFullYear() })}</span>
          <div>
            <button onClick={() => setLegal("privacy")}>{t("landing.footer.privacy")}</button>
            <button onClick={() => setLegal("terms")}>{t("landing.footer.terms")}</button>
            <span className="footer-status">
              <span />
              {t("landing.footer.status")}
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
          title={t(
            legal === "privacy"
              ? "landing.legal.privacyTitle"
              : "landing.legal.termsTitle",
          )}
          onClose={() => setLegal(null)}
          className="legal-dialog"
        >
          {legal === "privacy" ? (
            <div className="legal-copy">
              <p>{t("landing.legal.privacyP1")}</p>
              <h3>{t("landing.legal.privacyH1")}</h3>
              <p>{t("landing.legal.privacyP2")}</p>
              <h3>{t("landing.legal.privacyH2")}</h3>
              <p>{t("landing.legal.privacyP3")}</p>
              <h3>{t("landing.legal.privacyH3")}</h3>
              <p>{t("landing.legal.privacyP4")}</p>
            </div>
          ) : (
            <div className="legal-copy">
              <p>{t("landing.legal.termsP1")}</p>
              <h3>{t("landing.legal.termsH1")}</h3>
              <p>{t("landing.legal.termsP2")}</p>
              <h3>{t("landing.legal.termsH2")}</h3>
              <p>{t("landing.legal.termsP3")}</p>
            </div>
          )}
        </DialogShell>
      )}
    </div>
  );
}
