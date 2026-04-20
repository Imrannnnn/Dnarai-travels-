import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import * as Lucide from 'lucide-react';
import { popularCities, getFullCountryTimezoneData } from '../data/timezones';
import clsx from 'clsx';

const Globe = Lucide.Globe;
const Search = Lucide.Search;
const ArrowRightLeft = Lucide.ArrowRightLeft;
const MapPin = Lucide.MapPin;
const HelpCircle = Lucide.HelpCircle;
const ChevronDown = Lucide.ChevronDown;

function SearchableSelect({ value, onChange, allData }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return allData.filter((d) => popularCities.some((p) => p.timezone === d.timezone)).slice(0, 15);
    let q = query.toLowerCase();
    
    // Handle country synonyms
    if (q === 'usa') q = 'united states';
    if (q === 'uk') q = 'united kingdom';
    if (q === 'uae') q = 'united arab emirates';

    return allData.filter(d => 
      d.country.toLowerCase().includes(q) || 
      d.city.toLowerCase().includes(q) ||
      d.timezone.toLowerCase().includes(q)
    ).sort((a, b) => {
      const aExact = a.city.toLowerCase() === q;
      const bExact = b.city.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    }).slice(0, 50);
  }, [query, allData]);

  return (
    <div className={clsx("relative w-full", open ? "z-50" : "z-10")}>
      <div 
        onClick={() => setOpen(true)}
        className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none hover:ring-2 hover:ring-ocean-500/50 font-bold text-xs cursor-pointer truncate flex items-center shadow-sm"
      >
         <span className="truncate">{value.city} ({value.country})</span>
         <ChevronDown className="absolute right-3 text-slate-400 pointer-events-none" size={14} />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[60] p-1.5 premium-shadow">
          <div className="sticky top-0 bg-white dark:bg-slate-900 pb-2 z-10 pt-1 px-1">
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  autoFocus
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search region..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[16px] md:text-xs font-bold outline-none border border-slate-200 dark:border-slate-700 focus:border-ocean-500"
                />
             </div>
          </div>
          {filtered.length > 0 ? filtered.map((item) => (
            <button
              key={'select-'+item.id}
              onClick={() => {
                onChange(item);
                setOpen(false);
                setQuery('');
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-950/40 transition-colors flex items-center justify-between mb-0.5"
            >
              <div className="min-w-0 pr-2">
                <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{item.country}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{item.city}</p>
              </div>
              <span className="text-[9px] font-mono font-bold text-ocean-600 dark:text-ocean-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                {item.offset}
              </span>
            </button>
          )) : (
            <div className="p-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No results</div>
          )}
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

export default function TimeConverterPage() {
  const [currentTime, setCurrentTime] = useState(DateTime.now());
  const [selectedCity, setSelectedCity] = useState(popularCities[0]); // Lagos, Nigeria
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Conversion tool state
  const [convTime, setConvTime] = useState(DateTime.now().toFormat('HH:mm'));
  const [convFromCity, setConvFromCity] = useState(popularCities[0]); // Lagos
  const [convToCity, setConvToCity] = useState(popularCities[1]);   // London
  const [convResult, setConvResult] = useState('');

  // Get all possible timezones with country mapping
  const allData = useMemo(() => getFullCountryTimezoneData(), []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(DateTime.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter based on search (priority to country name and aliases)
  const filteredResults = useMemo(() => {
    if (!searchQuery) return allData.filter(d => 
        popularCities.some(p => p.timezone === d.timezone)
    ).slice(0, 15);

    let query = searchQuery.toLowerCase();
    
    // Handle common country synonyms
    if (query === 'usa') query = 'united states';
    if (query === 'uk') query = 'united kingdom';
    if (query === 'uae') query = 'united arab emirates';

    // Check if the query matches country, city, or timezone
    return allData.filter(d => 
      d.country.toLowerCase().includes(query) || 
      d.city.toLowerCase().includes(query) ||
      d.timezone.toLowerCase().includes(query)
    ).sort((a, b) => {
      // Prioritize exact city name matches or start-of-string matches
      const aExact = a.city.toLowerCase() === query;
      const bExact = b.city.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    }).slice(0, 50);
  }, [searchQuery, allData]);

  // Handle conversion whenever inputs change
  useEffect(() => {
    try {
      const [hours, minutes] = convTime.split(':');
      const baseDate = DateTime.now().setZone(convFromCity.timezone).set({
        hour: parseInt(hours),
        minute: parseInt(minutes),
        second: 0
      });
      
      const resultDate = baseDate.setZone(convToCity.timezone);
      setConvResult(resultDate.toLocaleString(DateTime.TIME_SIMPLE));
    } catch (e) {
      setConvResult('Invalid Time');
    }
  }, [convTime, convFromCity, convToCity]);

  const getTimeInfo = (city) => {
    const time = currentTime.setZone(city.timezone);
    return {
      formatted: time.toLocaleString(DateTime.TIME_WITH_SECONDS),
      date: time.toLocaleString(DateTime.DATE_HUGE),
      offset: time.toFormat('ZZZZ'),
      isDST: time.isInDST
    };
  };

  const selectedInfo = getTimeInfo(selectedCity);

  return (
    <div className="min-h-screen pb-12 pt-2 px-4 md:px-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ocean-50 dark:bg-ocean-900/30 text-ocean-600 dark:text-ocean-400 text-[10px] font-black uppercase tracking-widest border border-ocean-100 dark:border-ocean-800">
          <Globe size={12} />
          Global Time Intelligence
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
          Global <span className="text-gradient-premium">Converter</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm md:text-base font-medium">
          Synchronize your world. Seamlessly track travel time zones with D.Narai Enterprise.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Main Clock Card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-xl shadow-ocean-900/5 dark:shadow-none border border-slate-200/60 dark:border-slate-800/60 z-10">
            {/* Background Accent */}
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-ocean-500/10 rounded-full blur-3xl group-hover:bg-ocean-500/20 transition-all duration-700" />
            
            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <MapPin size={16} className="text-ocean-500 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-widest truncate">{selectedCity.city} ({selectedCity.country})</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white font-display leading-tight truncate">
                      {selectedCity.city}
                    </h2>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-5xl sm:text-6xl md:text-7xl font-black font-mono tracking-tighter text-ocean-600 dark:text-ocean-400 tabular-nums break-words">
                      {selectedInfo.formatted.split(' ')[0]}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-black text-slate-400 uppercase">{selectedInfo.formatted.split(' ')[1]}</span>
                      <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-xs font-bold text-slate-500">{selectedInfo.offset}</span>
                      {selectedInfo.isDST && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase border border-amber-200 dark:border-amber-800">
                          DST
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-base font-bold text-slate-400">{selectedInfo.date}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Tool & Global Search */}
          <div className="glass-card rounded-3xl p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-ocean-600 text-white flex items-center justify-center shadow-lg shadow-ocean-600/20">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">Time Explorer</h3>
                  <p className="text-xs font-bold text-slate-400">Search & convert instantly</p>
                </div>
              </div>

              {/* Relocated Search Box */}
              <div className="w-full md:w-80 relative z-50">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Sync a specific country..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 focus:ring-4 focus:ring-ocean-500/10 focus:border-ocean-500 outline-none transition-all font-bold text-[16px] md:text-sm"
                />
                
                {showDropdown && (
                  <div className="absolute top-full left-0 md:-left-20 right-0 md:-right-20 mt-3 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.2)] z-[60] p-1.5 premium-shadow">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((item) => (
                        <button
                  key={item.id}
                          onClick={() => {
                            setSelectedCity(item);
                            setShowDropdown(false);
                            setSearchQuery('');
                            // Automatically scroll to the top live-clock view
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-ocean-50 dark:hover:bg-ocean-950/40 transition-all group/item text-left mb-0.5 last:mb-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/item:bg-ocean-100 group-hover/item:text-ocean-600 transition-colors shrink-0">
                              <Globe size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm md:text-xs font-black text-slate-900 dark:text-white group-hover/item:text-ocean-700 dark:group-hover/item:text-ocean-400 truncate">
                                  {item.city} ({item.country})
                                </span>
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60 truncate">
                                {item.timezone}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <span className="inline-block px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-ocean-600 dark:text-ocean-400 group-hover/item:bg-ocean-200/50">
                              {item.offset}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <div className="flex justify-center"><Search size={24} className="opacity-20" /></div>
                        <p className="text-xs font-bold uppercase tracking-widest">No results found</p>
                      </div>
                    )}
                  </div>
                )}
                {showDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 md:gap-6 items-center bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 mb-4 shadow-inner">
              {/* From */}
              <div className="md:col-span-5 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                <div className="grid gap-2">
                  <SearchableSelect 
                    value={convFromCity} 
                    onChange={setConvFromCity} 
                    allData={allData} 
                  />
                  <div className="relative group">
                    <input
                      type="time"
                      value={convTime}
                      onChange={(e) => setConvTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-ocean-500 font-black text-xl text-ocean-600 dark:text-ocean-400 custom-time-input"
                    />
                  </div>
                </div>
              </div>

              {/* Icon */}
              <div className="flex md:col-span-1 py-3 md:py-0 flex-col items-center justify-center relative">
                <div className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shadow-md z-10 transition-transform hover:scale-110">
                  <ArrowRightLeft size={16} className="rotate-90 md:rotate-0 text-ocean-600 dark:text-ocean-400" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center md:hidden pointer-events-none">
                  <div className="w-px h-full bg-slate-200 dark:bg-slate-700 border-dashed" />
                </div>
              </div>

              {/* To */}
              <div className="md:col-span-5 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                <div className="grid gap-2">
                  <SearchableSelect 
                    value={convToCity} 
                    onChange={setConvToCity} 
                    allData={allData} 
                  />
                  <div className="bg-ocean-600/5 dark:bg-ocean-400/5 border border-dashed border-ocean-200 dark:border-ocean-800/50 rounded-xl p-4 flex flex-col items-center justify-center min-h-[64px] shadow-sm">
                    <p className="text-[10px] md:text-[8px] font-black text-ocean-600/60 dark:text-ocean-400/60 uppercase tracking-widest mb-1 md:mb-0.5">Result</p>
                    <p className="text-3xl md:text-2xl font-black text-ocean-600 dark:text-ocean-400 font-display tabular-nums leading-none">
                      {convResult}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-start gap-3 shadow-inner border border-slate-100 dark:border-slate-800/50">
              <HelpCircle size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs md:text-[10px] font-medium text-slate-500 leading-relaxed">
                DST changes are automatically calculated. Always check local airport times for flight schedules.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar: Popular Destinations */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Global Watch</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-ocean-600 dark:text-ocean-400 uppercase">Live</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {popularCities.slice(0, 8).map((pCity) => {
              const item = allData.find(d => d.timezone === pCity.timezone) || pCity;
              const info = getTimeInfo(item);
              const isActive = selectedCity.timezone === item.timezone;
              return (
                <button
                  key={item.timezone + '-sidebar'}
                  onClick={() => setSelectedCity(item)}
                  className={clsx(
                    "group relative w-full p-3 rounded-2xl transition-all duration-300 text-left overflow-hidden border",
                    isActive 
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg translate-x-1" 
                      : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-ocean-200 dark:hover:border-ocean-900"
                  )}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={clsx(
                        "text-xs font-black tracking-tight truncate",
                        isActive ? "text-white" : "text-slate-900 dark:text-white"
                      )}>{item.country}</p>
                      <p className={clsx(
                        "text-[9px] font-bold uppercase tracking-tighter opacity-60 truncate",
                        isActive ? "text-slate-300" : "text-slate-500"
                      )}>{item.city}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={clsx(
                        "text-sm font-black font-mono tabular-nums leading-none",
                        isActive ? "text-ocean-400" : "text-ocean-600 dark:text-ocean-400"
                      )}>
                        {info.formatted.split(':').slice(0, 2).join(':')}
                      </p>
                      <p className={clsx(
                        "text-[8px] font-bold opacity-50 block mt-0.5",
                        isActive ? "text-slate-300" : "text-slate-500"
                      )}>{item.offset}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="p-5 rounded-3xl bg-gradient-to-br from-ocean-600 to-indigo-700 text-white shadow-lg relative overflow-hidden group">
            <Globe className="absolute -bottom-2 -right-2 h-16 w-16 opacity-10 group-hover:scale-110 transition-transform duration-700" />
            <h4 className="text-sm font-black mb-1 relative z-10">D.Narai Concierge</h4>
            <p className="text-[10px] font-medium text-ocean-100/80 mb-3 relative z-10">
              Need help with global travel scheduling?
            </p>
            <button className="w-full py-2 bg-white text-ocean-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-ocean-50 active:scale-95 transition-all relative z-10">
              Contact Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
