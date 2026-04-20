import React, { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import * as Lucide from 'lucide-react';
import { popularCities, getFullCountryTimezoneData } from '../data/timezones';
import clsx from 'clsx';

const Clock = Lucide.Clock;
const Globe = Lucide.Globe;
const Search = Lucide.Search;
const ArrowRightLeft = Lucide.ArrowRightLeft;
const MapPin = Lucide.MapPin;
const HelpCircle = Lucide.HelpCircle;
const ChevronDown = Lucide.ChevronDown;

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

    const query = searchQuery.toLowerCase();
    
    // Check if the query matches country, city, timezone, or any of the aliases
    return allData.filter(d => 
      d.country.toLowerCase().includes(query) || 
      d.city.toLowerCase().includes(query) ||
      d.timezone.toLowerCase().includes(query) ||
      (d.aliases && d.aliases.some(alias => alias.toLowerCase().includes(query)))
    ).slice(0, 50);
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
    <div className="min-h-screen pb-12 pt-4 px-4 md:px-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Clock Card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card rounded-3xl p-6 md:p-10 relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-ocean-500/10 rounded-full blur-3xl group-hover:bg-ocean-500/20 transition-all duration-700" />
            
            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <MapPin size={16} className="text-ocean-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{selectedCity.country}</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white font-display">
                      {selectedCity.city}
                    </h2>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-6xl md:text-7xl font-black font-mono tracking-tighter text-ocean-600 dark:text-ocean-400 tabular-nums">
                      {selectedInfo.formatted.split(' ')[0]}
                    </div>
                    <div className="flex items-center gap-3">
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
              <div className="w-full md:w-80 relative">
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-ocean-500/10 focus:border-ocean-500 outline-none transition-all font-bold text-xs"
                />
                
                {showDropdown && (
                  <div className="absolute top-full left-0 md:-left-20 right-0 md:-right-20 mt-3 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.2)] z-[60] p-1.5 premium-shadow">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedCity(item);
                            setShowDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-ocean-50 dark:hover:bg-ocean-950/40 transition-all group/item text-left mb-0.5 last:mb-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/item:bg-ocean-100 group-hover/item:text-ocean-600 transition-colors shrink-0">
                              <Globe size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-900 dark:text-white group-hover/item:text-ocean-700 dark:group-hover/item:text-ocean-400 truncate">
                                  {item.country}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  • {item.city}
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

            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              {/* From */}
              <div className="md:col-span-5 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                <div className="grid gap-2">
                  <div className="relative group">
                    <select
                      value={convFromCity.id}
                      onChange={(e) => setConvFromCity(allData.find(c => c.id === e.target.value))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-ocean-500 font-bold text-xs cursor-pointer"
                    >
                      {allData.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.country} - {item.city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
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
              <div className="flex md:col-span-1 flex-col items-center justify-center md:pt-4">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                  <ArrowRightLeft size={16} />
                </div>
              </div>

              {/* To */}
              <div className="md:col-span-5 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                <div className="grid gap-2">
                  <div className="relative group">
                    <select
                      value={convToCity.id}
                      onChange={(e) => setConvToCity(allData.find(c => c.id === e.target.value))}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-ocean-500 font-bold text-xs cursor-pointer"
                    >
                      {allData.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.country} - {item.city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                  <div className="bg-ocean-600/5 dark:bg-ocean-400/5 border border-dashed border-ocean-200 dark:border-ocean-800/50 rounded-xl p-3 flex flex-col items-center justify-center min-h-[54px]">
                    <p className="text-[8px] font-black text-ocean-600/60 dark:text-ocean-400/60 uppercase tracking-widest mb-0.5">Result</p>
                    <p className="text-2xl font-black text-ocean-600 dark:text-ocean-400 font-display tabular-nums leading-none">
                      {convResult}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-start gap-2">
              <HelpCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
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
