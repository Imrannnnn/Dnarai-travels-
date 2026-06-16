import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import content from '../content/siteContent.json'
import * as Lucide from 'lucide-react'
import { useAuth } from '../data/AuthContext'

const destinations = [
  {
    city: 'Dubai',
    country: 'United Arab Emirates',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200',
    description: 'A city of futuristic skyscrapers, luxury shopping, and vibrant nightlife.',
    sights: ['Burj Khalifa', 'Dubai Mall', 'Palm Jumeirah']
  },
  {
    city: 'London',
    country: 'United Kingdom',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200',
    description: 'A historic city blending cultural heritage with modern art and commerce.',
    sights: ['Big Ben', 'London Eye', 'British Museum']
  },
  {
    city: 'Canada',
    country: 'North America',
    image: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?q=80&w=1200',
    description: 'Renowned for its breathtaking wilderness, rocky mountains, and friendly cities.',
    sights: ['Banff National Park', 'Niagara Falls', 'CN Tower']
  },
  {
    city: 'United States',
    country: 'North America',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200',
    description: 'A massive country offering iconic skylines, national parks, and diverse cultures.',
    sights: ['Grand Canyon', 'Times Square', 'Golden Gate Bridge']
  },
  {
    city: 'Turkey',
    country: 'Europe/Asia',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200',
    description: 'A historic crossroads of empires with stunning architecture and hot air balloons.',
    sights: ['Hagia Sophia', 'Cappadocia', 'Pamukkale']
  },
  {
    city: 'South Africa',
    country: 'Africa',
    image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?q=80&w=1200',
    description: 'A land of diverse ecosystems, safaris, and Cape Town\'s iconic Table Mountain.',
    sights: ['Kruger National Park', 'Table Mountain', 'Robben Island']
  }
];

const packages = [
  {
    title: 'Dubai Holiday Package',
    image: 'https://images.unsplash.com/photo-1528702748617-c64d49f918af?q=80&w=800',
    tag: 'Trending',
    duration: '5 Days, 4 Nights',
    highlights: 'Desert Safari, Burj Khalifa Tour, Marina Cruise dinner.',
    price: 'Contact for Pricing'
  },
  {
    title: 'London Vacation Package',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800',
    tag: 'Premium',
    duration: '7 Days, 6 Nights',
    highlights: 'Royal Palace Tours, Thames River Pass, Oxford Street shopping.',
    price: 'Contact for Pricing'
  },
  {
    title: 'Hajj & Umrah Package',
    image: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=800',
    tag: 'Spiritual',
    duration: '14 Days, 13 Nights',
    highlights: 'Luxury hotel stay in Makkah and Madinah, guided Ziyarat, visa handling.',
    price: 'Special Rates'
  },
  {
    title: 'Family Vacation Package',
    image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=800',
    tag: 'Family Favorite',
    duration: '6 Days, 5 Nights',
    highlights: 'Theme park passes, family suite accommodations, kids activities included.',
    price: 'Custom Packages'
  },
  {
    title: 'Honeymoon Package',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800',
    tag: 'Romantic',
    duration: '5 Days, 4 Nights',
    highlights: 'Private beach dinner, spa treatments, romantic cruise dinner.',
    price: 'Best Deals'
  }
];


