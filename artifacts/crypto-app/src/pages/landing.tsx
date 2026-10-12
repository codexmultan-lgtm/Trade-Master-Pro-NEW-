import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import type { Variants } from "framer-motion";
import { useGetMarkets, type Market } from "@workspace/api-client-react";
import { useSocket } from "@/hooks/useSocket";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  BarChart2,
  Globe,
  ArrowRight,
  ChevronDown,
  Twitter,
  Github,
  Send,
  Star,
  Lock,
  Wallet,
  Bell,
  CheckCircle,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type MarketData = Market;

function LiveTicker() {
  const { data: markets } = useGetMarkets();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const { subscribe } = useSocket();

  useEffect(() => {
    if (markets) {
      const map: Record<string, number> = {};
      markets.forEach((m) => { map[m.symbol] = m.lastPrice; });
      setPrices(map);
    }
  }, [markets]);

  useEffect(() => {
    const unsub = subscribe("price_update", (data: { symbol: string; price: number }) => {
      setPrices(prev => ({ ...prev, [data.symbol]: data.price }));
    });
    return unsub;
  }, [subscribe]);

  const items = markets ?? [];

  return (
    <div className="w-full overflow-hidden bg-black/40 border-y border-white/5 py-2">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((m, i) => {
          const price = prices[m.symbol] ?? m.lastPrice ?? 0;
          const change = m.change24h ?? 0;
          const isUp = change >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 text-sm font-mono">
              <span className="text-white/60">{m.symbol}</span>
              <span className="text-white font-semibold">
                {m.symbol?.endsWith("PKR")
                  ? "₨" + Number(price).toLocaleString("en-PK", { maximumFractionDigits: 0 })
                  : m.symbol?.endsWith("INR")
                  ? "₹" + Number(price).toLocaleString("en-IN", { maximumFractionDigits: 0 })
                  : "$" + Number(price).toFixed(2)}
              </span>
              <span className={isUp ? "text-emerald-400" : "text-red-400"}>
                {isUp ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                {" "}{isUp ? "+" : ""}{change.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

function Navbar({ scrolled }: { scrolled: boolean }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a0a0f]/95 backdrop-blur border-b border-white/5 shadow-lg" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            CryptoTrade
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {["features", "markets", "how-it-works", "about"].map((s) => (
            <button
              key={s}
              onClick={() => scrollTo(s)}
              className="text-sm text-white/60 hover:text-white transition-colors capitalize"
            >
              {s.replace("-", " ")}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">
              Login
            </button>
          </Link>
          <Link href="/register">
            <button className="text-sm font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black px-4 py-2 rounded-lg transition-all duration-200 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              Get Started
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 120]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <motion.div style={{ y, opacity }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(52,211,153,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(6,182,212,0.08),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </motion.div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Live Binary Options Trading Platform</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-tight"
        >
          <span className="text-white">Trade Crypto</span>
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Binary Options
          </span>
          <br />
          <span className="text-white">Like a Pro</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Real-time candlestick charts, 10 crypto pairs, and instant UP/DOWN binary trades.
          Earn up to 85% profit on winning positions.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/register">
            <button className="group inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 shadow-[0_0_30px_rgba(52,211,153,0.4)] hover:shadow-[0_0_40px_rgba(52,211,153,0.6)]">
              Start Trading Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <Link href="/login">
            <button className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200">
              Sign In
            </button>
          </Link>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto"
        >
          {[
            { value: "10", label: "Crypto Pairs" },
            { value: "85%", label: "Max Profit" },
            { value: "2s", label: "Price Updates" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
          className="mt-16 flex justify-center"
        >
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="text-white/30 hover:text-white/60 transition-colors animate-bounce"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: BarChart2, title: "Live Candlestick Charts", desc: "Professional TradingView charts with real-time 1-minute candles for all 10 crypto pairs.", color: "emerald" },
    { icon: Zap, title: "Instant Trade Settlement", desc: "Trades auto-settle in 60–240 seconds. Win up to 85% profit on correct direction calls.", color: "yellow" },
    { icon: Shield, title: "Secure JWT Auth", desc: "Bank-grade JWT authentication with encrypted passwords. Your account, your control.", color: "blue" },
    { icon: Globe, title: "10 Crypto Pairs", desc: "BTC/PKR, BTC/INR, ETH/PKR, ETH/INR, USDT/PKR, USDT/INR and more — all live with socket-powered real-time updates.", color: "purple" },
    { icon: Wallet, title: "Virtual Wallet", desc: "Deposit and withdraw with admin approval. Full transaction history with real-time notifications.", color: "cyan" },
    { icon: Bell, title: "Real-Time Notifications", desc: "Socket.IO powered trade settlements, deposit approvals, and balance updates delivered instantly.", color: "rose" },
  ];

  const colorMap: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 text-yellow-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400",
  };

  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4">
            <Star className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-medium text-white/60">Platform Features</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4">
            Everything You Need to Trade
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-white/40 max-w-2xl mx-auto">
            A complete binary options trading platform built for speed, security, and simplicity.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            const colors = colorMap[f.color];
            return (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors} border flex items-center justify-center mb-5`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </AnimatedSection>
      </div>
    </section>
  );
}

function LiveMarketsSection() {
  const { data: markets } = useGetMarkets();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const { subscribe } = useSocket();

  useEffect(() => {
    if (markets) {
      const map: Record<string, number> = {};
      markets.forEach((m) => { map[m.symbol] = m.lastPrice; });
      setPrices(map);
    }
  }, [markets]);

  useEffect(() => {
    const unsub = subscribe("price_update", (data: { symbol: string; price: number }) => {
      setPrices(prev => ({ ...prev, [data.symbol]: data.price }));
    });
    return unsub;
  }, [subscribe]);

  const symbolColors: Record<string, string> = {
    BTCUSDT: "from-orange-500 to-yellow-500",
    BTCINR: "from-orange-600 to-red-500",
    ETHUSDT: "from-blue-500 to-purple-500",
    ETHINR: "from-blue-600 to-indigo-500",
    BNBUSDT: "from-yellow-400 to-orange-400",
  };

  return (
    <section id="markets" className="py-24 px-4 bg-white/[0.01]">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Live Market Data</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4">
            Real-Time Price Feed
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-white/40 max-w-2xl mx-auto">
            Prices update every 2 seconds via WebSocket. Trade any pair with a single click.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(markets ?? []).map((m, i) => {
            const price = prices[m.symbol] ?? m.lastPrice ?? 0;
            const change = m.change24h ?? 0;
            const isUp = change >= 0;
            const gradient = symbolColors[m.symbol] ?? "from-gray-500 to-gray-600";
            return (
              <motion.div
                key={m.symbol}
                variants={fadeUp}
                custom={i}
                className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <span className="text-xs font-black text-white">{m.symbol.replace("USDT","").replace("INR","")}</span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{m.symbol.slice(0, 3)}/{m.symbol.slice(3)}</div>
                      <div className="text-xs text-white/30">Binary Options</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isUp ? "+" : ""}{change.toFixed(2)}%
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  ${Number(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                  <Link href="/register" className="flex-1">
                    <button className="w-full py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors border border-emerald-500/20">
                      ▲ BUY UP
                    </button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <button className="w-full py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors border border-red-500/20">
                      ▼ BUY DOWN
                    </button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </AnimatedSection>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { icon: CheckCircle, step: "01", title: "Create Account", desc: "Register in seconds. No KYC required for demo trading. Start immediately." },
    { icon: Wallet, step: "02", title: "Fund Your Wallet", desc: "Submit a deposit request. Admin approves and credits your trading balance." },
    { icon: BarChart2, step: "03", title: "Read the Chart", desc: "Study the live candlestick chart, analyze trend direction, pick your entry." },
    { icon: TrendingUp, step: "04", title: "Place Your Trade", desc: "Select UP or DOWN, set your amount and timer (60–240s), confirm the trade." },
    { icon: Zap, step: "05", title: "Auto Settlement", desc: "Trade auto-settles at expiry. Win: get back amount + up to 85% profit." },
    { icon: Star, step: "06", title: "Track & Withdraw", desc: "View history, track P&L, and request withdrawals from your wallet page." },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-medium text-white/60">Simple Process</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4">
            How It Works
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-white/40 max-w-2xl mx-auto">
            From signup to your first trade in under 5 minutes.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                variants={fadeUp}
                custom={i}
                className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className="absolute top-6 right-6 text-4xl font-black text-white/[0.04] select-none">{s.step}</div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </AnimatedSection>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="py-24 px-4 bg-white/[0.01]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <Lock className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-medium text-white/60">About the Platform</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Built for Serious{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Crypto Traders
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/50 text-base leading-relaxed mb-6">
              DualTrade is a fully secured binary options platform with real-time price feeds and
              professional candlestick charts. 
            </motion.p>
            <motion.p variants={fadeUp} className="text-white/50 text-base leading-relaxed mb-8">
              Every wallet is user-controlled — deposits and withdrawals go through an approval workflow and are fully secure.
              User can Withdraw balances, force trade outcomes, and manage the entire account.
            
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/register">
                <button className="group inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold px-6 py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                  Open Your Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Pairs", value: "10", sub: "Live markets" },
                { label: "Max Return", value: "85%", sub: "60s trades" },
                { label: "Settlement", value: "Auto", sub: "Every 3 seconds" },
                { label: "Stack", value: "MERN", sub: "Full-stack" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  custom={i}
                  className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-6 text-center"
                >
                  <div className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-white">{stat.label}</div>
                  <div className="text-xs text-white/30 mt-1">{stat.sub}</div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <AnimatedSection>
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent p-12 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(52,211,153,0.15),transparent_70%)] pointer-events-none" />
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4 relative">
              Ready to Start Trading?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-white/50 mb-8 relative max-w-xl mx-auto">
              Create your free account now. Fund your wallet so you can start trading binary options immediately.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center relative">
              <Link href="/register">
                <button className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/login">
                <button className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all duration-200">
                  Sign In to Dashboard
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              CryptoTrade
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
            <span>Trusted Trading Platform</span>
            <span>·</span>
            <span>Instant Withdrawls</span>
            <span>·</span>
            <span>Live Binary Trades</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="text-white/30 hover:text-white/60 transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="text-white/30 hover:text-white/60 transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="text-white/30 hover:text-white/60 transition-colors">
              <Send className="w-4 h-4" />
            </a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-white/20">
          © {new Date().getFullYear()} CryptoTrade. All rights reserved. For educational and demo purposes only.
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar scrolled={scrolled} />
      <LiveTicker />
      <HeroSection />
      <FeaturesSection />
      <LiveMarketsSection />
      <HowItWorksSection />
      <AboutSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
