import PageHeader from '../components/PageHeader'
import clsx from 'clsx'
import * as Lucide from 'lucide-react'
import PassportUploadModal from '../components/PassportUploadModal'
import { useState, useEffect } from 'react'
import { useAppData } from '../data/AppDataContext'
import { useAuth } from '../data/AuthContext'
import { getApiBaseUrl } from '../data/api'
import ActionButton from '../components/ActionButton'

const FallbackIcon = () => null
const ShieldCheck = Lucide.ShieldCheck || FallbackIcon

export default function ProfilePage() {
  const { passenger, uploadPassport, triggerOverlay, updatePassengerProfile, updateFrequentFlyers } = useAppData()
  const { user } = useAuth()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    fullName: passenger?.fullName || '',
    phone: passenger?.phone || ''
  })

  const [frequentFlyers, setFrequentFlyers] = useState([])
  const [newAirline, setNewAirline] = useState('')
  const [newNumber, setNewNumber] = useState('')

  // Update edit form data when passenger loads
  useEffect(() => {
    if (passenger) {
      setEditFormData({
        fullName: passenger.fullName || '',
        phone: passenger.phone || ''
      })
      if (passenger.frequentFlyerNumbers) {
        setFrequentFlyers(passenger.frequentFlyerNumbers)
      }
    }
  }, [passenger])

  const handleAddFrequentFlyer = async (e) => {
    if (e) e.preventDefault()
    if (!newAirline.trim() || !newNumber.trim()) return

    const updatedList = [...frequentFlyers, { airlineName: newAirline.trim(), frequentFlyerNumber: newNumber.trim() }]
    
    triggerOverlay('Adding Frequent Flyer Account...', async () => {
      await updateFrequentFlyers(updatedList)
      setNewAirline('')
      setNewNumber('')
    })
  }

  const handleRemoveFrequentFlyer = async (indexToRemove) => {
    const updatedList = frequentFlyers.filter((_, idx) => idx !== indexToRemove)
    
    triggerOverlay('Removing Frequent Flyer Account...', async () => {
      await updateFrequentFlyers(updatedList)
    })
  }

  const handleSaveProfile = async () => {
    triggerOverlay('Updating Profile...', async () => {
      await updatePassengerProfile(editFormData)
      setIsEditing(false)
    })
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })

  const name = passenger?.name || user?.email || 'N/A'
  const initials = name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  const handlePasswordChange = async (e) => {
    if (e) e.preventDefault()
    setMessage({ text: '', type: '' })

    triggerOverlay('Updating Security Key...', async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to change password')

      setMessage({ text: 'Password updated successfully!', type: 'success' })
      setCurrentPassword('')
      setNewPassword('')
    })
  }

  const tabs = [
    { id: 'identity', label: 'Identity', icon: Lucide.User },
    ...(user?.role === 'passenger' ? [
      { id: 'passport', label: 'Passport', icon: Lucide.FileText },
      { id: 'flyers', label: 'Frequent Flyer', icon: Lucide.Plane },
    ] : []),
    { id: 'security', label: 'Security', icon: Lucide.Lock }
  ]

  const [activeTab, setActiveTab] = useState('identity')

  const renderEliteSupport = () => (
    <div className="rounded-2xl md:rounded-3xl bg-slate-900 p-4 md:p-6 text-white overflow-hidden relative group premium-shadow border border-slate-800">
      <div className="absolute top-0 right-0 w-40 h-40 bg-ocean-500/20 blur-3xl -mr-10 -mt-10 group-hover:bg-ocean-500/30 transition-colors pointer-events-none" />
      <h3 className="text-sm font-black uppercase tracking-widest mb-3 italic font-display relative z-10">Elite Support</h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-4 font-medium relative z-10">
        Need assistance with your premium itinerary? Our dedicated support team is available.
      </p>
      <div className="relative z-10 space-y-3">
        <a
          href="tel:+2349131315886"
          className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group/link"
        >
          <div className="h-8 w-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
            <Lucide.Phone size={14} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Concierge 1</div>
            <div className="text-xs font-bold text-slate-200">+234 913 131 5886</div>
          </div>
        </a>
        <a
          href="tel:+2348166698589"
          className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group/link"
        >
          <div className="h-8 w-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
            <Lucide.Phone size={14} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Concierge 2</div>
            <div className="text-xs font-bold text-slate-200">+234 816 669 8589</div>
          </div>
        </a>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-7xl space-y-4 md:space-y-6 pb-20">
      <PageHeader
        title="Personal Profile"
        subtitle="Manage your identity, travel documents, and elite preferences."
      />

      {!passenger && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700 bg-gradient-to-r from-ocean-600 to-indigo-600 rounded-3xl p-6 text-white shadow-premium relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tight">Account Not Linked</h3>
              <p className="text-ocean-100 text-xs font-medium max-w-xl">
                Your login is not yet connected to a passenger identity. Link your account now to enable booking requests and itinerary management.
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-black text-ocean-700 shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <Lucide.Link size={14} />
              <span>Link Account Now</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_2.5fr]">
        {/* Left Sidebar */}
        <aside className="space-y-4 md:space-y-6">
          <section className="rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 p-1 shadow-lg shadow-ocean-500/30">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900 text-2xl font-black text-slate-900 dark:text-white uppercase font-display">
                    {initials}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-green-500 border-4 border-white dark:border-slate-900" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase italic font-display">{name}</h2>
                <div className="mt-1 inline-flex rounded-full bg-ocean-50 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-ocean-700 dark:bg-ocean-900/30 dark:text-ocean-400">
                  {passenger?.membership || 'Member'}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase">Account Status</span>
                <span className="text-xs font-black text-green-600 uppercase">Verified</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase">Role</span>
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase italic">{user?.role}</span>
              </div>
            </div>
          </section>

          {/* Elite Support Section updated with the phone contacts - Desktop only */}
          <div className="hidden lg:block">
            {renderEliteSupport()}
          </div>
        </aside>

        {/* Right Tabbed Content */}
        <div className="rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          {/* Segmented Tab Headers */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:border-b sm:border-slate-200 dark:sm:border-slate-800 mb-6 pb-px">
            {tabs.map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap outline-none rounded-xl sm:rounded-none sm:border-b-2",
                    isActive
                      ? "bg-ocean-600 text-white sm:bg-transparent sm:border-ocean-600 sm:text-ocean-600 dark:sm:border-ocean-400 dark:sm:text-ocean-400 font-black"
                      : "bg-slate-50 text-slate-400 hover:text-slate-600 sm:bg-transparent sm:border-transparent dark:bg-slate-900/50 dark:sm:bg-transparent"
                  )}
                >
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* TAB 1: Identity Details */}
          {activeTab === 'identity' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Identity Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Verify your profile coordinates and contact information.</p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="self-start sm:self-auto text-[10px] font-black uppercase py-1.5 px-4 rounded-full border border-ocean-600/20 text-ocean-600 hover:bg-ocean-50 transition-all"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 md:p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500/20 outline-none transition-all"
                      value={editFormData.fullName}
                      onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm font-bold text-slate-900 dark:text-white break-all">{passenger?.fullName || name}</div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 md:p-4 dark:border-slate-800/50 dark:bg-slate-950/30 min-w-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</div>
                  <div className="text-sm font-bold text-slate-400 break-all cursor-not-allowed">{user?.email}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 md:p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp Number</div>
                  {isEditing ? (
                    <input
                      type="tel"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500/20 outline-none transition-all"
                      value={editFormData.phone}
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm font-bold text-slate-900 dark:text-white break-all">{passenger?.phone || 'Not provided'}</div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 md:p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Member Since</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">February 2026</div>
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-ocean-600 hover:bg-ocean-700 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95"
                  >
                    <Lucide.Save size={14} />
                    <span>Save Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-all active:scale-95"
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Verified Passport Details */}
          {activeTab === 'passport' && user?.role === 'passenger' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Verified Passport Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Verify or upload your government issued travel documents.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="text-[10px] font-black uppercase text-ocean-600 py-1.5 px-4 rounded-full border border-ocean-600/20 hover:bg-ocean-50 transition-colors"
                >
                  {passenger?.passportNumber ? 'Update Details' : 'Fill Details'}
                </button>
              </div>

              {passenger?.passportNumber ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Name on Passport</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{passenger.passportName || 'N/A'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Passport Number</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {'**** ' + passenger.passportNumber.slice(-4)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Country of Issue</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{passenger.passportCountryIssue || 'N/A'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Birth (DOB)</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {passenger.passportDob ? new Date(passenger.passportDob).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Date</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {passenger.passportIssueDate ? new Date(passenger.passportIssueDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-950/30">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiry Date</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {passenger.passportExpiryDate ? new Date(passenger.passportExpiryDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">No passport details filled yet</p>
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="text-[10px] font-black uppercase text-white bg-ocean-600 hover:bg-ocean-700 py-2 px-6 rounded-xl shadow-md transition-all"
                  >
                    Provide Details
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Frequent Flyer Accounts */}
          {activeTab === 'flyers' && user?.role === 'passenger' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Frequent Flyer Accounts</h3>
                <p className="text-xs text-slate-500 font-medium">Link your frequent flyer programs for automatic integration.</p>
              </div>

              {frequentFlyers.length > 0 ? (
                <div className="grid gap-3 mb-6">
                  {frequentFlyers.map((ff, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl dark:border-slate-800/50 dark:bg-slate-950/30">
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Airline</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{ff.airlineName}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Flyer Number</div>
                          <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">{ff.frequentFlyerNumber}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFrequentFlyer(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-all"
                          title="Remove Account"
                        >
                          <Lucide.Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No frequent flyer accounts registered</p>
                </div>
              )}

              <form onSubmit={handleAddFrequentFlyer} className="bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Register New Account</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Airline Name</label>
                    <input
                      type="text"
                      list="airlines-list"
                      required
                      value={newAirline}
                      onChange={e => setNewAirline(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-ocean-500/20 outline-none transition-all dark:text-white"
                      placeholder="e.g. Emirates"
                    />
                    <datalist id="airlines-list">
                      <option value="Emirates" />
                      <option value="Qatar Airways" />
                      <option value="British Airways" />
                      <option value="Delta Air Lines" />
                      <option value="United Airlines" />
                      <option value="Lufthansa" />
                      <option value="Singapore Airlines" />
                      <option value="Air France" />
                      <option value="KLM Royal Dutch Airlines" />
                      <option value="Turkish Airlines" />
                      <option value="Ethiopian Airlines" />
                      <option value="EgyptAir" />
                      <option value="RwandAir" />
                      <option value="Kenya Airways" />
                      <option value="Air Peace" />
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Frequent Flyer Number</label>
                    <input
                      type="text"
                      required
                      value={newNumber}
                      onChange={e => setNewNumber(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-ocean-500/20 outline-none transition-all dark:text-white font-mono"
                      placeholder="e.g. EK1234567"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-ocean-600 hover:bg-ocean-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95"
                >
                  <Lucide.Plus size={16} />
                  <span>Add Account</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: Security & Privacy */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Security Settings</h3>
                <p className="text-xs text-slate-500 font-medium">Update your security passkeys and login parameters.</p>
              </div>

              <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                {message.text && (
                  <div className={clsx(
                    "p-4 rounded-xl text-xs font-bold uppercase tracking-widest border",
                    message.type === 'success' ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"
                  )}>
                    {message.text}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-ocean-500/20 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-ocean-500/20 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>
                <ActionButton
                  onClick={handlePasswordChange}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 !rounded-xl !text-[10px]"
                  loadingMessage="Securing..."
                  successMessage="Password Updated"
                  icon={ShieldCheck}
                >
                  Update Password
                </ActionButton>
              </form>
            </div>
          )}
        </div>

        {/* Elite Support Section - Mobile only */}
        <div className="block lg:hidden">
          {renderEliteSupport()}
        </div>
      </div>

      <PassportUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={uploadPassport}
        passenger={passenger}
      />
    </div>
  )
}
