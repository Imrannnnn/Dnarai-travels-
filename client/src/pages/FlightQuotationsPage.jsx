import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import clsx from 'clsx'
import { fetchPassengers, getApiBaseUrl } from '../data/api'
import Modal from '../components/Modal'
import AirportAutocomplete from '../components/AirportAutocomplete'

const POPULAR_AIRLINES = [
  'Air Peace',
  'Ibom Air',
  'Arik Air',
  'United Nigeria',
  'Aero Contractors',
  'ValueJet',
  'Green Africa',
  'Overland Airways',
  'Max Air',
]

const STORAGE_KEY = 'dnarai_temp_quotations'
const SETTINGS_KEY = 'dnarai_quotation_settings'

const DEFAULT_SETTINGS = {
  cardProcessingFee: 3000,
  serviceChargeOneWay: 5000,
  serviceChargeReturn: 10000,
  disclaimerText:
    'Please note: The airline prices are subject to changes. The earlier you book, the more likely you are to secure a seat at the price shown at this time.',
  footerText:
    '-~ *D.Narai*\n*Our services end when you successfully arrive at your destination*',
}

function formatMoney(amount) {
  const num = Number(amount) || 0
  return num.toLocaleString('en-NG')
}

function getOrdinalSuffix(day) {
  const d = parseInt(day, 10)
  if (isNaN(d)) return day
  const j = d % 10
  const k = d % 100
  if (j === 1 && k !== 11) return `${d}st`
  if (j === 2 && k !== 12) return `${d}nd`
  if (j === 3 && k !== 13) return `${d}rd`
  return `${d}th`
}

function formatFlightDate(dateStr) {
  if (!dateStr) return ''
  // Support both YYYY-MM-DD and Date objects
  const parts = String(dateStr).split('T')[0].split('-')
  let d
  if (parts.length === 3) {
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  } else {
    d = new Date(dateStr)
  }
  if (isNaN(d.getTime())) return ''

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const weekday = weekdays[d.getDay()]
  const dayOrdinal = getOrdinalSuffix(d.getDate())
  const month = months[d.getMonth()]
  return `${weekday}, ${dayOrdinal}, ${month}`
}

