import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Barcode,
  BookBookmark,
  ChartLineUp,
  Calendar,
  ShieldCheck,
  CaretRight,
  Star,
  Check,
  List,
  X,
} from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BrandName } from "../components/BrandName";
import { AppFooter } from "../components/AppFooter";
import { usePageTitle } from "../hooks/usePageTitle";

// brand-900=#1e3a8a  brand-700=#1d4ed8  brand-600=#2563eb  brand-50=#eff6ff  brand-100=#dbeafe
const B9 = "#1e3a8a";
const B7 = "#1d4ed8";
const B6 = "#2563eb";

function WellnessGauge({ score }) {
  return (
    <div style={{ position: "relative", width: 110, height: 110 }}>
      <ResponsiveContainer width={110} height={110}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          barSize={12}
          data={[{ name: "Score", value: score }]}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar background dataKey="value" cornerRadius={6} fill={B6} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-extrabold text-xl leading-none text-brand-600">
          {score}
        </span>
        <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">
          Score
        </span>
      </div>
    </div>
  );
}

function WeeklyChart() {
  const data = [
    { day: "Mon", cal: 1850, score: 82 },
    { day: "Tue", cal: 1920, score: 85 },
    { day: "Wed", cal: 1780, score: 78 },
    { day: "Thu", cal: 2010, score: 88 },
    { day: "Fri", cal: 1950, score: 84 },
    { day: "Sat", cal: 1680, score: 72 },
    { day: "Sun", cal: 1740, score: 75 },
  ];
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis
            yAxisId="r"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="l"
            dataKey="cal"
            name="Calories"
            fill={B6}
            barSize={24}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="score"
            name="Wellness"
            stroke={B7}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function MacroPie() {
  const data = [
    { name: "Carbs", value: 220, color: B6 },
    { name: "Protein", value: 68, color: B7 },
    { name: "Fat", value: 52, color: "#93c5fd" },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-6">
      <div style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => `${v}g`}
              contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: d.color,
              }}
            />
            <span className="text-xs text-slate-400 w-12">{d.name}</span>
            <span className="text-xs font-bold text-brand-700">{d.value}g</span>
            <span className="text-[11px] text-slate-400">
              ({Math.round((d.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navLinks = [
    ["#features", "Features"],
    ["#how-it-works", "How it works"],
    ["#testimonials", "Reviews"],
  ];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b border-slate-100 bg-white transition-all duration-300 ${scrolled ? "shadow-sm backdrop-blur-md bg-white/95" : ""}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link
            to="/"
            className="font-semibold text-lg tracking-tight text-brand-900"
          >
            <BrandName />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-slate-600 hover:text-brand-700 transition"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium rounded-lg text-brand-700 hover:bg-brand-50 transition"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-brand-600 hover:bg-brand-700 transition"
            >
              Get started
            </Link>
          </div>
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-50"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-white border-t border-slate-100 p-4 shadow-lg">
          <div className="flex flex-col gap-1">
            {navLinks.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50"
              >
                {label}
              </a>
            ))}
            <hr className="my-2 border-slate-100" />
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm font-medium text-center rounded-lg border border-slate-200"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm font-medium text-center rounded-lg text-white bg-brand-600 mt-1"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function Landing() {
  usePageTitle("Home");

  return (
    <div className="bg-white text-ink overflow-x-hidden">
      <style>{`html{scroll-behavior:smooth}@keyframes scanline{0%{top:8%;opacity:1}48%{top:88%;opacity:1}50%{top:88%;opacity:0}52%{top:8%;opacity:0}54%{top:8%;opacity:1}100%{top:8%;opacity:1}}.scan-line{animation:scanline 2.6s ease-in-out infinite}`}</style>
      <NavBar />

      {/* HERO */}
      <section className="bg-slate-50 border-b border-slate-100 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle,#bfdbfe 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <img
          src="/images/philippines.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 -right-[30%] w-[180vw] sm:w-[900px] sm:-right-24 max-w-none opacity-[0.06] pointer-events-none select-none"
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-widest w-fit bg-brand-50 text-brand-700">
                Built for Filipinos 🇵🇭
              </span>
              <div>
                <h1 className="font-display text-[clamp(2.2rem,6vw,3.6rem)] font-extrabold leading-[1.1] tracking-tight text-ink">
                  Scan wise.
                  <br />
                  Eat well.
                  <br />
                  <span className="text-brand-600">Feel better.</span>
                </h1>
                <p className="mt-4 text-base text-ink-mute leading-relaxed max-w-md">
                  Scan any food barcode, track your macros, and get personalized
                  recommendations built around your health goals — with a
                  Filipino food database built in.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition"
                >
                  Create free account <CaretRight size={15} />
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold text-ink-soft border border-slate-200 hover:bg-slate-50 transition"
                >
                  Log in
                </Link>
              </div>
              <div className="flex gap-8 pt-2 border-t border-slate-200">
                {[
                  ["50K+", "Foods tracked"],
                  ["10K+", "Active users"],
                  ["4.8", "Rating", true],
                ].map(([n, l, withStar]) => (
                  <div key={l}>
                    <div className="font-extrabold text-xl leading-none text-brand-700 flex items-center gap-1">
                      {n}
                      {withStar && (
                        <Star size={16} weight="fill" className="text-brand-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-widest mt-1">
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating cards */}
            <div className="relative flex justify-center min-h-[420px]">
              <img
                src="/images/person.svg"
                alt="Person using KainWise"
                className="w-full max-w-[400px] object-contain drop-shadow-xl relative z-10"
              />

              <div className="absolute top-[5%] right-0 z-10">
                <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-100 min-w-[180px] relative">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Daily goal
                  </div>
                  <div className="font-black text-[2rem] leading-none text-brand-700">
                    87
                    <span className="text-sm text-slate-400 font-normal">
                      /100
                    </span>
                  </div>
                  <div className="h-2 bg-brand-50 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: "87%" }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold mt-2 text-brand-600">
                    <Check size={12} weight="bold" />
                    On track
                  </div>
                  <div className="absolute -bottom-2.5 left-6 w-5 h-5 bg-white border border-slate-100 border-t-0 border-r-0 rotate-[-45deg] rounded-bl shadow-sm" />
                </div>
              </div>

              <div className="absolute bottom-[14%] left-[-2%] z-10">
                <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-100 min-w-[200px] relative">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Last scan
                  </div>
                  <div className="font-bold text-base mb-2.5 text-brand-900">
                    Pancit Canton
                  </div>
                  <div className="flex gap-2">
                    {[
                      ["330", "kcal"],
                      ["12g", "fat"],
                      ["9g", "prot"],
                    ].map(([v, l]) => (
                      <div
                        key={l}
                        className="rounded-xl px-3 py-1.5 text-center bg-brand-50"
                      >
                        <div className="font-black text-sm text-brand-700">
                          {v}
                        </div>
                        <div className="text-[10px] text-slate-400">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute -bottom-2.5 right-6 w-5 h-5 bg-white border border-slate-100 border-t-0 border-l-0 rotate-45 rounded-br shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-brand-50 border-b border-brand-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              ["50K+", "Foods in database"],
              ["10K+", "Active users"],
              ["98%", "Scan accuracy"],
              ["4.8", "Average rating", true],
            ].map(([n, l, withStar], i) => (
              <div
                key={l}
                className={`py-6 px-4 text-center ${i < 3 ? "border-r border-brand-100" : ""}`}
              >
                <div className="font-extrabold text-[1.75rem] leading-none text-brand-700 inline-flex items-center gap-1">
                  {n}
                  {withStar && (
                    <Star size={20} weight="fill" className="text-brand-500" />
                  )}
                </div>
                <div className="text-[11px] text-brand-600/70 uppercase tracking-widest mt-1">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-3 bg-brand-50 text-brand-700">
                Features
              </span>
              <h2 className="font-display text-[clamp(1.5rem,5vw,2.4rem)] font-extrabold tracking-tight leading-tight text-ink">
                Everything to eat smarter
              </h2>
            </div>
            <p className="text-sm text-slate-400 max-w-xs sm:text-right hidden sm:block">
              From barcode to nutrition report — KainWise covers every step.
            </p>
          </div>

          {/* Scanner showcase */}
          <div className="rounded-3xl border border-slate-200 overflow-hidden mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="flex flex-col gap-8 p-8 sm:p-12 justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
                    <Barcode size={20} className="text-brand-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Core feature
                  </span>
                </div>
                <div>
                  <h2 className="font-display text-[clamp(1.4rem,4vw,2rem)] font-extrabold tracking-tight leading-tight mb-3 text-ink">
                    Instant barcode scanner
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                    Point at any barcode and get full nutritional data in under
                    a second. Covers 50,000+ Filipino and international foods.
                  </p>
                </div>
                <div className="flex gap-8 pt-4 border-t border-slate-100">
                  {[
                    ["50K+", "foods"],
                    ["<1s", "scan time"],
                    ["98%", "accuracy"],
                  ].map(([n, l]) => (
                    <div key={l}>
                      <div className="font-black text-xl leading-none text-brand-700">
                        {n}
                      </div>
                      <div className="text-[11px] text-slate-400 uppercase tracking-widest mt-1">
                        {l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center p-10 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100">
                <div className="w-full max-w-xs bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Scanned
                      </div>
                      <div className="font-bold text-sm mt-0.5 text-brand-900">
                        Pancit Canton
                      </div>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full bg-brand-500"
                      style={{ boxShadow: "0 0 8px #3b82f6" }}
                    />
                  </div>
                  <div className="p-5 bg-slate-50 flex justify-center">
                    <div className="relative w-48 h-14">
                      <svg width="192" height="56" viewBox="0 0 192 56">
                        {[
                          3, 7, 5, 2, 8, 4, 6, 3, 9, 2, 5, 7, 4, 3, 6, 8, 2, 5,
                          7, 4, 3, 6, 5, 8, 3, 7, 4, 2, 6, 5, 8, 3, 7, 5, 4, 2,
                          6, 8, 3, 5,
                        ].map((w, i) =>
                          i % 2 === 0 ? (
                            <rect
                              key={i}
                              x={i * 5}
                              y={0}
                              width={Math.min(w / 3 + 1, 4)}
                              height={56}
                              fill={B9}
                              opacity={0.7}
                            />
                          ) : null,
                        )}
                      </svg>
                      <div
                        className="scan-line absolute left-0 right-0 h-0.5 bg-brand-500"
                        style={{ boxShadow: "0 0 8px #3b82f6", top: "8%" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-slate-100">
                    {[
                      ["Calories", "330", "kcal"],
                      ["Macros", "12g / 9g", "fat · prot"],
                      ["Sodium", "480", "mg"],
                      ["Sugar", "2", "g"],
                    ].map(([label, val, unit]) => (
                      <div key={label} className="bg-white p-3.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {label}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-black text-lg leading-none text-brand-800">
                            {val}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature list */}
          <div>
            {[
              {
                n: "01",
                icon: <BookBookmark size={16} />,
                title: "AI Wellness Diary",
                desc: "Write daily entries and receive personalized AI feedback on your habits and nutrition patterns.",
              },
              {
                n: "02",
                icon: <ChartLineUp size={16} />,
                title: "Wellness Score",
                desc: "A daily score built from your nutrition, activity, and logged meals — updated in real time.",
              },
              {
                n: "03",
                icon: <Calendar size={16} />,
                title: "Health Calendar",
                desc: "Visualize your eating patterns and wellness trends week by week in a clean calendar view.",
              },
              {
                n: "04",
                icon: <ShieldCheck size={16} />,
                title: "Allergy Tracking",
                desc: "Flag dietary restrictions once. Get instant alerts on every barcode scan, automatically.",
              },
            ].map(({ n, icon, title, desc }) => (
              <div
                key={n}
                className="grid grid-cols-[56px_1fr_1fr] gap-6 py-7 border-t border-slate-100 items-center"
              >
                <span className="font-black text-[2.2rem] leading-none select-none text-brand-100">
                  {n}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-brand-50 text-brand-600">
                    {icon}
                  </div>
                  <span className="font-bold text-sm text-ink">{title}</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
            <div className="border-t border-slate-100" />
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 items-end">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-3 bg-brand-50 text-brand-700">
                Dashboard
              </span>
              <h2 className="font-display text-[clamp(1.5rem,5vw,2.2rem)] font-extrabold tracking-tight leading-tight text-ink">
                Your health,
                <br />
                at a glance
              </h2>
            </div>
            <div>
              <p className="text-base text-slate-400 leading-relaxed mb-5">
                Every meal you log builds your personal nutrition picture. See
                your macros, meals, and wellness score update in real time.
              </p>
              <div className="flex flex-col gap-0">
                {[
                  "Automatic macro calculations per meal",
                  "Daily wellness score based on your goals",
                  "Filipino food database built-in",
                  "Weekly trend charts and insights",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 py-2.5 border-b border-slate-200"
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-brand-600">
                      <Check size={10} color="#fff" weight="bold" />
                    </div>
                    <span className="text-sm text-ink-mute">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/register"
                className="inline-flex mt-6 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition"
              >
                Start tracking free
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                      Today's intake
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-[2rem] leading-none text-brand-700">
                        1,840
                      </span>
                      <span className="text-sm text-slate-400">
                        / 2,100 kcal
                      </span>
                    </div>
                    <div className="h-1.5 w-48 bg-brand-50 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: "87%" }}
                      />
                    </div>
                  </div>
                  <WellnessGauge score={87} />
                </div>
                <hr className="border-slate-100 mb-4" />
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Macro distribution
                </div>
                <MacroPie />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Weekly trends
                </div>
                <WeeklyChart />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-center">
                <img
                  src="/images/eating-healthy.svg"
                  alt="Eating healthy"
                  className="w-full max-w-[260px] drop-shadow-lg"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
                  Today's meals
                </div>
                <div>
                  {[
                    {
                      meal: "Breakfast",
                      food: "Tapsilog + Rice",
                      kcal: 490,
                      time: "7:30 AM",
                    },
                    {
                      meal: "Lunch",
                      food: "Sinigang na Baboy",
                      kcal: 310,
                      time: "12:15 PM",
                    },
                    {
                      meal: "Snack",
                      food: "Pandesal × 2",
                      kcal: 240,
                      time: "3:00 PM",
                    },
                    {
                      meal: "Dinner",
                      food: "Chicken Adobo",
                      kcal: 380,
                      time: "7:00 PM",
                    },
                  ].map(({ meal, food, kcal, time }, i, arr) => (
                    <div
                      key={meal}
                      className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0 bg-brand-500" />
                        <div>
                          <div className="text-sm font-semibold text-ink">
                            {food}
                          </div>
                          <div className="text-xs text-slate-400">
                            {meal} · {time}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold font-mono text-brand-600">
                        {kcal} kcal
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-semibold">
                    Total logged
                  </span>
                  <span className="text-sm font-black font-mono text-brand-700">
                    1,420 kcal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="py-20 bg-white relative overflow-hidden border-t border-slate-100"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle,#bfdbfe 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="flex flex-col gap-5">
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-widest w-fit bg-brand-50 text-brand-700">
                How it works
              </span>
              <h2 className="font-display text-[clamp(1.5rem,5vw,2.2rem)] font-extrabold tracking-tight leading-tight text-ink">
                Up and running in minutes
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                No complicated setup. Create your profile once and start
                scanning right away.
              </p>
              <Link
                to="/register"
                className="inline-flex px-5 py-2.5 rounded-lg text-sm font-semibold text-white w-fit bg-brand-600 hover:bg-brand-700 transition"
              >
                Get started free
              </Link>
            </div>
            <div className="flex flex-col gap-8">
              {[
                {
                  n: 1,
                  title: "Create your account",
                  desc: "Sign up in under 2 minutes with your email and basic health information.",
                },
                {
                  n: 2,
                  title: "Build your health profile",
                  desc: "Input your age, body metrics, goals, allergies, and dietary preferences.",
                },
                {
                  n: 3,
                  title: "Scan your food",
                  desc: "Use your phone camera to scan barcodes and log meals throughout the day.",
                },
                {
                  n: 4,
                  title: "Track your progress",
                  desc: "Review your wellness score, nutrition breakdown, and trends on your dashboard.",
                },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex items-start gap-5">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm bg-brand-600 shadow-glow">
                    {n}
                  </div>
                  <div className="pt-1">
                    <div className="font-bold text-sm mb-1 text-ink">
                      {title}
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        id="testimonials"
        className="py-20 bg-slate-50 border-t border-slate-100"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-14 items-end">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-3 bg-brand-50 text-brand-700">
                Reviews
              </span>
              <h2 className="font-display text-[clamp(1.5rem,5vw,2.4rem)] font-extrabold tracking-tight leading-tight text-ink">
                What users
                <br />
                are saying
              </h2>
            </div>
            <p className="text-base text-slate-400 leading-relaxed">
              Real experiences from Filipinos using KainWise to understand their
              food, reach their goals, and feel better every day.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                initials: "MR",
                name: "Maria R.",
                role: "Fitness enthusiast",
                quote:
                  "I finally understand what I'm eating. The barcode scanner is incredibly fast and the Filipino food database is so complete!",
              },
              {
                initials: "JP",
                name: "Juan P.",
                role: "Post-surgery recovery",
                quote:
                  "My doctor recommended tracking sodium. KainWise makes it effortless — one scan and I know exactly what's in my food.",
              },
              {
                initials: "AS",
                name: "Ana S.",
                role: "Student, Davao City",
                quote:
                  "The AI diary is like having a nutritionist in my pocket. It gives helpful advice, not just generic tips.",
              },
              {
                initials: "KL",
                name: "Kat L.",
                role: "New mom",
                quote:
                  "Being able to track my nutrition while breastfeeding gives me peace of mind. The health profile for new moms is so thoughtful.",
              },
            ].map(({ initials, name, role, quote }) => (
              <div
                key={name}
                className="flex flex-col bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-card transition-shadow"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      weight="fill"
                      className="text-brand-500"
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed flex-1">
                  "{quote}"
                </p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-brand-600">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink">{name}</div>
                    <div className="text-xs text-slate-400">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden bg-brand-700">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="flex justify-center">
              <img
                src="/images/eating-healthy.svg"
                alt="Eating healthy"
                className="w-full max-w-xs"
                style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
              />
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-[clamp(1.75rem,5vw,3rem)] font-extrabold tracking-tight leading-tight text-white">
                  Start eating smarter today
                </h2>
                <p className="mt-3 text-base leading-relaxed text-brand-200">
                  Join thousands of Filipinos already using KainWise to
                  understand their food and reach their health goals.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-lg text-sm font-bold bg-white text-brand-700 hover:bg-brand-50 transition"
                >
                  Create free account
                </Link>
                <Link
                  to="/"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
