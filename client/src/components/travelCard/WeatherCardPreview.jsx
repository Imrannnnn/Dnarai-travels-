import { forwardRef, useMemo } from 'react'
import * as Lucide from 'lucide-react'
import { DNaraiLogoVector } from './TravelCardPreview'
import { parseClothingAdviceList } from '../../utils/weatherCardService'

/**
 * WeatherCardPreview
 * Premium Corporate Travel Editorial Advisory Graphic
 *
 * Color Palette:
 * - Deep Navy Blue: #06466B
 * - Warm Amber Orange: #F5A000
 * - Soft Ivory: #FAF8F4
 * - Cool Mist Blue: #EAF1F5
 * - Slate Gray: #596775
 * - Pure White: #FFFFFF
 */
const WeatherCardPreview = forwardRef(function WeatherCardPreview(
  {
    passengerName = '',
    iata = 'IAH',
    city = 'Houston',
    airportName = 'GEO BUSH',
    state = 'TX',
    travelDate = '2026-10-15',
    dateFormatted = 'October 15, 2026',
    weatherSummary = '',
    clothingAdvice = '',
    metrics = null,
  },
  ref
) {
  const displayPassenger = String(passengerName || 'Valued Traveler').trim().toUpperCase()
  const displayIata = String(iata || 'IAH').trim().toUpperCase()
  const displayCity = typeof city === 'string' ? city : (city ? String(city) : 'Destination City')
  const displayAirport = typeof airportName === 'string' ? airportName : (airportName ? String(airportName) : '')
  const displayState = typeof state === 'string' ? state : (state ? String(state) : '')

  // Build clean location string: e.g. "Houston, GEO BUSH, TX"
  const locationLine = [displayCity, displayAirport, displayState].filter(Boolean).join(', ') || 'Destination Airport'

  // Default summary matching prompt specifications
  const defaultSummary =
    `Hot and highly humid (Highs in the lower 90s°F/32°C–33°C, heat index up to 105°F) with mostly sunny skies turning to a 50% chance of afternoon thunderstorms and breezy conditions (gusts up to 25 mph). Overnight lows will cool down to 61°F–75°F.`
  const rawSummary = typeof weatherSummary === 'string'
    ? weatherSummary
    : (weatherSummary?.summary || weatherSummary?.text || weatherSummary?.description || defaultSummary)
  const summaryText = String(rawSummary || defaultSummary).trim()

  const defaultAdvice =
    `Wear loose, lightweight, breathable fabrics for the daytime heat, carry a packable rain layer for afternoon storms, and keep a light jacket for chilly indoor AC and cooler evening lows.`
  const rawAdvice = typeof clothingAdvice === 'string'
    ? clothingAdvice
    : (clothingAdvice?.advice || clothingAdvice?.text || defaultAdvice)
  const adviceText = String(rawAdvice || defaultAdvice).trim()

  const adviceList = useMemo(() => parseClothingAdviceList(adviceText), [adviceText])
  const rawDate = dateFormatted || travelDate || 'Travel Date'
  const displayDate = typeof rawDate === 'string' ? rawDate : String(rawDate)

  return (
    <div
      ref={ref}
      id="dnarai-weather-card-export-target"
      className="relative text-slate-900 rounded-[24px] overflow-hidden select-none mx-auto border border-slate-200/90 shadow-xl"
      style={{
        width: '540px',
        minWidth: '540px',
        maxWidth: '540px',
        backgroundColor: '#FAF8F4',
        background: 'linear-gradient(180deg, #FAF8F4 0%, #F5F8FA 45%, #EAF1F5 100%)',
        boxSizing: 'border-box',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ======================================================== */}
      {/* 1. BIG D.NARAI ENTERPRISE LOGO WATERMARK IN BACKGROUND   */}
      {/* ======================================================== */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0"
        aria-hidden="true"
      >
        <DNaraiLogoVector
          className="w-[430px] h-auto select-none"
          style={{
            opacity: 0.055,
            transform: 'rotate(-10deg) scale(1.15)',
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. MINIMAL TRAVEL-INSPIRED BACKGROUND (Flight Curves & Jet)*/}
      {/* ======================================================== */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 540 760"
        fill="none"
        preserveAspectRatio="none"
        style={{ opacity: 0.8 }}
      >
        {/* Soft Faint Global Flight Curves (Navy: #06466B at 5% opacity) */}
        <path
          d="M -20 180 C 140 120, 360 260, 560 140"
          stroke="#06466B"
          strokeWidth="1.5"
          strokeOpacity="0.06"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d="M -10 240 C 180 180, 340 380, 550 290"
          stroke="#06466B"
          strokeWidth="1.2"
          strokeOpacity="0.05"
          fill="none"
        />

        {/* Faint Amber Route Arc */}
        <path
          d="M 50 620 C 190 560, 380 670, 520 600"
          stroke="#F5A000"
          strokeWidth="1"
          strokeOpacity="0.12"
          strokeDasharray="5 5"
          fill="none"
        />

        {/* Subtle Airplane Silhouette along the route (Bottom-Right, low opacity) */}
        <g transform="translate(470, 590) rotate(-22)" opacity="0.12">
          <path
            d="M 12 2 L 15 11 L 28 15 L 28 18 L 15 18 L 14 26 L 19 29 L 19 31 L 12 30 L 5 31 L 5 29 L 10 26 L 9 18 L -4 18 L -4 15 L 9 11 Z"
            fill="#06466B"
          />
        </g>
      </svg>

      {/* Main Content Container with Comfortable Padding */}
      <div
        className="relative z-10 p-6 flex flex-col items-center"
        style={{ width: '100%', boxSizing: 'border-box' }}
      >
        {/* ======================================================== */}
        {/* 2. BRAND HEADER: LOGO WITH SUFFICIENT BREATHING ROOM      */}
        {/* ======================================================== */}
        <div
          className="w-full flex items-center justify-between pb-4 mb-4 border-b border-[#06466B]/10"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          {/* Official D.Narai Enterprise Logo (Preserved Proportions) */}
          <div className="flex items-center">
            <DNaraiLogoVector className="h-10 w-auto" />
          </div>

          {/* Official Advisory Label */}
          <div className="text-right">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider uppercase"
              style={{
                backgroundColor: '#EAF1F5',
                color: '#06466B',
                border: '1px solid rgba(6, 70, 107, 0.15)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5A000] inline-block" />
              <span>Travel Advisory Desk</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. RECIPIENT / PASSENGER REFINED NAVY BANNER             */}
        {/* ======================================================== */}
        <div
          className="w-full rounded-xl px-4 py-2.5 mb-4 shadow-sm flex items-center justify-between"
          style={{
            backgroundColor: '#06466B',
            boxSizing: 'border-box',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
              <Lucide.UserCheck size={13} />
            </div>
            <div className="min-w-0">
              <span className="text-[9.5px] font-bold uppercase tracking-widest text-[#FAF8F4]/70 block leading-tight">
                Passenger
              </span>
              <span className="text-xs font-black text-white uppercase tracking-wide truncate block leading-tight mt-0.5">
                {displayPassenger}
              </span>
            </div>
          </div>

          <div
            className="text-[10px] font-bold text-amber-300 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-md shrink-0 border border-white/10"
          >
            Confirmed Traveler
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. WEATHER TRAVEL TIP HEADING SECTION                    */}
        {/* ======================================================== */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: '#EAF1F5',
                border: '1px solid rgba(6, 70, 107, 0.12)',
                color: '#596775',
              }}
            >
              <Lucide.CloudSun size={20} className="text-[#06466B]" />
            </div>
            <div>
              <h1
                className="text-base font-black tracking-tight uppercase font-display"
                style={{ color: '#06466B', letterSpacing: '0.04em', lineHeight: '18px' }}
              >
                Weather Travel Tip
              </h1>
              <p className="text-[10.5px] font-medium text-[#596775] mt-0.5" style={{ lineHeight: '14px' }}>
                Climate Guidance & Preparation for Your Journey
              </p>
            </div>
          </div>

          {/* Travel Date Badge with Amber Accent */}
          <div
            className="text-right px-3 py-1.5 rounded-xl border"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(245, 160, 0, 0.35)',
              boxShadow: '0 2px 8px -2px rgba(245, 160, 0, 0.15)',
            }}
          >
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#596775] block leading-tight">
              Main Travel Date
            </span>
            <span
              className="text-xs font-black tracking-wide block leading-tight mt-0.5"
              style={{ color: '#F5A000' }}
            >
              {displayDate}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. CENTRAL DESTINATION & WEATHER CARD                    */}
        {/* ======================================================== */}
        <div
          className="w-full rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(6, 70, 107, 0.10)',
            boxShadow: '0 8px 30px -4px rgba(6, 70, 107, 0.06)',
            boxSizing: 'border-box',
          }}
        >
          {/* Subtle Watermark in Central Destination Card */}
          <div
            className="absolute -right-6 -bottom-6 pointer-events-none select-none z-0"
            style={{ opacity: 0.035 }}
            aria-hidden="true"
          >
            <DNaraiLogoVector className="w-[300px] h-auto" />
          </div>

          <div className="relative z-10">
            {/* Top of Card: Destination Code + Destination Name */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5 mb-3.5">
              <div>
                {/* Destination Code (Large bold navy typography: CAN, IAH, etc.) */}
                <div
                  className="font-black text-[#06466B] tracking-wider flex items-center gap-2"
                  style={{
                    fontSize: '34px',
                    lineHeight: '36px',
                    letterSpacing: '0.10em',
                  }}
                >
                  {displayIata.split('').join(' ')}
                </div>
                {/* Destination Name immediately below code */}
                <div
                  className="text-sm font-bold text-[#596775] mt-1 flex items-center gap-1.5"
                  style={{ lineHeight: '18px' }}
                >
                  <Lucide.MapPin size={13} style={{ color: '#F5A000' }} className="shrink-0" />
                  <span>{locationLine}</span>
                </div>
              </div>

              {/* Weather Metrics Pill (if metrics available) */}
              {metrics ? (
                <div className="text-right flex flex-col items-end">
                  <div
                    className="px-3 py-1 rounded-xl flex items-center gap-1.5"
                    style={{
                      backgroundColor: '#EAF1F5',
                      border: '1px solid rgba(6, 70, 107, 0.12)',
                    }}
                  >
                    <Lucide.ThermometerSun size={14} style={{ color: '#F5A000' }} />
                    <span className="text-xs font-black text-[#06466B]">
                      {metrics.highTempF}°F / {metrics.highTempC}°C
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#596775] mt-1 block">
                    {metrics.conditionShort} • Low {metrics.lowTempF}°F
                  </span>
                </div>
              ) : (
                <div
                  className="px-3 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: '#EAF1F5',
                    color: '#06466B',
                  }}
                >
                  Forecast
                </div>
              )}
            </div>

            {/* Weather Summary Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#F5A000' }}
                />
                <h2
                  className="text-xs font-bold uppercase tracking-wider text-[#06466B]"
                  style={{ lineHeight: '16px' }}
                >
                  Weather Summary for{' '}
                  <span style={{ color: '#F5A000', fontWeight: 800 }}>{displayDate}</span> :
                </h2>
              </div>
              <p
                className="text-xs text-[#596775] font-normal leading-relaxed text-justify"
                style={{
                  lineHeight: '20px',
                  letterSpacing: '0.005em',
                }}
              >
                {summaryText}
              </p>
            </div>

            {/* ======================================================== */}
            {/* 6. WEATHER-ALIGNED CLOTHING ADVICE: ORGANIZED LIST       */}
            {/* ======================================================== */}
            <div
              className="rounded-xl p-3.5"
              style={{
                backgroundColor: '#FAF8F4',
                border: '1px solid rgba(245, 160, 0, 0.25)',
                boxSizing: 'border-box',
              }}
            >
              {/* Advice Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Lucide.Shirt size={14} style={{ color: '#F5A000' }} className="shrink-0" />
                  <h3
                    className="text-xs font-black uppercase tracking-wider text-[#06466B]"
                    style={{ lineHeight: '16px' }}
                  >
                    Weather-aligned clothing advice:
                  </h3>
                </div>
                <span className="text-[9.5px] font-bold text-[#596775]/70 uppercase tracking-wider">
                  Advisory List
                </span>
              </div>

              {/* Structured Presentation List */}
              <div className="flex flex-col gap-2">
                {adviceList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-left"
                    style={{ boxSizing: 'border-box' }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: item.iconBg || '#FFF8EB',
                        color: item.iconColor || '#F5A000',
                        border: '1px solid rgba(6, 70, 107, 0.08)',
                      }}
                    >
                      {item.icon === 'sun' && <Lucide.Sun size={13} style={{ color: item.iconColor }} />}
                      {item.icon === 'moon' && <Lucide.Moon size={13} style={{ color: item.iconColor }} />}
                      {item.icon === 'shield' && <Lucide.ShieldCheck size={13} style={{ color: item.iconColor }} />}
                      {item.icon === 'check' && <Lucide.CheckCircle2 size={13} style={{ color: item.iconColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md leading-tight"
                          style={{
                            backgroundColor: item.badgeBg || '#EAF1F5',
                            color: item.badgeColor || '#06466B',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {item.title}
                        </span>
                      </div>
                      <p
                        className="text-[11.5px] text-[#596775] font-medium mt-1 leading-relaxed"
                        style={{ lineHeight: '17px' }}
                      >
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 7. REFINED BRAND SIGNATURE STATEMENT                     */}
        {/* ======================================================== */}
        <div
          className="w-full text-center py-2 px-3 mb-3.5 flex items-center justify-center gap-2"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          <Lucide.CheckCircle2 size={13} style={{ color: '#F5A000' }} className="shrink-0" />
          <span
            className="text-xs font-semibold italic text-[#06466B]"
            style={{ lineHeight: '16px' }}
          >
            “Our services end when you{' '}
            <span style={{ color: '#F5A000', fontWeight: 800 }}>successfully</span> arrive at your destination.”
          </span>
        </div>

        {/* ======================================================== */}
        {/* 8. FOOTER AND CONTACT INFORMATION (Pill-shaped Surface)   */}
        {/* ======================================================== */}
        <div
          className="w-full py-2.5 px-4 rounded-full flex items-center justify-between shadow-xs"
          style={{
            width: '100%',
            backgroundColor: '#EAF1F5',
            border: '1px solid rgba(6, 70, 107, 0.12)',
            boxSizing: 'border-box',
          }}
        >
          {/* Website with Globe Icon */}
          <div className="flex items-center gap-1.5">
            <Lucide.Globe size={13} className="text-[#06466B]" />
            <span
              className="text-[11px] font-bold tracking-wide text-[#06466B]"
              style={{ lineHeight: '14px' }}
            >
              www.dnaraitravels.com
            </span>
          </div>

          {/* Subtle Orange Divider */}
          <div
            className="h-3 w-[1px]"
            style={{ backgroundColor: 'rgba(245, 160, 0, 0.4)' }}
          />

          {/* Telephone with Phone Icon */}
          <div className="flex items-center gap-1.5">
            <Lucide.PhoneCall size={13} style={{ color: '#F5A000' }} />
            <span
              className="text-[11px] font-black tracking-wider text-[#06466B]"
              style={{ lineHeight: '14px' }}
            >
              08166698589
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default WeatherCardPreview
