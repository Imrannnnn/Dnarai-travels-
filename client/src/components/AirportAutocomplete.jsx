import { useState, useEffect, useRef } from 'react'
import * as Lucide from 'lucide-react'
import airportsData from '../../airports.json'

const Plane = Lucide.Plane

export default function AirportAutocomplete({
    label,
    value,
    onChange,
    onSelect,
    placeholder,
    icon: Icon = Plane,
    ...props
}) {
    const [inputValue, setInputValue] = useState(value || '')
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const wrapperRef = useRef(null)

    useEffect(() => {
        setInputValue(value || '')
    }, [value])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleInputChange = (e) => {
        const query = e.target.value
        setInputValue(query)
        if (onChange) onChange(query)

        if (query.length > 1) {
            const searchLower = query.toLowerCase()
            const filtered = airportsData.filter(item => {
                return (
                    item.city?.toLowerCase().includes(searchLower) ||
                    item.airport_name?.toLowerCase().includes(searchLower) ||
                    item.iata?.toLowerCase().includes(searchLower)
                )
            }).slice(0, 10) // Limit to top 10

            setSuggestions(filtered)
            setShowSuggestions(true)
            setActiveIndex(-1)
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }

    const handleClear = (e) => {
        e.stopPropagation()
        setInputValue('')
        setSuggestions([])
        setShowSuggestions(false)
        if (onChange) onChange('')
    }

    const handleSelect = (airport) => {
        const formattedValue = `${airport.city} (${airport.iata})`
        setInputValue(formattedValue)
        if (onSelect) onSelect(airport)
        setShowSuggestions(false)
        if (onChange) onChange(formattedValue)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(prev => (prev > 0 ? prev - 1 : -1))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                handleSelect(suggestions[activeIndex])
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }

    return (
        <div className="space-y-2 relative" ref={wrapperRef}>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {label}
            </label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon size={18} className={label.toLowerCase().includes('departing') ? 'rotate-0' : ''} />
                </div>
                <input
                    type="text"
                    {...props}
                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-10 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => inputValue.length > 1 && setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                />

                {inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Clear input"
                    >
                        <Lucide.X size={14} />
                    </button>
                )}

                {showSuggestions && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-sand-200 dark:border-slate-800 overflow-hidden text-left animate-in fade-in zoom-in duration-200">
                        {suggestions.length > 0 ? (
                            <ul className="max-h-60 overflow-y-auto py-2">
                                {suggestions.map((airport, index) => (
                                    <li
                                        key={`${airport.iata}-${index}`}
                                        className={`px-4 py-3 cursor-pointer text-sm transition-colors flex justify-between items-center group ${index === activeIndex
                                            ? 'bg-ocean-50 dark:bg-ocean-900/20 text-ocean-700 dark:text-ocean-300'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                        onClick={() => handleSelect(airport)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold">{airport.city}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {airport.airport_name}
                                            </span>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:bg-ocean-100 dark:group-hover:bg-ocean-900/40 group-hover:text-ocean-600 dark:group-hover:text-ocean-400 transition-colors">
                                            {airport.iata}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                <div className="font-semibold text-slate-700 dark:text-slate-300">Custom / Dummy Location:</div>
                                <div className="italic text-slate-500 dark:text-slate-400 mt-0.5">&ldquo;{inputValue}&rdquo; will be used</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