function formatAirlineName(name) {
  if (!name) return ''
  return String(name)
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return ''
      if (word === word.toUpperCase() && word.length > 1) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function formatAirlineBlock(airline, cardFee) {
  if (!airline || !airline.airlineName?.trim()) return ''
  const formattedName = formatAirlineName(airline.airlineName)
  const lines = [`*${formattedName}*`]
  const groups = airline.fareGroups || []
  const formattedGroups = []

  for (const fg of groups) {
    let times = []
    if (Array.isArray(fg.times) && fg.times.length > 0) {
      times = fg.times
    } else if (fg.timesInput) {
      times = fg.timesInput
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
    }

    const timesStr = times.join(', ')
    const hasBaseFare = fg.baseFare !== '' && fg.baseFare !== undefined && fg.baseFare !== null && Number(fg.baseFare) > 0
    const baseFare = Number(fg.baseFare) || 0
    const fee = Number(cardFee) || 0
    const totalFare = baseFare + fee
    const fareStr = hasBaseFare
      ? fee > 0
        ? `@ ₦${formatMoney(totalFare)} (Fare + Card Processing Fee)`
        : `@ ₦${formatMoney(totalFare)} (Fare)`
      : ''

    if (timesStr && fareStr) {
      if (times.length <= 1) {
        formattedGroups.push(`${timesStr} ${fareStr}`)
      } else {
        formattedGroups.push(`${timesStr}\n${fareStr}`)
      }
    } else if (timesStr) {
      formattedGroups.push(timesStr)
    } else if (fareStr) {
      formattedGroups.push(fareStr)
    }
  }

  if (formattedGroups.length > 0) {
    const hasMulti = formattedGroups.some((g) => g.includes('\n'))
    lines.push(formattedGroups.join(hasMulti ? '\n\n' : '\n'))
  }

  return formattedGroups.length > 0 ? lines.join('\n') : ''
}

function generateWhatsAppMessage(data, settings) {
  const isReturn = data.tripType === 'return'
  const origin = data.originCity?.trim() || 'Abuja'
  const destination = data.destinationCity?.trim() || 'Lagos'
  const outboundDateStr = formatFlightDate(data.departureDate)
  const returnDateStr = formatFlightDate(data.returnDate)

  const cardFee = Number(settings.cardProcessingFee ?? 3000)
  const serviceChargePerPerson = isReturn
    ? Number(settings.serviceChargeReturn ?? 10000)
    : Number(settings.serviceChargeOneWay ?? 5000)
  const passengerCount = Math.max(1, Number(data.passengerCount) || 1)
  const totalServiceCharge = serviceChargePerPerson * passengerCount

  const sections = []

  // 1. Header & Outbound
  if (isReturn) {
    sections.push('*Flight Option Inbound Ticket:*')
  } else {
    sections.push('*Flight Option One Way Ticket:*')
  }

  sections.push(`*${origin} → ${destination}*`)

  if (outboundDateStr) {
    sections.push(`*${outboundDateStr}*`)
  }

  // 2. Outbound Airlines
  const outboundBlocks = (data.outboundFlights || [])
    .filter((a) => a.airlineName?.trim())
    .map((a) => formatAirlineBlock(a, cardFee))
    .filter(Boolean)

  if (outboundBlocks.length > 0) {
    sections.push(outboundBlocks.join('\n\n'))
  }

  // 3. Return Section
  if (isReturn) {
    if (returnDateStr) {
      sections.push(`*${returnDateStr}*`)
    }
    sections.push(`*${destination} → ${origin}*`)

    const returnBlocks = (data.returnFlights || [])
      .filter((a) => a.airlineName?.trim())
      .map((a) => formatAirlineBlock(a, cardFee))
      .filter(Boolean)

    if (returnBlocks.length > 0) {
      sections.push(returnBlocks.join('\n\n'))
    }
  }

  // 4. Service Charge
  const tripTypeLabel = isReturn ? 'Return' : 'One-way'
  let serviceChargeLine = `*Service Charge:* ₦${formatMoney(serviceChargePerPerson)} per person for a ${tripTypeLabel} local ticket`
  if (passengerCount > 1) {
    serviceChargeLine += ` (Total: ₦${formatMoney(totalServiceCharge)} for ${passengerCount} passengers)`
  }
  sections.push(serviceChargeLine)

  // 5. Disclaimer & Footer
  sections.push(
    settings.disclaimerText ||
    'Please note: The airline prices are subject to changes. The earlier you book, the more likely you are to secure a seat at the price shown at this time.'
  )
  sections.push(
    settings.footerText ||
    '-~ *D.Narai*\n*Our services end when you successfully arrive at your destination*'
  )

  return sections.join('\n\n')
}

export default function FlightQuotationsPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || null
  const baseUrl = getApiBaseUrl()

  // Load temporary quotations from localStorage
  const [tempQuotations, setTempQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Load settings from localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (
          parsed.footerText ===
          '-~ *D.Narai*\n*Our services end when you arrive at your destination*'
        ) {
          parsed.footerText =
            '-~ *D.Narai*\n*Our services end when you successfully arrive at your destination*'
        }
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
      return DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const [passengers, setPassengers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [copiedSuccess, setCopiedSuccess] = useState(false)

  // Form State
  const [editingIndex, setEditingIndex] = useState(null)
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    passengerId: '',
    tripType: 'one_way',
    passengerCount: 1,
    originCity: '',
    originIata: '',
    destinationCity: '',
    destinationIata: '',
    departureDate: new Date().toISOString().split('T')[0],
    returnDate: new Date().toISOString().split('T')[0],
    outboundFlights: [
      {
        airlineName: 'Air Peace',
        fareGroups: [
          { times: [], baseFare: '', timesInput: '' },
        ],
      },
    ],
    returnFlights: [
      {
        airlineName: 'Air Peace',
        fareGroups: [
          { times: [], baseFare: '', timesInput: '' },
        ],
      },
    ],
  })

  // Save tempQuotations to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tempQuotations))
    } catch (e) {
      console.error('Failed to sync temporary quotations to localStorage', e)
    }
  }, [tempQuotations])

  // Save settings to localStorage
  const handleSaveSettings = (e) => {
    if (e) e.preventDefault()
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      setIsSettingsModalOpen(false)
    } catch (e) {
      console.error('Failed to save settings', e)
    }
  }

  // Load passengers for selection convenience
  useEffect(() => {
    async function loadPassengers() {
      try {
        const res = await fetchPassengers({ baseUrl, token })
        if (Array.isArray(res)) setPassengers(res)
      } catch {
        // Passengers lookup is optional
      }
    }
    loadPassengers()
  }, [baseUrl, token])

  // Reset form
  const resetForm = () => {
    setEditingIndex(null)
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      clientName: '',
      clientPhone: '',
      passengerId: '',
      tripType: 'one_way',
      passengerCount: 1,
      originCity: '',
      originIata: '',
      destinationCity: '',
      destinationIata: '',
      departureDate: today,
      returnDate: today,
      outboundFlights: [
        {
          airlineName: 'Air Peace',
          fareGroups: [
            {
              times: [],
              baseFare: '',
              timesInput: '',
            },
          ],
        },
      ],
      returnFlights: [
        {
          airlineName: 'Air Peace',
          fareGroups: [
            {
              times: [],
              baseFare: '',
              timesInput: '',
            },
          ],
        },
      ],
    })
  }

  const handleOpenCreateModal = () => {
    resetForm()
    setIsFormModalOpen(true)
  }

  const handleEditQuote = (quote) => {
    const realIdx = tempQuotations.findIndex((q) => q.id === quote.id)
    setEditingIndex(realIdx !== -1 ? realIdx : null)
    setFormData({
      clientName: quote.clientName || '',
      clientPhone: quote.clientPhone || '',
      passengerId: quote.passengerId || '',
      tripType: quote.tripType || 'return',
      passengerCount: quote.passengerCount || 1,
      originCity: quote.originCity || 'Abuja (ABV)',
      originIata: quote.originIata || '',
      destinationCity: quote.destinationCity || 'Lagos (LOS)',
      destinationIata: quote.destinationIata || '',
      departureDate: quote.departureDate || new Date().toISOString().split('T')[0],
      returnDate: quote.returnDate || new Date().toISOString().split('T')[0],
      outboundFlights: quote.outboundFlights || [],
      returnFlights: quote.returnFlights || [],
    })
    setIsFormModalOpen(true)
  }

  const handlePassengerSelect = (e) => {
    const pId = e.target.value
    if (!pId) {
      setFormData((prev) => ({ ...prev, passengerId: '' }))
      return
    }
    const passenger = passengers.find((p) => (p.id || p._id) === pId)
    if (passenger) {
      setFormData((prev) => ({
        ...prev,
        passengerId: pId,
        clientName: passenger.fullName,
        clientPhone: passenger.phone || prev.clientPhone,
      }))
    }
  }

  // Airline & Fare group handlers
  const addAirline = (direction = 'outbound') => {
    const key = direction === 'outbound' ? 'outboundFlights' : 'returnFlights'
    setFormData((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        {
          airlineName: '',
          fareGroups: [{ times: [], baseFare: '', timesInput: '' }],
        },
      ],
    }))
  }

  const removeAirline = (direction = 'outbound', index) => {
    const key = direction === 'outbound' ? 'outboundFlights' : 'returnFlights'
    setFormData((prev) => {
      const updated = [...prev[key]]
      updated.splice(index, 1)
      return { ...prev, [key]: updated }
    })
  }

  const updateAirlineName = (direction = 'outbound', index, name) => {
    const key = direction === 'outbound' ? 'outboundFlights' : 'returnFlights'
    setFormData((prev) => {
      const updated = [...prev[key]]
      updated[index] = { ...updated[index], airlineName: name }
      return { ...prev, [key]: updated }
    })
  }

  const addFareGroup = (direction = 'outbound', airlineIndex) => {
    const key = direction === 'outbound' ? 'outboundFlights' : 'returnFlights'
    setFormData((prev) => {
      const updated = [...prev[key]]
      const target = { ...updated[airlineIndex] }
      target.fareGroups = [
        ...target.fareGroups,
        { times: [], baseFare: '', timesInput: '' },
      ]
      updated[airlineIndex] = target
      return { ...prev, [key]: updated }
    })
  }

  const removeFareGroup = (direction = 'outbound', airlineIndex, groupIndex) => {
    const key = direction === 'outbound' ? 'outboundFlights' : 'returnFlights'
    setFormData((prev) => {
      const updated = [...prev[key]]
      const target = { ...updated[airlineIndex] }
      const newGroups = [...target.fareGroups]
      newGroups.splice(groupIndex, 1)
      target.fareGroups = newGroups
      updated[airlineIndex] = target
      return { ...prev, [key]: updated }
    })
  }

  const updateFareGroup = (direction = 'outbound', airlineIndex, groupIndex, field, value) => {
    const key = direction === 'outbound' ? 'outboundFlights' : 'returnFlights'
    setFormData((prev) => {
      const updated = [...prev[key]]
      const target = { ...updated[airlineIndex] }
      const newGroups = [...target.fareGroups]
      const grp = { ...newGroups[groupIndex] }

      if (field === 'timesInput') {
        grp.timesInput = value
        grp.times = value
          .split(/[,;\n]/)
          .map((t) => t.trim())
          .filter(Boolean)
      } else if (field === 'baseFare') {
        grp.baseFare = value === '' ? '' : Math.max(0, Number(value) || 0)
      }

      newGroups[groupIndex] = grp
      target.fareGroups = newGroups
      updated[airlineIndex] = target
      return { ...prev, [key]: updated }
    })
  }

  // Service charge calculation
  const currentServiceCharge = useMemo(() => {
    const feePerPerson =
      formData.tripType === 'return'
        ? Number(settings.serviceChargeReturn || 10000)
        : Number(settings.serviceChargeOneWay || 5000)
    const count = Math.max(1, Number(formData.passengerCount) || 1)
    return {
      perPerson: feePerPerson,
      total: feePerPerson * count,
      count,
    }
  }, [formData.tripType, formData.passengerCount, settings])

  // Preview generator
  const handlePreviewQuotation = () => {
    const msg = generateWhatsAppMessage(formData, settings)
    setPreviewText(msg)
    setIsPreviewModalOpen(true)
  }

  // Save to temporary session storage
  const handleSaveToTemp = (e) => {
    if (e) e.preventDefault()
    if (!formData.clientName.trim()) {
      alert('Please enter a client name')
      return
    }

    const generatedText = generateWhatsAppMessage(formData, settings)
    const isEditing = editingIndex !== null && tempQuotations[editingIndex]
    const sanitizeFlights = (flights = []) =>
      flights.map((f) => ({
        ...f,
        airlineName: formatAirlineName(f.airlineName),
      }))

    const quoteItem = {
      id: isEditing ? tempQuotations[editingIndex].id : `TEMP-${Date.now()}`,
      clientName: formData.clientName.trim(),
      clientPhone: formData.clientPhone.trim(),
      tripType: formData.tripType,
      originCity: formData.originCity,
      originIata: formData.originIata,
      destinationCity: formData.destinationCity,
      destinationIata: formData.destinationIata,
      departureDate: formData.departureDate,
      returnDate: formData.tripType === 'return' ? formData.returnDate : undefined,
      passengerCount: formData.passengerCount,
      outboundFlights: sanitizeFlights(formData.outboundFlights),
      returnFlights: formData.tripType === 'return' ? sanitizeFlights(formData.returnFlights) : [],
      generatedText,
      createdAt: isEditing ? tempQuotations[editingIndex].createdAt : new Date().toISOString(),
    }

    if (editingIndex !== null) {
      setTempQuotations((prev) => {
        const copy = [...prev]
        copy[editingIndex] = quoteItem
        return copy
      })
    } else {
      setTempQuotations((prev) => [quoteItem, ...prev])
    }

    setIsFormModalOpen(false)
  }

  // Quick WhatsApp send
  const handleSendWhatsApp = (phone = null, text = null) => {
    const targetPhone = phone || formData.clientPhone
    if (!targetPhone) {
      alert('Please provide a WhatsApp phone number')
      return
    }

    let cleanPhone = targetPhone.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '234' + cleanPhone.slice(1)
    } else if (cleanPhone.length === 10) {
      cleanPhone = '234' + cleanPhone
    }

    const msgToSend = text || previewText || generateWhatsAppMessage(formData, settings)
    const encoded = encodeURIComponent(msgToSend)
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank')
  }

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(previewText)
      setCopiedSuccess(true)
      setTimeout(() => setCopiedSuccess(false), 2500)
    } catch {
      // ignore
    }
  }

  const handleDeleteTempQuote = (id) => {
    setTempQuotations((prev) => prev.filter((q) => q.id !== id))
  }

  const handleClearAllTemp = () => {
    if (!window.confirm('Delete all temporary quotations?')) return
    setTempQuotations([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const filteredQuotes = useMemo(() => {
    if (!searchQuery) return tempQuotations
    const q = searchQuery.toLowerCase()
    return tempQuotations.filter(
      (item) =>
        item.clientName?.toLowerCase().includes(q) ||
        item.clientPhone?.includes(q) ||
        item.originCity?.toLowerCase().includes(q) ||
        item.destinationCity?.toLowerCase().includes(q)
    )
  }, [tempQuotations, searchQuery])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/super-admin')}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
              title="Return to Admin Dashboard"
            >
              <Lucide.ArrowLeft size={20} />
            </button>
            <div className="h-9 w-9 bg-ocean-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Lucide.PlaneTakeoff size={18} />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Flight Quotation Generator
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                  Instant & Temporary
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Fast multi-airline comparisons, auto card processing fee, & WhatsApp quotes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              title="Configure Default Fees & Wording"
            >
              <Lucide.Settings size={16} />
              <span className="hidden sm:inline">Settings (Fees & Wording)</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-ocean-600 text-white rounded-xl text-xs font-black hover:bg-ocean-700 transition-all shadow-md shadow-ocean-600/20 active:scale-95"
            >
              <Lucide.Plus size={16} />
              <span>Create New Quotation</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-ocean-900 via-slate-900 to-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-ocean-500/20 text-ocean-400 rounded-xl flex items-center justify-center border border-ocean-500/30 shrink-0">
              <Lucide.Zap size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide">
                Frictionless Quotation Workflow
              </h4>
              <p className="text-xs text-slate-300">
                Card Processing Fee: <span className="font-bold text-ocean-300">₦{formatMoney(settings.cardProcessingFee)}</span> auto-calculated | Service Charge: <span className="font-bold text-amber-300">₦{formatMoney(settings.serviceChargeOneWay)}</span> (One-way) / <span className="font-bold text-amber-300">₦{formatMoney(settings.serviceChargeReturn)}</span> (Inbound) per passenger. No database clutter.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tempQuotations.length > 0 && (
              <button
                onClick={handleClearAllTemp}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 transition-all"
              >
                Clear All ({tempQuotations.length})
              </button>
            )}
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-bold rounded-xl shadow transition-all"
            >
              + Quick Quote
            </button>
          </div>
        </div>

        {/* Temporary Quotations List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Lucide.History size={16} className="text-ocean-600" />
                Session Quotations ({filteredQuotes.length})
              </h3>
              <p className="text-xs text-slate-500">
                Temporary quotations ready to preview, copy, or send to WhatsApp
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Filter by client, city, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500"
              />
            </div>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="py-20 text-center px-4 space-y-3">
              <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Lucide.MessageSquare size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No active quotations</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click &quot;+ Create New Quotation&quot; to quickly enter flight options, calculate the card fee, and generate a WhatsApp quote.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-ocean-600 text-white rounded-xl text-xs font-bold hover:bg-ocean-700 transition-all shadow-md inline-flex items-center gap-2"
              >
                <Lucide.Plus size={16} />
                <span>Create New Quotation</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredQuotes.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{q.clientName}</span>
                      {q.clientPhone && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {q.clientPhone}
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        {q.tripType === 'return' ? 'Inbound Ticket' : 'One Way'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {q.originCity} → {q.destinationCity}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>Depart: {formatFlightDate(q.departureDate)}</span>
                      {q.tripType === 'return' && q.returnDate && (
                        <>
                          <span className="text-slate-400">|</span>
                          <span>Inbound: {formatFlightDate(q.returnDate)}</span>
                        </>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{q.passengerCount} Pax</span>
                      <span>•</span>
                      <span>
                        {(q.outboundFlights || []).length + (q.returnFlights || []).length} Airline
                        Option(s)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => {
                        setPreviewText(q.generatedText)
                        setFormData(q)
                        setIsPreviewModalOpen(true)
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Lucide.MessageSquare size={14} />
                      <span>WhatsApp Preview</span>
                    </button>
                    <button
                      onClick={() => handleEditQuote(q)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                      title="Edit Quotation"
                    >
                      <Lucide.Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(q.clientPhone, q.generatedText)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all"
                      title="Send via WhatsApp"
                    >
                      <Lucide.Send size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteTempQuote(q.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                      title="Delete Quotation"
                    >
                      <Lucide.Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingIndex !== null ? 'Edit Flight Quotation' : 'Create Flight Quotation'}
      >
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Client Selection */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Lucide.Users size={16} className="text-ocean-600" />
                1. Client Selection
              </h4>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Select Client or Type Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {passengers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Registered Client
                  </label>
                  <select
                    value={formData.passengerId}
                    onChange={handlePassengerSelect}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500"
                  >
                    <option value="">-- Choose client to auto-fill --</option>
                    {passengers.map((p) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.fullName} ({p.phone || p.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Alhaji Ibrahim Danladi"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Phone Number *
                </label>
                <div className="relative">
                  <Lucide.Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="e.g. 08031234567 or +234..."
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Number of Passengers *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        passengerCount: Math.max(1, prev.passengerCount - 1),
                      }))
                    }
                    className="h-9 w-9 bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-100 flex items-center justify-center text-slate-600"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={formData.passengerCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passengerCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-full text-center py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-ocean-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, passengerCount: prev.passengerCount + 1 }))
                    }
                    className="h-9 w-9 bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-100 flex items-center justify-center text-slate-600"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Itinerary Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Lucide.MapPin size={16} className="text-ocean-600" />
                2. Itinerary Details
              </h4>

              <div className="flex bg-slate-200/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tripType: 'one_way' })}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                    formData.tripType === 'one_way'
                      ? 'bg-white text-ocean-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  One Way
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tripType: 'return' })}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                    formData.tripType === 'return'
                      ? 'bg-white text-ocean-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Inbound
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <AirportAutocomplete
                  label="Departure City / Airport *"
                  value={formData.originCity}
                  onChange={(val) => {
                    const iataMatch = val.match(/\(([A-Z]{3})\)/i)
                    setFormData((prev) => ({
                      ...prev,
                      originCity: val,
                      originIata: iataMatch ? iataMatch[1].toUpperCase() : '',
                    }))
                  }}
                  onSelect={(airport) =>
                    setFormData((prev) => ({
                      ...prev,
                      originCity: `${airport.city} (${airport.iata})`,
                      originIata: airport.iata,
                    }))
                  }
                  placeholder="e.g. Abuja (ABV) or type any state"
                />
              </div>

              <div>
                <AirportAutocomplete
                  label="Destination City / Airport *"
                  value={formData.destinationCity}
                  onChange={(val) => {
                    const iataMatch = val.match(/\(([A-Z]{3})\)/i)
                    setFormData((prev) => ({
                      ...prev,
                      destinationCity: val,
                      destinationIata: iataMatch ? iataMatch[1].toUpperCase() : '',
                    }))
                  }}
                  onSelect={(airport) =>
                    setFormData((prev) => ({
                      ...prev,
                      destinationCity: `${airport.city} (${airport.iata})`,
                      destinationIata: airport.iata,
                    }))
                  }
                  placeholder="e.g. Lagos (LOS) or type any state"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Departure Date *
                </label>
                <input
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500"
                />
              </div>

              {formData.tripType === 'return' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Inbound Date *
                  </label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Outbound Options */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Lucide.PlaneTakeoff size={16} className="text-ocean-600" />
                  Outbound: {formData.originCity || 'Departure'} → {formData.destinationCity || 'Destination'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Card processing fee (₦{formatMoney(settings.cardProcessingFee)}) is added automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => addAirline('outbound')}
                className="px-3 py-1.5 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start shadow-sm transition-all"
              >
                <Lucide.Plus size={14} />
                <span>Add Airline</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.outboundFlights.map((airline, aIdx) => (
                <div key={aIdx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 max-w-sm">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Airline Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Air Peace"
                        value={airline.airlineName}
                        onChange={(e) => updateAirlineName('outbound', aIdx, e.target.value)}
                        onBlur={(e) => updateAirlineName('outbound', aIdx, formatAirlineName(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-ocean-500"
                      />
                    </div>

                    <div className="hidden sm:flex flex-wrap items-center gap-1">
                      {POPULAR_AIRLINES.slice(0, 3).map((al) => (
                        <button
                          key={al}
                          type="button"
                          onClick={() => updateAirlineName('outbound', aIdx, al)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded"
                        >
                          {al}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAirline('outbound', aIdx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      title="Remove Airline"
                    >
                      <Lucide.Trash2 size={16} />
                    </button>
                  </div>

                  {/* Fare groups */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {airline.fareGroups.map((group, gIdx) => {
                      const calculatedTotal =
                        (Number(group.baseFare) || 0) + Number(settings.cardProcessingFee || 3000)

                      return (
                        <div
                          key={gIdx}
                          className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                        >
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                              Flight Time(s) (e.g. 03:05 PM, 04:40 PM)
                            </label>
                            <input
                              type="text"
                              placeholder="03:05 PM, 04:40 PM, 08:00 PM"
                              value={group.timesInput || ''}
                              onChange={(e) =>
                                updateFareGroup('outbound', aIdx, gIdx, 'timesInput', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-ocean-500"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                              Base Fare (₦)
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="105000"
                              value={group.baseFare || ''}
                              onChange={(e) =>
                                updateFareGroup('outbound', aIdx, gIdx, 'baseFare', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-ocean-500"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <div className="text-[10px] font-bold text-slate-400">
                              Auto Total (+₦{formatMoney(settings.cardProcessingFee)})
                            </div>
                            <div className="text-xs font-black text-ocean-700">
                              {group.baseFare !== '' && group.baseFare !== undefined && group.baseFare !== null && Number(group.baseFare) > 0 ? (
                                `= ₦${formatMoney(calculatedTotal)}`
                              ) : (
                                <span className="text-slate-400 font-normal italic">Enter fare</span>
                              )}
                            </div>
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            {airline.fareGroups.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFareGroup('outbound', aIdx, gIdx)}
                                className="text-slate-400 hover:text-rose-500 p-1"
                              >
                                <Lucide.X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    <button
                      type="button"
                      onClick={() => addFareGroup('outbound', aIdx)}
                      className="text-[11px] font-bold text-ocean-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Lucide.Plus size={12} />
                      <span>Add Different Fare for this Airline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Inbound Options (if return) */}
          {formData.tripType === 'return' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Lucide.PlaneLanding size={16} className="text-purple-600" />
                    Inbound: {formData.destinationCity || 'Destination'} → {formData.originCity || 'Departure'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Card fee (₦{formatMoney(settings.cardProcessingFee)}) auto-calculated for each inbound option.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addAirline('return')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start shadow-sm transition-all"
                >
                  <Lucide.Plus size={14} />
                  <span>Add Inbound Airline</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.returnFlights.map((airline, aIdx) => (
                  <div key={aIdx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 max-w-sm">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Airline Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Air Peace"
                          value={airline.airlineName}
                          onChange={(e) => updateAirlineName('return', aIdx, e.target.value)}
                          onBlur={(e) => updateAirlineName('return', aIdx, formatAirlineName(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-ocean-500"
                        />
                      </div>

                      <div className="hidden sm:flex flex-wrap items-center gap-1">
                        {POPULAR_AIRLINES.slice(0, 3).map((al) => (
                          <button
                            key={al}
                            type="button"
                            onClick={() => updateAirlineName('return', aIdx, al)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded"
                          >
                            {al}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAirline('return', aIdx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Remove Airline"
                      >
                        <Lucide.Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {airline.fareGroups.map((group, gIdx) => {
                        const calculatedTotal =
                          (Number(group.baseFare) || 0) + Number(settings.cardProcessingFee || 3000)

                        return (
                          <div
                            key={gIdx}
                            className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                          >
                            <div className="sm:col-span-5">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Flight Time(s) (e.g. 10:35 AM, 02:40 PM)
                              </label>
                              <input
                                type="text"
                                placeholder="10:35 AM, 02:40 PM"
                                value={group.timesInput || ''}
                                onChange={(e) =>
                                  updateFareGroup('return', aIdx, gIdx, 'timesInput', e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-ocean-500"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Base Fare (₦)
                              </label>
                              <input
                                type="number"
                                min="0"
                                placeholder="240100"
                                value={group.baseFare || ''}
                                onChange={(e) =>
                                  updateFareGroup('return', aIdx, gIdx, 'baseFare', e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-ocean-500"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <div className="text-[10px] font-bold text-slate-400">
                                Auto Total (+₦{formatMoney(settings.cardProcessingFee)})
                              </div>
                              <div className="text-xs font-black text-purple-700">
                                {group.baseFare !== '' && group.baseFare !== undefined && group.baseFare !== null && Number(group.baseFare) > 0 ? (
                                  `= ₦${formatMoney(calculatedTotal)}`
                                ) : (
                                  <span className="text-slate-400 font-normal italic">Enter fare</span>
                                )}
                              </div>
                            </div>

                            <div className="sm:col-span-1 flex justify-end">
                              {airline.fareGroups.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFareGroup('return', aIdx, gIdx)}
                                  className="text-slate-400 hover:text-rose-500 p-1"
                                >
                                  <Lucide.X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      <button
                        type="button"
                        onClick={() => addFareGroup('return', aIdx)}
                        className="text-[11px] font-bold text-purple-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Lucide.Plus size={12} />
                        <span>Add Different Fare for this Airline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Automatic Service Charge Summary */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-black">
                ₦
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  D.Narai Service Charge (Auto-Calculated)
                </h4>
                <p className="text-xs text-amber-800 font-medium mt-0.5">
                  ₦{formatMoney(currentServiceCharge.perPerson)} per person for a{' '}
                  {formData.tripType === 'return' ? 'two-way' : 'one-way'} local ticket
                  {currentServiceCharge.count > 1 &&
                    ` × ${currentServiceCharge.count} passengers`}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right font-black text-sm text-amber-900 bg-white/80 px-4 py-2 rounded-xl border border-amber-200">
              Total: ₦{formatMoney(currentServiceCharge.total)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveToTemp}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Keep in Session
              </button>
              <button
                type="button"
                onClick={handlePreviewQuotation}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Lucide.MessageSquare size={16} />
                <span>Preview & Send WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* WHATSAPP PREVIEW MODAL */}
      <Modal
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="WhatsApp Message Preview"
      >
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                <Lucide.MessageSquare size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Recipient: <span className="font-black">{formData.clientName || 'Client'}</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-medium">
                  WhatsApp: <span className="font-mono font-bold">{formData.clientPhone || 'None'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyMessage}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border',
                copiedSuccess
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              )}
            >
              {copiedSuccess ? <Lucide.Check size={14} /> : <Lucide.Copy size={14} />}
              <span>{copiedSuccess ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>

          <div className="bg-slate-800 p-4 sm:p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-700 pb-2">
              <span className="font-bold uppercase tracking-wider text-emerald-400">
                WhatsApp Live Preview
              </span>
              <span>Ready to Send</span>
            </div>

            <div className="bg-[#e7fedb] text-slate-900 p-4 rounded-2xl rounded-tr-none shadow-sm whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed border border-emerald-200">
              {previewText}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsPreviewModalOpen(false)
                setIsFormModalOpen(true)
              }}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Back to Edit
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Lucide.Copy size={15} />
                <span>Copy Text</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp()}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Lucide.Send size={15} />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Quotation & Fee Configuration"
      >
        <form onSubmit={handleSaveSettings} className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-slate-500">
            Configure default card processing fees, service charges, disclaimer text, and WhatsApp signature. Stored locally without requiring database writes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Card Processing Fee (₦)
              </label>
              <input
                type="number"
                min="0"
                required
                value={settings.cardProcessingFee}
                onChange={(e) =>
                  setSettings({ ...settings, cardProcessingFee: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-ocean-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: ₦3,000</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                One-Way Service Charge (₦)
              </label>
              <input
                type="number"
                min="0"
                required
                value={settings.serviceChargeOneWay}
                onChange={(e) =>
                  setSettings({ ...settings, serviceChargeOneWay: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-ocean-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Per person (₦5,000)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inbound Service Charge (₦)
              </label>
              <input
                type="number"
                min="0"
                required
                value={settings.serviceChargeReturn}
                onChange={(e) =>
                  setSettings({ ...settings, serviceChargeReturn: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-ocean-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Per person (₦10,000)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Disclaimer Note (Appears below quotation)
            </label>
            <textarea
              rows="3"
              value={settings.disclaimerText}
              onChange={(e) => setSettings({ ...settings, disclaimerText: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              WhatsApp Signature / Footer Text
            </label>
            <textarea
              rows="3"
              value={settings.footerText}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-ocean-600 text-white rounded-xl text-xs font-black hover:bg-ocean-700 shadow-md transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
