import { forwardRef } from 'react'
import * as Lucide from 'lucide-react'
import { resolveStateName } from '../../utils/travelCardTime'

/**
 * Inlined D.Narai Enterprise Logo (SVG)
 * Direct vector paths guarantee 100% sharp rendering in html2canvas with zero CORS or network issues.
 */
export function DNaraiLogoVector({ className = 'h-10 w-auto' }) {
  return (
    <svg
      viewBox="0 0 271.54 120.19"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <style>{`
          .dn-navy { fill: #00456E; }
          .dn-grey { fill: #58595B; }
          .dn-gold { fill: #FBB040; }
        `}</style>
      </defs>

      {/* D.NARAI Brand Text (Navy) */}
      <g className="dn-navy">
        <path d="M103.15,82.48c-1.18-0.61-2.54-0.91-4.09-0.91h-6.11v14.5h6.11c1.55,0,2.91-0.3,4.09-0.91s2.1-1.46,2.75-2.55 c0.66-1.09,0.98-2.35,0.98-3.79c0-1.44-0.33-2.7-0.98-3.79C105.25,83.94,104.33,83.09,103.15,82.48z M104.09,91.66 c-0.48,0.82-1.16,1.46-2.04,1.92s-1.92,0.68-3.12,0.68h-3.91V83.37h3.91c1.2,0,2.24,0.23,3.12,0.68s1.56,1.09,2.04,1.91 c0.48,0.82,0.73,1.77,0.73,2.86C104.82,89.89,104.58,90.84,104.09,91.66z" />
        <path d="M109.83,93.35c-0.39,0-0.72,0.13-0.99,0.39c-0.28,0.26-0.41,0.6-0.41,1.01s0.14,0.76,0.41,1.03 c0.28,0.27,0.61,0.4,0.99,0.4c0.37,0,0.69-0.13,0.96-0.4c0.27-0.27,0.4-0.61,0.4-1.03s-0.13-0.75-0.4-1.01 C110.52,93.48,110.2,93.35,109.83,93.35z" />
        <polygon points="124.74,92.37 116.04,81.57 114.34,81.57 114.34,96.07 116.42,96.07 116.42,85.26 125.11,96.07 126.81,96.07 126.81,81.57 124.74,81.57" />
        <path d="M135.53,81.57l-6.57,14.5h2.13l1.59-3.62h7.71l1.59,3.62h2.18l-6.59-14.5H135.53z M133.42,90.78l3.13-7.11 l3.13,7.11H133.42z" />
        <path d="M155.23,91.05c0.9-0.4,1.59-0.98,2.07-1.73c0.48-0.75,0.73-1.65,0.73-2.7c0-1.05-0.24-1.95-0.73-2.71 c-0.48-0.76-1.17-1.34-2.07-1.74c-0.9-0.4-1.98-0.6-3.25-0.6h-5.65v14.5h2.07v-4.41h3.58c0.32,0,0.63-0.01,0.92-0.04l3.12,4.45 h2.26l-3.45-4.86C154.96,91.15,155.1,91.11,155.23,91.05z M151.92,89.89h-3.52v-6.52h3.52c1.33,0,2.33,0.28,3.01,0.85 s1.03,1.37,1.03,2.4c0,1.04-0.34,1.84-1.03,2.41S153.24,89.89,151.92,89.89z" />
        <path d="M165.75,81.57l-6.57,14.5h2.13l1.59-3.62h7.71l1.59,3.62h2.17l-6.59-14.5H165.75z M163.64,90.78l3.13-7.11 l3.13,7.11H163.64z" />
        <rect x="176.54" y="81.57" width="2.07" height="14.5" />
      </g>

      {/* ENTERPRISE Subtitle Text (Grey) */}
      <g className="dn-grey">
        <polygon points="182.67,93.68 185.53,93.68 185.53,93.21 182.67,93.21 182.67,91.39 185.87,91.39 185.87,90.92 182.09,90.92 182.09,96.05 185.99,96.05 185.99,95.58 182.67,95.58" />
        <polygon points="195.39,95.08 191.84,90.92 191.36,90.92 191.36,96.05 191.94,96.05 191.94,91.89 195.49,96.05 195.97,96.05 195.97,90.92 195.39,90.92" />
        <polygon points="200.9,91.39 202.84,91.39 202.84,96.05 203.42,96.05 203.42,91.39 205.36,91.39 205.36,90.92 200.9,90.92" />
        <polygon points="210.87,93.68 213.72,93.68 213.72,93.21 210.87,93.21 210.87,91.39 214.07,91.39 214.07,90.92 210.29,90.92 210.29,96.05 214.19,96.05 214.19,95.58 210.87,95.58" />
        <path d="M222.83,94.22c0.34-0.14,0.59-0.34,0.78-0.6c0.18-0.26,0.27-0.57,0.27-0.94c0-0.37-0.09-0.69-0.27-0.95 c-0.18-0.26-0.44-0.46-0.78-0.6c-0.34-0.14-0.74-0.21-1.2-0.21h-2.06v5.14h0.58v-1.63h1.48c0.16,0,0.29-0.02,0.44-0.03l1.27,1.66 h0.64l-1.36-1.77C222.68,94.26,222.76,94.24,222.83,94.22z M221.61,93.96h-1.46v-2.58h1.46c0.55,0,0.97,0.11,1.26,0.34 c0.29,0.22,0.43,0.54,0.43,0.95c0,0.41-0.14,0.72-0.43,0.95C222.58,93.85,222.16,93.96,221.61,93.96z" />
        <path d="M232.52,91.13c-0.34-0.14-0.74-0.21-1.2-0.21h-2.06v5.14h0.58v-1.62h1.48c0.47,0,0.87-0.07,1.2-0.21 c0.34-0.14,0.59-0.34,0.78-0.61c0.18-0.26,0.27-0.57,0.27-0.94c0-0.37-0.09-0.69-0.27-0.95C233.12,91.47,232.86,91.27,232.52,91.13 z M232.56,93.62c-0.29,0.22-0.71,0.33-1.26,0.33h-1.46v-2.57h1.46c0.55,0,0.97,0.11,1.26,0.34c0.29,0.22,0.43,0.54,0.43,0.95 C232.99,93.09,232.84,93.4,232.56,93.62z" />
        <rect x="238.83" y="90.92" width="0.58" height="5.14" />
        <path d="M248.11,93.64c-0.2-0.1-0.42-0.18-0.66-0.25c-0.24-0.06-0.48-0.12-0.72-0.18s-0.46-0.12-0.67-0.18 c-0.2-0.07-0.37-0.16-0.49-0.29c-0.12-0.12-0.18-0.28-0.18-0.48c0-0.18,0.05-0.33,0.15-0.47s0.26-0.25,0.48-0.33 c0.22-0.08,0.49-0.12,0.82-0.12c0.25,0,0.5,0.03,0.77,0.1c0.27,0.07,0.52,0.18,0.75,0.32l0.2-0.43c-0.22-0.14-0.48-0.25-0.79-0.33 c-0.3-0.08-0.61-0.12-0.92-0.12c-0.47,0-0.85,0.06-1.15,0.19c-0.3,0.13-0.52,0.3-0.67,0.51s-0.22,0.45-0.22,0.7 c0,0.27,0.06,0.5,0.19,0.66c0.12,0.17,0.29,0.3,0.49,0.41c0.2,0.1,0.42,0.18,0.67,0.25c0.24,0.06,0.48,0.12,0.72,0.17 c0.24,0.05,0.46,0.12,0.66,0.19c0.2,0.07,0.36,0.17,0.48,0.29c0.12,0.12,0.18,0.28,0.18,0.48c0,0.17-0.05,0.32-0.15,0.46 c-0.1,0.14-0.26,0.25-0.48,0.33c-0.22,0.08-0.5,0.12-0.85,0.12c-0.36,0-0.71-0.06-1.04-0.18s-0.59-0.27-0.78-0.44l-0.23,0.42 c0.21,0.2,0.5,0.36,0.87,0.48c0.38,0.12,0.77,0.19,1.18,0.19c0.47,0,0.86-0.06,1.16-0.19c0.3-0.13,0.53-0.3,0.67-0.51 c0.15-0.21,0.22-0.44,0.22-0.69c0-0.27-0.06-0.49-0.19-0.65C248.48,93.88,248.31,93.74,248.11,93.64z" />
        <polygon points="254.64,95.58 254.64,93.68 257.49,93.68 257.49,93.21 254.64,93.21 254.64,91.39 257.84,91.39 257.84,90.92 254.05,90.92 254.05,96.05 257.95,96.05 257.95,95.58" />
      </g>

      {/* Gold & Navy Compass Mark */}
      <g>
        <g className="dn-navy">
          <path d="M101.01,32.49c-2.36-2.82-4.96-5.42-7.78-7.78c-8.18-6.86-18.14-11.67-29.07-13.62 c-3.57-0.64-7.25-0.97-10.99-0.97v23.69c3.26,0,6.48,0.4,9.61,1.21l1.04-9.55c0.19-1.71,1.87-2.84,3.52-2.37 c5.69,1.63,10.98,4.22,15.69,7.58c0.82,0.59,1.63,1.2,2.41,1.83c2.86,2.31,5.47,4.92,7.78,7.78c0.63,0.78,1.24,1.59,1.83,2.41 c3.14,4.38,5.6,9.27,7.24,14.52c0.71,2.26-0.78,4.61-3.12,4.94l-11.33,1.6l-10.98,1.55l-14.49,2.04l-0.56,5.21h53.82 C115.6,57.32,110.11,43.34,101.01,32.49z" />
        </g>
        <g className="dn-gold">
          <path d="M65.26,50.96c0.02,0.01,0.04,0.02,0.05,0.03c0.3,0.16,0.58,0.33,0.87,0.53c0.01,0,0.03,0.01,0.04,0.02 c0.13,0.07,0.25,0.15,0.38,0.24c0.19,0.12,0.38,0.24,0.57,0.38c0.01,0,0.01,0.01,0.02,0.01c0.21,0.14,0.41,0.28,0.61,0.44 c0.27,0.19,0.54,0.4,0.8,0.61c0.36,0.28,0.72,0.58,1.06,0.89c0.35,0.31,0.68,0.62,1.01,0.95c0.33,0.33,0.64,0.66,0.95,1.01 c0.31,0.34,0.61,0.7,0.89,1.06c0.21,0.26,0.42,0.53,0.61,0.8c0.16,0.2,0.3,0.4,0.44,0.61c0,0.01,0.01,0.01,0.01,0.02 c0.19,0.27,0.37,0.55,0.55,0.83l7.91-7.91l9.05-9.05c-0.07-0.08-0.14-0.16-0.2-0.24c-2.18-2.7-4.64-5.16-7.34-7.34 c-0.08-0.07-0.16-0.13-0.25-0.19l-9.04,9.04c-0.02-0.02-0.03-0.03-0.05-0.03c-0.35-0.26-0.7-0.51-1.06-0.75 c-0.01-0.01-0.03-0.02-0.05-0.03c-0.33-0.23-0.68-0.45-1.02-0.67l-0.24-0.15c-0.33-0.2-0.66-0.4-0.99-0.58 c-0.09-0.06-0.19-0.11-0.28-0.16c-0.27-0.16-0.55-0.31-0.82-0.45c-0.02-0.01-0.05-0.02-0.07-0.03c-0.39-0.21-0.79-0.41-1.19-0.59 l-0.01-0.01c-0.2-0.1-0.4-0.19-0.61-0.29c-0.33-0.15-0.66-0.29-1-0.44c-0.01,0-0.02,0-0.03-0.01c-0.42-0.17-0.85-0.34-1.29-0.5 c-0.03-0.01-0.06-0.02-0.1-0.04c-0.39-0.14-0.79-0.28-1.19-0.41c-0.31-0.1-0.63-0.2-0.95-0.29c-0.28-0.08-0.57-0.16-0.85-0.23 v-0.01c-0.14-0.04-0.28-0.08-0.42-0.11c-0.39-0.11-0.78-0.2-1.18-0.28c-0.1-0.03-0.2-0.05-0.3-0.07c-0.25-0.05-0.51-0.1-0.77-0.15 c-0.35-0.07-0.7-0.13-1.05-0.18c-0.15-0.03-0.3-0.05-0.46-0.07c-0.15-0.02-0.31-0.04-0.46-0.06c-0.23-0.04-0.46-0.07-0.7-0.09 c-0.39-0.05-0.8-0.09-1.2-0.12c-0.47-0.03-0.94-0.06-1.42-0.07c-0.44-0.02-0.88-0.03-1.33-0.03v35.75h5.53l2.55-23.4 c1.01,0.34,1.98,0.75,2.92,1.23C64.53,50.57,64.9,50.76,65.26,50.96z" />
          <path d="M103.31,30.56c1.09,1.3,2.13,2.64,3.11,4.02l5.46-20.73l-20.74,5.46c1.38,0.98,2.73,2.02,4.03,3.11 C98.1,24.88,100.85,27.63,103.31,30.56z" />
        </g>
      </g>
    </svg>
  )
}

