import { Link } from 'react-router-dom'
import content from '../content/siteContent.json'
import WavePlane from '../components/WavePlane'
import * as Lucide from 'lucide-react'
import { useAuth } from '../data/AuthContext'


export default function HomePage() {
  const { brandName, home } = content
  const { isAuthenticated, logout } = useAuth()

  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-0">
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden px-6 py-32 lg:py-40">
        {/* Background with overlay gradient */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-dnarai-navy-700 via-dnarai-navy-600 to-dnarai-navy-800" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2574')] bg-cover bg-center opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-dnarai-navy-900/90 via-dnarai-navy-800/50 to-transparent" />
          {/* Animated accent orbs */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-dnarai-gold-400/20 blur-[100px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-dnarai-gold-200/10 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto max-w-[1400px] relative z-10 grid gap-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-6 py-3 text-xs font-bold uppercase tracking-wider text-white/90 shadow-soft">
              <span className="flex h-2.5 w-2.5 rounded-full bg-coral-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
              Premium Travel Management
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[0.95] font-display">
              {home.hero.title}
            </h1>

            <p className="max-w-2xl text-lg md:text-xl font-medium text-white/80 leading-relaxed mx-auto lg:mx-0">
              {home.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 justify-center lg:justify-start">
              <Link
                to="/dashboard"
                className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-bold uppercase tracking-wide text-ocean-700 shadow-card-hover transition-all duration-300 hover:shadow-[0_12px_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-100"
              >
                <span>{isAuthenticated ? 'Manage My Travel' : home.hero.primaryCta.label}</span>
                <Lucide.ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/5 backdrop-blur-xl px-8 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-soft transition-all duration-300 hover:bg-red-500/20 hover:border-red-500/40 active:scale-95"
                >
                  <Lucide.LogOut size={18} />
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/5 backdrop-blur-xl px-8 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-soft transition-all duration-300 hover:bg-white/15 hover:border-white/50 active:scale-95"
                >
                  {home.hero.secondaryCta.label}
                </Link>
              )}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-10 bg-sky-500/20 blur-[100px] rounded-full opacity-50 animate-pulse" />
            <div className="relative glass-card rounded-[3rem] p-4 border-white/5 shadow-2xl bg-white/5 backdrop-blur-sm">
              <div className="bg-slate-900/80 rounded-[2.5rem] p-10 overflow-hidden relative border border-white/10">
                <WavePlane label="Operational Flight Status" />
                <div className="mt-10 grid grid-cols-2 gap-6">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Network</div>
                    <div className="text-lg font-black text-green-500 uppercase italic font-display">Active</div>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Sync</div>
                    <div className="text-lg font-black text-sky-400 uppercase italic font-display">Real-Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="bg-sand-50 py-24 border-y border-sand-200 dark:bg-slate-950 dark:border-slate-800 relative z-20">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: 'Happy Travelers', value: '12K+' },
              { label: 'Destinations', value: '850+' },
              { label: 'Years Experience', value: '15+' },
              { label: 'Travel Partners', value: '120+' },
            ].map(stat => (
              <div key={stat.label} className="text-center space-y-3">
                <div className="text-4xl md:text-5xl font-black tracking-tight text-ocean-700 dark:text-ocean-400 font-display">{stat.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-ocean-600/70 dark:text-ocean-500/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CORE SOLUTIONS --- */}
      <section className="py-32 bg-white dark:bg-slate-900/20 px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-[1400px] space-y-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-ocean-600">Why Choose Us</h2>
            <p className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-display">
              Tailored Travel <br />
              <span className="text-ocean-600">For Every Journey</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Lucide.Compass,
                title: 'Expert Planning',
                desc: 'Personalized itineraries crafted by travel specialists with deep destination knowledge.',
                color: 'ocean'
              },
              {
                icon: Lucide.Shield,
                title: 'Secure Booking',
                desc: 'Bank-grade security for all transactions with comprehensive travel insurance options.',
                color: 'coral'
              },
              {
                icon: Lucide.HeartHandshake,
                title: '24/7 Support',
                desc: 'Round-the-clock assistance from our dedicated travel concierge team.',
                color: 'sand'
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-white dark:bg-slate-900 border border-sand-200 dark:border-slate-800 rounded-3xl p-8 shadow-card hover:shadow-card-hover transition-all duration-400 hover:-translate-y-1"
              >
                <div className="space-y-6">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${feature.color === 'ocean' ? 'bg-ocean-100 text-ocean-600' :
                    feature.color === 'coral' ? 'bg-coral-100 text-coral-600' :
                      'bg-sand-200 text-sand-500'
                    } group-hover:scale-110 transition-transform duration-400`}>
                    <feature.icon size={28} strokeWidth={2} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- REASONS SECTION --- */}
      <section className="py-32 px-6 overflow-hidden">
        <div className="container mx-auto max-w-[1600px] grid lg:grid-cols-[1fr_auto] items-center gap-20">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-sm font-black uppercase tracking-[0.4em] text-sky-600">Why Dnarai Enterprise?</h2>
              <p className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white tracking-tighter italic uppercase leading-none font-display">
                ENGINEERED FOR <br />
                TRUST & SPEED.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-10">
              {[
                { title: 'Zero-Latency Sync', desc: 'Direct protocol handlers ensure airline data reaches passengers with no operational delay.', icon: Lucide.Zap },
                { title: 'Military Grade', desc: 'Travel identities are secured behind enterprise-grade encryption and masked for maximum privacy.', icon: Lucide.Lock },
                { title: 'Automated Alerting', desc: 'System-wide intelligence monitors flight windows and document expiry cycles automatically.', icon: Lucide.BellRing },
                { title: 'Global Backbone', desc: 'Integrated with major aviation data nodes to provide consistent coverage across all continents.', icon: Lucide.Network },
              ].map(reason => (
                <div key={reason.title} className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sky-600">
                    <reason.icon size={22} />
                  </div>
                  <h4 className="text-xl font-black uppercase italic dark:text-white font-display">{reason.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{reason.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="h-[500px] w-full lg:w-[400px] rounded-[3rem] bg-slate-900 overflow-hidden relative shadow-2xl group border-4 border-white dark:border-slate-800">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900 z-10" />
              <img
                src="https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=2070&auto=format&fit=crop"
                className="h-full w-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                alt="Flight Deck"
              />
              <div className="absolute bottom-0 left-0 p-10 z-20 space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-sky-400">Live Infrastructure</div>
                <div className="text-2xl font-black text-white italic uppercase leading-tight font-display">Monitoring <br /> Global Fleet</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="py-32 bg-white dark:bg-slate-950 px-6">
        <div className="container mx-auto max-w-4xl space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-sky-600 italic">Frequency</h2>
            <p className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight italic uppercase font-display">Common Intelligence</p>
          </div>

          <div className="grid gap-6">
            {[
              { q: "How does Dnarai sync with airline data?", a: "Our agency team synchronizes external booking details via direct airline portal entry and system-based web-sync protocols." },
              { q: "Is my travel data secure from third-parties?", a: "Absolutely. Dnarai Enterprise uses bank-grade document masking. Even administrators see only truncated identity references." },
              { q: "Can passengers edit their flight windows?", a: "No. To maintain operational integrity, flight windows are managed exclusively by Dnarai Enterprise agency staff." },
            ].map((faq, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 space-y-3 cursor-pointer hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100 dark:border-slate-800/50 premium-shadow">
                <h4 className="text-lg font-black uppercase text-slate-950 dark:text-white italic font-display">{faq.q}</h4>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="container mx-auto max-w-[1400px] px-6 mb-32">
        <div className="bg-gradient-to-br from-dnarai-navy-600 via-dnarai-navy-700 to-dnarai-navy-800 rounded-4xl p-16 lg:p-24 text-center text-white relative overflow-hidden shadow-premium">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2670')] bg-cover bg-center opacity-10 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-dnarai-navy-900/80 to-transparent" />

          {/* Decorative elements */}
          <div className="absolute top-10 right-10 w-40 h-40 bg-dnarai-gold-400/20 blur-[80px] rounded-full" />
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-dnarai-gold-100/10 blur-[60px] rounded-full" />

          <div className="relative z-10 flex flex-col items-center space-y-8 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight font-display">
              Start Your Next <br />
              <span className="text-sand-100">Adventure Today</span>
            </h2>
            <p className="max-w-2xl text-lg md:text-xl font-medium text-white/90 leading-relaxed">
              Join thousands of travelers who trust us to make their journeys extraordinary. Your perfect trip is just a click away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/dashboard"
                className="group inline-flex items-center justify-center gap-3 bg-white text-ocean-700 px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-wide shadow-card-hover transition-all duration-300 hover:shadow-[0_12px_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-100"
              >
                <span>{isAuthenticated ? 'Enter Dashboard' : 'Get Started'}</span>
                <Lucide.ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/40 bg-white/10 backdrop-blur-xl text-white px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-wide shadow-soft transition-all duration-300 hover:bg-red-500/20 hover:border-red-500/60 active:scale-95"
                >
                  <Lucide.LogOut size={18} />
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/40 bg-white/10 backdrop-blur-xl text-white px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-wide shadow-soft transition-all duration-300 hover:bg-white/20 hover:border-white/60 active:scale-95"
                >
                  Learn More
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-white pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-[1400px]">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 border-b border-white/10 pb-16">
            <div className="space-y-6 col-span-1 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14">
                  <img
                    src="/D-NARAI_Logo 01.svg"
                    alt="Dnarai Enterprise"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="text-xl font-black tracking-tight font-display">{brandName}</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                {content.motto}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 col-span-1 lg:col-span-2">
              <div className="space-y-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-ocean-400">Explore</h5>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">Destinations</li>
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">Travel Packages</li>
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">Special Offers</li>
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">Travel Guides</li>
                </ul>
              </div>
              <div className="space-y-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-ocean-400">Support</h5>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">Help Center</li>
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">Contact Us</li>
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">FAQs</li>
                  <li className="hover:text-white cursor-pointer transition-colors duration-300">Privacy Policy</li>
                </ul>
              </div>
            </div>

            <div className="space-y-5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-ocean-400">Connect</h5>
              <div className="flex gap-3">
                {['Facebook', 'Instagram', 'Twitter'].map(social => (
                  <div key={social} className="h-10 w-10 rounded-xl bg-white/5 hover:bg-ocean-600 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110">
                    <Lucide.Globe size={18} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
            <div>© 2026 {brandName}. All rights reserved.</div>
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer transition-colors duration-300">Terms</span>
              <span className="hover:text-white cursor-pointer transition-colors duration-300">Privacy</span>
              <span className="hover:text-white cursor-pointer transition-colors duration-300">Cookies</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
