import PageHeader from '../components/PageHeader'
import DocumentCard from '../components/DocumentCard'
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
  const { documents, passenger, uploadPassport, triggerOverlay, updatePassengerProfile } = useAppData()
  const { user } = useAuth()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    fullName: passenger?.fullName || '',
    phone: passenger?.phone || ''
  })

  // Update edit form data when passenger loads
  useEffect(() => {
    if (passenger) {
      setEditFormData({
        fullName: passenger.fullName || '',
        phone: passenger.phone || ''
      })
    }
  }, [passenger])

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

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1600px] space-y-10 pb-20">
      <PageHeader
        title="Personal Profile"
        subtitle="Manage your identity, travel documents, and elite preferences."
      />

      {!passenger && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700 bg-gradient-to-r from-ocean-600 to-indigo-600 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">Account Not Linked</h3>
              <p className="text-ocean-100 font-medium max-w-xl">
                Your login is not yet connected to a passenger identity. Link your account now to enable booking requests and itinerary management.
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-black text-ocean-700 shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <Lucide.Link size={18} />
              <span>Link Account Now</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-8">
          <section className="rounded-[2.5rem] border border-sand-200/60 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 p-1 shadow-lg shadow-ocean-500/30">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900 text-2xl font-black text-slate-900 dark:text-white uppercase font-display">
                    {initials}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-green-500 border-4 border-white dark:border-slate-900" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic font-display">{name}</h2>
                <div className="mt-1 inline-flex rounded-full bg-ocean-50 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-ocean-700 dark:bg-ocean-900/30 dark:text-ocean-400">
                  {passenger?.membership || 'Member'}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase">Account Status</span>
                <span className="text-xs font-black text-green-600 uppercase">Verified</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase">Role</span>
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase italic">{user?.role}</span>
              </div>
            </div>
          </section>

          <div className="rounded-[2rem] bg-slate-900 p-8 text-white overflow-hidden relative group premium-shadow border border-slate-800">
            <div className="absolute top-0 right-0 w-40 h-40 bg-ocean-500/20 blur-3xl -mr-10 -mt-10 group-hover:bg-ocean-500/30 transition-colors" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-coral-500/10 blur-3xl -ml-10 -mb-10" />

            <h3 className="text-sm font-black uppercase tracking-widest mb-4 italic font-display relative z-10">Elite Support</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium relative z-10">
              Need assistance with your premium itinerary? Our dedicated concierge is available 24/7.
            </p>
            <button className="w-full rounded-2xl bg-white py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-ocean-50 transition-colors relative z-10">
              Contact Concierge
            </button>
          </div>
        </aside>

        <div className="space-y-8">
          <section className="rounded-[2.5rem] border border-sand-200/60 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 rounded-full bg-slate-900 dark:bg-white" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Identity Details</h3>
              </div>
              <button
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                className={clsx(
                  "text-[10px] font-black uppercase py-1.5 px-4 rounded-full border transition-all",
                  isEditing
                    ? "bg-ocean-600 border-ocean-600 text-white hover:bg-ocean-700"
                    : "text-ocean-600 border-ocean-600/20 hover:bg-ocean-50"
                )}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-sand-100 bg-sand-50/30 p-4 dark:border-slate-800/50 dark:bg-slate-950/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</div>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full bg-transparent border-b border-ocean-500/50 focus:border-ocean-500 text-sm font-bold text-slate-900 dark:text-white outline-none"
                    value={editFormData.fullName}
                    onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  />
                ) : (
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{passenger?.fullName || name}</div>
                )}
              </div>
              <div className="rounded-2xl border border-sand-100 bg-sand-50/30 p-4 dark:border-slate-800/50 dark:bg-slate-950/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</div>
                <div className="text-sm font-bold text-slate-400 truncate cursor-not-allowed">{user?.email}</div>
              </div>
              <div className="rounded-2xl border border-sand-100 bg-sand-50/30 p-4 dark:border-slate-800/50 dark:bg-slate-950/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp Number</div>
                {isEditing ? (
                  <input
                    type="tel"
                    className="w-full bg-transparent border-b border-ocean-500/50 focus:border-ocean-500 text-sm font-bold text-slate-900 dark:text-white outline-none"
                    value={editFormData.phone}
                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                ) : (
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{passenger?.phone || 'Not provided'}</div>
                )}
              </div>
              <div className="rounded-2xl border border-sand-100 bg-sand-50/30 p-4 dark:border-slate-800/50 dark:bg-slate-950/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Member Since</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">February 2026</div>
              </div>
            </div>
            {isEditing && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>

          <section className="rounded-[2.5rem] border border-sand-200/60 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 rounded-full bg-ocean-600" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Security & Privacy</h3>
              </div>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-ocean-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-ocean-500/20 outline-none transition-all"
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
                Update Security Settings
              </ActionButton>
            </form>
          </section>

          {user?.role === 'passenger' && (
            <section className="rounded-[2.5rem] border border-sand-200/60 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 rounded-full bg-coral-500" />
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Verified Documents</h3>
                </div>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="text-[10px] font-black uppercase text-ocean-600 py-1.5 px-4 rounded-full border border-ocean-600/20 hover:bg-ocean-50 transition-colors"
                >
                  Upload New
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {documents.length > 0 ? (
                  documents.map((d) => <DocumentCard key={d.id} doc={d} />)
                ) : (
                  <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No documents verified yet</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <PassportUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={uploadPassport}
      />
    </div >
  )
}