/**
 * TravelCardPreview
 * Dedicated Internal Staff Journey & Time-Zone Reference Card.
 * Redesigned with generous line-heights, ample horizontal space, and zero clipping/overlapping.
 */
const TravelCardPreview = forwardRef(function TravelCardPreview(
  {
    passengerName = '',
    greeting = 'STAFF ITINERARY REFERENCE',
    cardTitle = 'Journey & Time-Zone Overview',
    itineraryLegs = [],
    showTimes = true,
  },
  ref
) {
  const displayGreeting = (greeting || 'STAFF ITINERARY REFERENCE').toUpperCase()
  const displayPassengerName = (passengerName || '').trim().toUpperCase()
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div
      ref={ref}
      id="dnarai-travel-card-export-target"
      className="relative bg-white text-slate-900 rounded-[24px] shadow-xl overflow-hidden select-none mx-auto border border-slate-200"
      style={{
        width: '540px',
        minWidth: '540px',
        maxWidth: '540px',
        boxSizing: 'border-box',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Background Subtle Contour Curves (Strictly Symmetrical & Within Outer Margins) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-30"
        viewBox="0 0 540 680"
        fill="none"
        preserveAspectRatio="none"
      >
        {/* Left Side Accents (Navy & Gold, bounded within 18px margin, never crossing into the 20px card edge) */}
        <path
          d="M -2 70 C 16 125, 14 205, -2 275"
          stroke="#00456E"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M -2 115 C 16 170, 14 245, -2 315"
          stroke="#FBB040"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Right Side Accents (Exact Symmetrical Mirror of Left Side) */}
        <path
          d="M 542 70 C 524 125, 526 205, 542 275"
          stroke="#00456E"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 542 115 C 524 170, 526 245, 542 315"
          stroke="#FBB040"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>

      {/* Main Container */}
      <div
        className="relative z-10 p-5 flex flex-col items-center"
        style={{ width: '100%', boxSizing: 'border-box' }}
      >
        {/* Top Header: Logo + Staff Label */}
        <div
          className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-3"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          <div className="pt-0.5">
            <DNaraiLogoVector className="h-9 w-auto" />
          </div>

          <div className="text-right">
            <div
              className="inline-flex items-center px-3 py-1 rounded-full bg-[#00456E]/10 border border-[#00456E]/20 text-[#00456E] text-[10px] font-black uppercase tracking-wider"
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                style={{ marginRight: '6px' }}
              />
              <span>WAT (UTC+1) Reference</span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">
              {todayFormatted}
            </div>
          </div>
        </div>

        {/* Passenger Info (Spacious, No Overlap) */}
        <div className="w-full text-center mb-3.5 px-2" style={{ width: '100%' }}>
          <div className="text-[10px] font-black text-[#00456E] tracking-widest uppercase opacity-80 mb-1">
            {displayGreeting}
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight uppercase min-h-[26px]">
            {displayPassengerName || (
              <span className="text-xs font-semibold text-slate-400 normal-case tracking-normal">
                Passenger Name
              </span>
            )}
          </div>
        </div>

        {/* Central Navy Blue Card Container */}
        <div
          className="w-full bg-[#0c3b5e] text-white rounded-[20px] p-4 shadow-lg relative border border-[#144d75]"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          {/* Card Title Row */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <h2 className="text-sm font-bold text-white tracking-wide">
              {cardTitle || 'Journey & Time-Zone Overview'}
            </h2>
            <span
              className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded"
              style={{ display: 'inline-block' }}
            >
              {itineraryLegs.length} {itineraryLegs.length === 1 ? 'Route' : 'Routes'}
            </span>
          </div>

          {/* Route Segments */}
          <div className="space-y-3">
            {itineraryLegs.map((leg, index) => {
              const originIata = leg.originIata ? leg.originIata.toUpperCase() : '—'
              const originCity = leg.originCity || 'Departure City'
              const destIata = leg.destIata ? leg.destIata.toUpperCase() : '—'
              const destCity = leg.destCity || 'Arrival City'

              const depState = (
                leg.originState ||
                resolveStateName({ state: leg.originState, city: leg.originCity, iata: leg.originIata, fallback: 'DEP' })
              ).toUpperCase()

              const arrState = (
                leg.destState ||
                resolveStateName({ state: leg.destState, city: leg.destCity, iata: leg.destIata, fallback: 'ARR' })
              ).toUpperCase()

              const depLocal = leg.departureTime || '—:—'
              const depWat = leg.watDepTime || leg.departureTime || '—:—'
              const arrLocal = leg.arrivalTime || '—:—'
              const arrWat = leg.watArrTime || leg.arrivalTime || '—:—'

              return (
                <div key={index} style={{ width: '100%' }}>
                  {/* Segment Box with Ample Padding */}
                  <div
                    className="bg-white/5 rounded-2xl p-3.5 border border-white/10 relative"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    {/* Top Row: Origin ➔ Flight ➔ Destination */}
                    <div
                      className="flex items-center justify-between text-white"
                      style={{ width: '100%' }}
                    >
                      {/* Origin City & IATA */}
                      <div style={{ width: '135px', textAlign: 'left', flexShrink: 0 }}>
                        <div
                          className="font-black tracking-tight text-white"
                          style={{ fontSize: '24px', lineHeight: '26px' }}
                        >
                          {originIata}
                        </div>
                        <div
                          className="text-xs text-slate-200 font-semibold mt-1 break-words"
                          style={{ lineHeight: '15px' }}
                        >
                          {originCity}
                        </div>
                      </div>

                      {/* Middle: Flight Number & Arrow */}
                      <div className="flex-1 flex flex-col items-center px-2">
                        {leg.airline ? (
                          <div
                            className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1 text-center whitespace-nowrap"
                            style={{ lineHeight: '14px' }}
                          >
                            {leg.airline} {leg.flightNumber}
                          </div>
                        ) : (
                          <div style={{ height: '14px', marginBottom: '4px' }} />
                        )}
                        <div className="w-full flex items-center justify-center">
                          <div className="h-[2px] bg-white/50 flex-1 max-w-[80px]" />
                          <svg
                            width="14"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '3px' }}
                          >
                            <line x1="2" y1="12" x2="20" y2="12" />
                            <polyline points="14 6 20 12 14 18" />
                          </svg>
                        </div>
                      </div>

                      {/* Destination City & IATA */}
                      <div style={{ width: '135px', textAlign: 'right', flexShrink: 0 }}>
                        <div
                          className="font-black tracking-tight text-white"
                          style={{ fontSize: '24px', lineHeight: '26px' }}
                        >
                          {destIata}
                        </div>
                        <div
                          className="text-xs text-slate-200 font-semibold mt-1 break-words"
                          style={{ lineHeight: '15px' }}
                        >
                          {destCity}
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Neatly Aligned Time & WAT Section */}
                    {showTimes && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          width: '100%',
                          boxSizing: 'border-box',
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                        }}
                      >
                        {/* Departure Column (Left-Aligned) */}
                        <div style={{ width: '48%', textAlign: 'left', boxSizing: 'border-box' }}>
                          {/* Row 1: Section Title & Date */}
                          <div
                            style={{
                              textAlign: 'left',
                              marginBottom: '6px',
                              lineHeight: '14px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: '#94a3b8',
                              }}
                            >
                              Departure
                            </span>
                            {leg.departureDate && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#cbd5e1',
                                  marginLeft: '6px',
                                }}
                              >
                                • {leg.departureDate}
                              </span>
                            )}
                          </div>

                          {/* Row 2: Perfectly Centered State Div & Yellow Div (WAT) */}
                          <div
                            style={{
                              textAlign: 'left',
                              lineHeight: '26px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {/* Faint Div: State Time Badge */}
                            <div
                              style={{
                                display: 'inline-block',
                                height: '24px',
                                lineHeight: '22px',
                                padding: '0 8px',
                                marginRight: '6px',
                                verticalAlign: 'middle',
                                boxSizing: 'border-box',
                                backgroundColor: 'rgba(255, 255, 255, 0.10)',
                                border: '1px solid rgba(255, 255, 255, 0.22)',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                  color: '#cbd5e1',
                                  marginRight: '4px',
                                  maxWidth: '85px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={depState}
                              >
                                {depState}:
                              </span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#ffffff',
                                }}
                              >
                                {depLocal}
                              </span>
                            </div>

                            {/* Yellow Div: Nigeria WAT Badge */}
                            <div
                              style={{
                                display: 'inline-block',
                                height: '24px',
                                lineHeight: '22px',
                                padding: '0 8px',
                                verticalAlign: 'middle',
                                boxSizing: 'border-box',
                                backgroundColor: 'rgba(251, 176, 64, 0.18)',
                                border: '1px solid rgba(251, 176, 64, 0.48)',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                  color: '#FBB040',
                                  marginRight: '4px',
                                }}
                              >
                                WAT:
                              </span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#FBB040',
                                }}
                              >
                                {depWat}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Arrival Column (Right-Aligned, Perfectly Symmetrical) */}
                        <div style={{ width: '48%', textAlign: 'right', boxSizing: 'border-box' }}>
                          {/* Row 1: Date & Section Title */}
                          <div
                            style={{
                              textAlign: 'right',
                              marginBottom: '6px',
                              lineHeight: '14px',
                            }}
                          >
                            {leg.arrivalDate && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#cbd5e1',
                                  marginRight: '6px',
                                }}
                              >
                                {leg.arrivalDate} •
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: '#94a3b8',
                              }}
                            >
                              Arrival
                            </span>
                          </div>

                          {/* Row 2: Perfectly Centered State Div & Yellow Div (WAT) */}
                          <div
                            style={{
                              textAlign: 'right',
                              lineHeight: '26px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {/* Faint Div: State Time Badge */}
                            <div
                              style={{
                                display: 'inline-block',
                                height: '24px',
                                lineHeight: '22px',
                                padding: '0 8px',
                                marginRight: '6px',
                                verticalAlign: 'middle',
                                boxSizing: 'border-box',
                                backgroundColor: 'rgba(255, 255, 255, 0.10)',
                                border: '1px solid rgba(255, 255, 255, 0.22)',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                  color: '#cbd5e1',
                                  marginRight: '4px',
                                  maxWidth: '85px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={arrState}
                              >
                                {arrState}:
                              </span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#ffffff',
                                }}
                              >
                                {arrLocal}
                              </span>
                            </div>

                            {/* Yellow Div: Nigeria WAT Badge */}
                            <div
                              style={{
                                display: 'inline-block',
                                height: '24px',
                                lineHeight: '22px',
                                padding: '0 8px',
                                verticalAlign: 'middle',
                                boxSizing: 'border-box',
                                backgroundColor: 'rgba(251, 176, 64, 0.18)',
                                border: '1px solid rgba(251, 176, 64, 0.48)',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                  color: '#FBB040',
                                  marginRight: '4px',
                                }}
                              >
                                WAT:
                              </span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  lineHeight: '22px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#FBB040',
                                }}
                              >
                                {arrWat}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connecting Transit Layover Pill */}
                  {index < itineraryLegs.length - 1 && (
                    <div
                      style={{
                        textAlign: 'center',
                        marginTop: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-block',
                          height: '24px',
                          lineHeight: '22px',
                          padding: '0 12px',
                          borderRadius: '9999px',
                          boxSizing: 'border-box',
                          verticalAlign: 'middle',
                          backgroundColor: 'rgba(245, 158, 11, 0.16)',
                          border: '1px solid rgba(251, 191, 36, 0.35)',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#fef08a',
                            lineHeight: '22px',
                          }}
                        >
                          <Lucide.Clock
                            size={11}
                            style={{
                              color: '#FBB040',
                              marginRight: '5px',
                              display: 'inline-block',
                              verticalAlign: 'middle',
                              marginTop: '-2px',
                            }}
                          />
                          Transit connection at {destIata}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Internal Staff Reference Footer Note */}
          <div
            className="mt-3 pt-2 border-t border-white/10 text-center text-slate-300/80 text-[10px] font-medium"
            style={{ lineHeight: '15px' }}
          >
            Nigeria West Africa Time (WAT) is strictly UTC+1. International daylight saving observed where applicable.
          </div>
        </div>

        {/* Clean Operations Base Note */}
        <div
          className="w-full text-center mt-2.5 pt-2 text-[10px] font-bold text-slate-400 flex items-center justify-between border-t border-slate-100 px-1"
          style={{ width: '100%', lineHeight: '16px' }}
        >
          <span>D.NARAI ENTERPRISE</span>
          <span>INTERNAL FLIGHT TIMELINE</span>
          <span>WAT TIME CONVERSION</span>
        </div>
      </div>
    </div>
  )
})

export default TravelCardPreview