export default function HomePage() {
  const { brandName, home } = content
  const { isAuthenticated, logout } = useAuth()

  const [activeDest, setActiveDest] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDest((prev) => (prev + 1) % destinations.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-6 md:pb-0">
      <Helmet>
        <title>D.Narai Travels | Flight Booking, Visa Assistance & Travel Agency in Nigeria</title>
        <meta name="description" content="D.Narai Travels provides affordable flight bookings, travel consultation, visa guidance, and personalized travel solutions for local and international travelers in Nigeria." />
        <link rel="canonical" href="https://dnaraitravels.com/" />
        <meta property="og:title" content="D.Narai Travels | Flight Booking, Visa Assistance & Travel Agency in Nigeria" />
        <meta property="og:description" content="D.Narai Travels provides affordable flight bookings, travel consultation, visa guidance, and personalized travel solutions for local and international travelers in Nigeria." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dnaraitravels.com/" />
        <meta property="og:image" content="https://dnaraitravels.com/D-NARAI_Logo%2001.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="D.Narai Travels | Flight Booking, Visa Assistance & Travel Agency in Nigeria" />
        <meta name="twitter:description" content="D.Narai Travels provides affordable flight bookings, travel consultation, visa guidance, and personalized travel solutions for local and international travelers in Nigeria." />
        <meta name="twitter:image" content="https://dnaraitravels.com/D-NARAI_Logo%2001.svg" />
      </Helmet>
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden px-6 py-16 md:py-24">
        {/* Background with overlay gradient */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-dnarai-navy-700 via-dnarai-navy-600 to-dnarai-navy-800" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1530521954074-e64f6810b32d?q=80&w=2500')] bg-cover bg-center opacity-40 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-dnarai-navy-900/90 via-dnarai-navy-800/50 to-transparent" />
          {/* Animated accent orbs */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-dnarai-gold-400/20 blur-[100px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-dnarai-gold-200/10 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto max-w-[900px] relative z-10 text-center space-y-10">
          <div className="space-y-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-6 py-3 text-xs font-bold uppercase tracking-wider text-white/90 shadow-soft">
              <span className="flex h-2.5 w-2.5 rounded-full bg-coral-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
              Premium Travel Management
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[0.95] font-display">
              {home.hero.title}
            </h1>

            <p className="max-w-2xl text-lg md:text-xl font-medium text-white/80 leading-relaxed">
              {home.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 justify-center">
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
        </div>
      </section>



      {/* --- VISION & MISSION --- */}
      <section className="py-12 md:py-16 bg-white dark:bg-slate-950 relative overflow-hidden px-6 border-b border-sand-100 dark:border-slate-800">
        {/* Background glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-dnarai-gold-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ocean-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto max-w-[1400px] relative z-10">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Vision Card */}
            <div className="relative group bg-slate-50 dark:bg-slate-900 border border-sand-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col justify-between hover:border-dnarai-gold-400 dark:hover:border-dnarai-gold-500/50 hover:shadow-xl transition-all duration-300">
              <div className="space-y-6">
                <div className="h-12 w-12 rounded-2xl bg-dnarai-gold-500/10 text-dnarai-gold-600 dark:text-dnarai-gold-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Lucide.Eye size={24} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-dnarai-gold-600 dark:text-dnarai-gold-400">Our Vision</h3>
                  <p className="text-2xl md:text-3xl font-black font-display leading-snug text-slate-900 dark:text-white">
                    That all our clients have a satisfactory experience throughout their Journey.
                  </p>
                </div>
              </div>
            </div>

            {/* Mission Card */}
            <div className="relative group bg-slate-50 dark:bg-slate-900 border border-sand-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col justify-between hover:border-ocean-400 dark:hover:border-ocean-500/50 hover:shadow-xl transition-all duration-300">
              <div className="space-y-6">
                <div className="h-12 w-12 rounded-2xl bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Lucide.Compass size={24} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-ocean-600 dark:text-ocean-400">Our Mission</h3>
                  <p className="text-2xl md:text-3xl font-black font-display leading-snug text-slate-900 dark:text-white">
                    To bridge all Air travel gaps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="bg-sand-50 py-12 md:py-16 border-y border-sand-200 dark:bg-slate-950 dark:border-slate-800 relative z-20">
        <div className="container mx-auto max-w-[1400px] px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            {[
              { label: 'Years of experience', value: '10+' },
              { label: 'Happy Travelers', value: '5k' },
              { label: 'Travel Partners', value: '50+' },
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
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-[1400px] space-y-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-ocean-600">Why Choose Us</h2>
            <p className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-display">
              We set the<br />
              <span className="text-ocean-600">&ldquo;PACE&rdquo;  others follow...</span>
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Lucide.Target,
                title: 'Precision',
                desc: 'Attention to every travel detail. Accuracy is our hallmark.',
                colorClass: 'bg-ocean-100 text-ocean-600 dark:bg-ocean-500/10 dark:text-ocean-400'
              },
              {
                icon: Lucide.ShieldCheck,
                title: 'Accuracy',
                desc: 'Reliable and Trustworthy; we keep to our words.',
                colorClass: 'bg-coral-500/10 text-coral-600 dark:bg-coral-500/20 dark:text-coral-400'
              },
              {
                icon: Lucide.UserCheck,
                title: 'Client - Centric',
                desc: "Tailored services to meet customer's needs. Customer's need is top.",
                colorClass: 'bg-sand-100 text-sand-600 dark:bg-sand-500/10 dark:text-sand-400'
              },
              {
                icon: Lucide.Award,
                title: 'Excellence',
                desc: 'Always striving for the highest quality service and performance.',
                colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-white dark:bg-slate-900 border border-sand-200 dark:border-slate-800 rounded-3xl p-8 shadow-card hover:shadow-card-hover transition-all duration-400 hover:-translate-y-1"
              >
                <div className="space-y-6">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${feature.colorClass} group-hover:scale-110 transition-transform duration-400`}>
                    <feature.icon size={28} strokeWidth={2} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- POPULAR DESTINATIONS --- */}
      <section className="py-12 md:py-16 bg-white dark:bg-slate-950 px-6 border-b border-sand-100 dark:border-slate-800">
        <div className="container mx-auto max-w-[1400px] space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-ocean-600">Explore the World</h2>
            <p className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-display">
              Popular <span className="text-ocean-600">Destinations</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium">
              Stunning destinations handpicked for your next local or international adventure.
            </p>
          </div>

          <div className="max-w-[1400px] mx-auto w-full">
            {/* Showcase Image & Sights */}
            <div className="relative aspect-[3/4] sm:aspect-[16/9] md:aspect-[21/9] w-full rounded-[2rem] overflow-hidden bg-slate-900 shadow-xl border border-slate-200/50 dark:border-slate-800/50">
              {destinations.map((dest, idx) => (
                <div
                  key={dest.city + '-slide'}
                  className={`absolute inset-0 transition-opacity duration-1000 flex flex-col justify-end ${
                    activeDest === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={dest.image}
                    alt={dest.city}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[5000ms] ease-out scale-105"
                    style={{
                      transform: activeDest === idx ? 'scale(1)' : 'scale(1.05)'
                    }}
                  />
                  {/* Visual gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  <div className="relative z-10 p-6 sm:p-10 md:p-12 space-y-6 text-white text-left">
                    <div className="space-y-3">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-ocean-400">{dest.country}</span>
                      <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-display leading-none">{dest.city}</h3>
                      <p className="text-xs sm:text-sm md:text-base text-slate-200 max-w-2xl font-medium leading-relaxed">{dest.description}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-white/10">
                      {/* Sights tags */}
                      <div className="flex flex-wrap gap-2">
                        {dest.sights.map((sight) => (
                          <span key={sight} className="px-3 py-1.5 rounded-full bg-white/10 text-white/95 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/5">
                            {sight}
                          </span>
                        ))}
                      </div>
                      
                      <Link
                        to="/dashboard"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-950 px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all duration-300 self-start sm:self-auto shadow-md"
                      >
                        <span>Inquire Flight</span>
                        <Lucide.Plane size={14} className="rotate-45" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- TIME CONVERTER TEASER --- */}
      <section className="py-12 md:py-16 px-6">
        <div className="container mx-auto max-w-[1400px]">
          <div className="relative overflow-hidden rounded-[3.5rem] bg-slate-900 p-8 md:p-20 shadow-2xl">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-ocean-600/20 to-transparent pointer-events-none" />
            <Lucide.Globe className="absolute -bottom-20 -right-20 h-96 w-96 text-ocean-500/10 animate-spin-slow pointer-events-none" />

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ocean-500/10 text-ocean-400 text-xs font-black uppercase tracking-widest border border-ocean-500/20">
                  <Lucide.Clock size={14} />
                  New Intelligence Feature
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white leading-tight font-display">
                  Global Time <br />
                  <span className="text-ocean-400">Intelligence.</span>
                </h2>
                <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-xl">
                  Never miss a flight or a meeting again. Our new real-time Global Time Converter helps you navigate world time zones with precision.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/time-converter"
                    className="inline-flex items-center gap-2 bg-ocean-600 hover:bg-ocean-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-ocean-600/20"
                  >
                    <span>Open Time Converter</span>
                    <Lucide.ArrowRight size={18} />
                  </Link>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="glass-card rounded-3xl p-8 border-white/10 bg-white/5 backdrop-blur-md space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-ocean-500 text-white flex items-center justify-center shadow-lg shadow-ocean-500/20">
                        <Lucide.Clock size={24} />
                      </div>
                      <div>
                        <p className="text-white font-black text-lg">London, UK</p>
                        <p className="text-ocean-400 text-xs font-bold uppercase tracking-tighter">Current Destination</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black text-3xl font-mono">10:45 <span className="text-sm font-sans uppercase">AM</span></p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">GMT +1</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-slate-400 text-sm font-bold">New York, USA</span>
                      <span className="text-white font-black font-mono">05:45 AM</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-slate-400 text-sm font-bold">Tokyo, Japan</span>
                      <span className="text-white font-black font-mono">06:45 PM</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Real-time synchronization active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TRAVEL PACKAGES SECTION --- */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/20 px-6 border-y border-sand-100 dark:border-slate-800 relative overflow-hidden">
        {/* Background decorative glow elements */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-ocean-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-dnarai-gold-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto max-w-[1400px] space-y-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-ocean-600">Special Offers</h2>
            <p className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-display">
              Featured <span className="text-ocean-600">Travel Packages</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium">
              Carefully curated travel experiences designed to give you maximum comfort and unforgettable memories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            {packages.map((pkg) => (
              <div
                key={pkg.title}
                className="group bg-white dark:bg-slate-900 border border-sand-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-400 hover:-translate-y-1.5 flex flex-col h-full"
              >
                {/* Image & Badge Container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                  <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-950 dark:text-white text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md">
                    {pkg.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 flex flex-col flex-grow justify-between space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-display leading-tight group-hover:text-ocean-600 transition-colors duration-300">
                      {pkg.title}
                    </h3>
                    
                    {/* Duration */}
                    <div className="flex items-center gap-2 text-xs font-bold text-ocean-600 dark:text-ocean-400 uppercase tracking-wider">
                      <Lucide.Calendar size={14} />
                      <span>{pkg.duration}</span>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-2 pt-2 border-t border-sand-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Highlights</span>
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        {pkg.highlights}
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-4 border-t border-sand-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Starting At</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-display">{pkg.price}</span>
                    </div>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white px-5 py-3 text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-ocean-600/10 active:scale-95"
                    >
                      <span>Inquire</span>
                      <Lucide.ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS SECTION --- */}
      <section className="py-16 md:py-24 px-6 overflow-hidden">
        <div className="container mx-auto max-w-[1600px] grid lg:grid-cols-[1fr_auto] items-center gap-20">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-sm font-black uppercase tracking-[0.4em] text-ocean-600">How It Works</h2>
              <p className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white tracking-tighter italic uppercase leading-none font-display">
                SEAMLESS TRAVEL <br />
                EXPERIENCE.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-10">
              {[
                { title: 'Create Your Profile', desc: 'Sign up to build your personalized traveler profile. We securely save your preferences, frequent flyer details, and travel documents.', icon: Lucide.UserPlus },
                { title: 'Book Affordable Flights', desc: 'Discover and book affordable flights and customized travel packages tailored to your schedule and budget.', icon: Lucide.PlaneTakeoff },
                { title: 'Automated Reminders', desc: 'Receive real-time flight status updates, visa guidance alerts, and boarding notifications sent directly to your device.', icon: Lucide.BellRing },
                { title: 'Destination Weather', desc: 'Stay prepared with live weather forecasts and travel advisories for your destination before you even pack your bags.', icon: Lucide.CloudSun },
              ].map(step => (
                <div key={step.title} className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-ocean-600">
                    <step.icon size={22} />
                  </div>
                  <h4 className="text-xl font-black uppercase italic dark:text-white font-display">{step.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="h-[500px] w-full lg:w-[400px] rounded-[3rem] bg-slate-900 overflow-hidden relative shadow-2xl group border-4 border-white dark:border-slate-800">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900 z-10" />
              <img
                src="/chicago.jpeg"
                className="h-full w-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                alt="Travel Agency Destination"
              />
              <div className="absolute bottom-0 left-0 p-10 z-20 space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-ocean-400">Your Journey Starts Here</div>
                <div className="text-1.98xl font-black text-white italic uppercase leading-tight font-display">Expert visa assistance and travel consultation for your peace of mind.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-950 px-6">
        <div className="container mx-auto max-w-4xl space-y-12">
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
      <section className="container mx-auto max-w-[1400px] px-6 mb-16 md:mb-24">
        <div className="bg-gradient-to-br from-dnarai-navy-600 via-dnarai-navy-700 to-dnarai-navy-800 rounded-3xl sm:rounded-4xl p-6 sm:p-16 lg:p-24 text-center text-white relative overflow-hidden shadow-premium">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1600')] bg-cover bg-center opacity-25 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-dnarai-navy-950/90 via-dnarai-navy-900/70 to-dnarai-navy-950/90" />

          {/* Decorative elements */}
          <div className="absolute top-10 right-10 w-40 h-40 bg-dnarai-gold-400/20 blur-[80px] rounded-full" />
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-dnarai-gold-100/10 blur-[60px] rounded-full" />

          <div className="relative z-10 flex flex-col items-center space-y-8 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight font-display">
              Start Your Next <br />
              <span className="text-sand-100">Adventure Today</span>
            </h2>
            <p className="max-w-2xl text-lg md:text-xl font-medium text-white/90 leading-relaxed">
              Trust us with your journey and get the satisfaction you deserve. Your satisfaction is just a click away
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
      <footer className="bg-slate-950 text-white pt-16 pb-8 px-6">
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

            <div className="space-y-5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-ocean-400">Support</h5>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="hover:text-white cursor-pointer transition-colors duration-300">Help Center</li>
                <li className="hover:text-white cursor-pointer transition-colors duration-300">Contact Us</li>
                <li className="hover:text-white cursor-pointer transition-colors duration-300">FAQs</li>
                <li className="hover:text-white cursor-pointer transition-colors duration-300">Privacy Policy</li>
              </ul>
            </div>

            <div className="space-y-5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-ocean-400">Contact</h5>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Lucide.Phone size={14} className="text-ocean-400 flex-shrink-0" />
                  <a href="tel:+2349131315886" className="hover:text-white transition-colors duration-300">+234 913 131 5886</a>
                </li>
                <li className="flex items-center gap-2">
                  <Lucide.Phone size={14} className="text-ocean-400 flex-shrink-0" />
                  <a href="tel:+2348166698589" className="hover:text-white transition-colors duration-300">+234 816 669 8589</a>
                </li>
              </ul>
            </div>

            <div className="space-y-5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-ocean-400">Connect</h5>
              <div className="flex gap-3">
                <a
                  href="https://web.facebook.com/D.NaraiEnterprise?_rdc=1&_rdr#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-xl bg-white/5 hover:bg-ocean-600 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                  aria-label="Facebook"
                >
                  <Lucide.Facebook size={18} />
                </a>
                <a
                  href="https://www.instagram.com/d.naraienterprise?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-xl bg-white/5 hover:bg-ocean-600 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                  aria-label="Instagram"
                >
                  <Lucide.Instagram size={18} />
                </a>
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
