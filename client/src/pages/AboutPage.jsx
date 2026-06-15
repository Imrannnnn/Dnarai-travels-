import { Helmet } from 'react-helmet-async'
import content from '../content/siteContent.json'

export default function AboutPage() {
  const { brandName, motto, about } = content

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1600px] space-y-10 pb-20">
      <Helmet>
        <title>About Us | D.Narai Travels</title>
        <meta name="description" content="Learn more about D.Narai Travels, the premier travel agency in Nigeria for flight bookings, hotels, and custom travel packages." />
        <link rel="canonical" href="https://dnaraitravels.com/about" />
        <meta property="og:title" content="About Us | D.Narai Travels" />
        <meta property="og:description" content="Learn more about D.Narai Travels, the premier travel agency in Nigeria for flight bookings, hotels, and custom travel packages." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dnaraitravels.com/about" />
        <meta property="og:image" content="https://dnaraitravels.com/D-NARAI_Logo%2001.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Us | D.Narai Travels" />
        <meta name="twitter:description" content="Learn more about D.Narai Travels, the premier travel agency in Nigeria for flight bookings, hotels, and custom travel packages." />
        <meta name="twitter:image" content="https://dnaraitravels.com/D-NARAI_Logo%2001.svg" />
      </Helmet>
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 premium-shadow">
        <div className="space-y-4">
          <div className="text-sm font-bold text-sky-700 dark:text-sky-300 font-display text-[11px] uppercase tracking-widest">{brandName}</div>
          <h1 className="text-4xl font-semibold tracking-tight text-navy-900 dark:text-slate-100 font-display">{about.title}</h1>
          <p className="max-w-3xl text-slate-600 dark:text-slate-300 text-lg">{about.subtitle}</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 italic">{motto}</p>
        </div>
      </section>

      <section className="grid gap-6">
        {about.sections.map((section) => (
          <div
            key={section.heading}
            className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 premium-shadow"
          >
            <h2 className="text-lg font-bold text-navy-900 dark:text-slate-100 font-display uppercase tracking-tight">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
