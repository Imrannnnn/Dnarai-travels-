import { useState, useEffect, useMemo } from 'react'
import * as Lucide from 'lucide-react'
import clsx from 'clsx'
import {
  fetchDuties,
  createDuty,
  deleteDuty,
  fetchOnDutyStaff,
  triggerDailyBriefing,
} from '../../data/api'
import { isSuperAdminUser } from '../../utils/superAdmin'

function formatDateYMD(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DutyManagementView({ staffMembers = [] }) {
  const [duties, setDuties] = useState([])
  const [onDutyStaff, setOnDutyStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [briefingSending, setBriefingSending] = useState(false)
  const [activeStatusFilter, setActiveStatusFilter] = useState('all') // all | pending | completed | overdue | cancelled
  const [staffFilter, setStaffFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Duty Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [dutyTitle, setDutyTitle] = useState('')
  const [dutyDescription, setDutyDescription] = useState('')
  const [dueDate, setDueDate] = useState(() => formatDateYMD(new Date()))
  const [dueTime, setDueTime] = useState('17:00')
  const [priority, setPriority] = useState('medium')
  const [assignmentMode, setAssignmentMode] = useState('on_duty') // on_duty | specific
  const [selectedStaffIds, setSelectedStaffIds] = useState([])
  const [sendPush, setSendPush] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load duties and on-duty list
  const loadData = async () => {
    setLoading(true)
    try {
      const todayYmd = formatDateYMD(new Date())
      const [dutyRes, onDutyRes] = await Promise.all([
        fetchDuties(),
        fetchOnDutyStaff({ date: todayYmd }),
      ])
      if (dutyRes?.ok) setDuties(dutyRes.duties || [])
      if (onDutyRes?.ok) setOnDutyStaff(onDutyRes.onDuty || [])
    } catch (err) {
      console.error('Failed to load duty data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // When date changes in create duty modal, re-check who is on duty for that date
  const [modalOnDutyStaff, setModalOnDutyStaff] = useState([])
  useEffect(() => {
    if (!isCreateModalOpen) return
    const fetchModalOnDuty = async () => {
      try {
        const res = await fetchOnDutyStaff({ date: dueDate })
        if (res?.ok) {
          setModalOnDutyStaff(res.onDuty || [])
          if (assignmentMode === 'on_duty') {
            // Default select all on duty
            setSelectedStaffIds(res.onDuty.map((item) => String(item.user._id)))
          }
        }
      } catch (err) {
        console.error('Failed to query on-duty for date:', err)
      }
    }
    fetchModalOnDuty()
  }, [dueDate, isCreateModalOpen, assignmentMode])

  // Filtered duties
  const filteredDuties = useMemo(() => {
    return duties.filter((d) => {
      if (activeStatusFilter !== 'all' && d.displayStatus !== activeStatusFilter) return false
      if (staffFilter) {
        const hasStaff = d.assignments?.some((a) => String(a.staffId?._id || a.staffId) === String(staffFilter))
        if (!hasStaff) return false
      }
      if (searchQuery) {
        const matchTitle = d.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchDesc = d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchTitle && !matchDesc) return false
      }
      return true
    })
  }, [duties, activeStatusFilter, staffFilter, searchQuery])

  // Open modal handler
  const handleOpenCreateModal = () => {
    setDutyTitle('')
    setDutyDescription('')
    setDueDate(formatDateYMD(new Date()))
    setDueTime('17:00')
    setPriority('medium')
    setAssignmentMode('on_duty')
    setSelectedStaffIds(onDutyStaff.map((item) => String(item.user._id)))
    setSendPush(true)
    setSendEmail(true)
    setIsCreateModalOpen(true)
  }

  // Toggle staff selection
  const toggleStaffSelect = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    )
  }

  // Handle duty submission
  const handleCreateDuty = async (e) => {
    e.preventDefault()
    if (!dutyTitle.trim()) return alert('Please enter a duty title')
    if (selectedStaffIds.length === 0) {
      return alert('Please select at least one staff recipient for this duty')
    }

    setSubmitting(true)
    try {
      const payload = {
        title: dutyTitle.trim(),
        description: dutyDescription.trim(),
        dueDate,
        dueTime,
        priority,
        assignmentType: assignmentMode,
        staffIds: selectedStaffIds,
        sendPush,
        sendEmail,
      }

      const res = await createDuty({ dutyData: payload })
      if (res?.ok) {
        setIsCreateModalOpen(false)
        await loadData()
      } else {
        alert(res?.message || 'Failed to create duty')
      }
    } catch (err) {
      alert(err.message || 'Error creating duty')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete duty handler
  const handleDeleteDuty = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and delete this duty?')) return
    try {
      const res = await deleteDuty({ id })
      if (res?.ok) {
        await loadData()
      }
    } catch (err) {
      alert(err.message || 'Failed to delete duty')
    }
  }

  // Trigger daily briefing manual dispatch
  const handleTriggerBriefing = async () => {
    if (!window.confirm('Send daily operational briefing notification now to all on-duty staff and administrators?')) return
    setBriefingSending(true)
    try {
      const res = await triggerDailyBriefing()
      if (res?.ok) {
        alert(
          `✅ Daily Briefing Dispatched!\n\n` +
          `• Slot: ${res.slot === 'morning' ? 'Morning Briefing' : 'Afternoon Review'}\n` +
          `• Staff Notified: ${res.staffNotifiedCount}/${res.onDutyStaffCount} on duty\n` +
          `• Admins Notified: ${res.adminsNotifiedCount}\n` +
          `• Flights Today: ${res.travelsCount}\n` +
          `• Pending Tasks: ${res.pendingTasksCount}`
        )
      } else {
        alert(res?.message || 'Failed to dispatch daily briefing')
      }
    } catch (err) {
      console.error('Failed to trigger daily briefing:', err)
      alert(err.message || 'Error dispatching daily briefing')
    } finally {
      setBriefingSending(false)
    }
  }

  // Priority color badge helper
  const getPriorityBadge = (p) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      case 'low':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    }
  }

  // Status color badge helper
  const getStatusBadge = (s) => {
    switch (s) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200'
      case 'overdue':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 animate-pulse'
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200'
      case 'cancelled':
        return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200'
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          {[
            { id: 'all', label: 'All Duties' },
            { id: 'pending', label: 'Pending' },
            { id: 'completed', label: 'Completed' },
            { id: 'overdue', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusFilter(tab.id)}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                activeStatusFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-ocean-600 dark:text-ocean-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Staff Filter, Create Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Lucide.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search duties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 text-slate-800 dark:text-white w-40 sm:w-48"
            />
          </div>

          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Staff</option>
            {staffMembers.filter(s => !isSuperAdminUser(s)).map((s) => (
              <option key={s._id} value={s._id}>
                {s.name || s.email.split('@')[0]}
              </option>
            ))}
          </select>

          <button
            onClick={handleTriggerBriefing}
            disabled={briefingSending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            title="Send the daily briefing push and email to on-duty staff and admin now"
          >
            <Lucide.Send size={14} className={clsx(briefingSending && 'animate-pulse text-ocean-600')} />
            <span>{briefingSending ? 'Dispatching...' : 'Dispatch Briefing'}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            <Lucide.Plus size={16} />
            <span>Create Duty</span>
          </button>
        </div>
      </div>

      {/* DUTIES LEDGER & HISTORY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lucide.ClipboardList size={18} className="text-ocean-600" />
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white font-display">
              Operational Duties Ledger
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500">
              {filteredDuties.length} Duties
            </span>
          </div>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh duties"
          >
            <Lucide.RotateCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Lucide.Loader2 size={36} className="animate-spin mx-auto mb-2 text-ocean-600" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Loading duty tasks...</p>
          </div>
        ) : filteredDuties.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Lucide.CheckCircle2 size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No duties found</p>
            <p className="text-xs text-slate-400 mt-0.5">Click &quot;Create Duty&quot; above to assign a new operational task.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDuties.map((duty) => {
              const priorityClass = getPriorityBadge(duty.priority)
              const overallStatusClass = getStatusBadge(duty.displayStatus)

              return (
                <div
                  key={duty._id}
                  className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Duty Details */}
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border', priorityClass)}>
                        {duty.priority}
                      </span>
                      <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border', overallStatusClass)}>
                        {duty.displayStatus}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Lucide.Clock size={13} />
                        Due {duty.dueDate} at {duty.dueTime}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {duty.title}
                    </h4>

                    {duty.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {duty.description}
                      </p>
                    )}

                    {/* ASSIGNMENTS PER STAFF (Requirement 22: Individual tracking) */}
                    <div className="pt-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Assigned Staff Members & Individual Completion:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {duty.assignments && duty.assignments.length > 0 ? (
                          duty.assignments.map((assign) => {
                            const staff = assign.staffId
                            const staffColor = staff?.color || '#2563EB'
                            const staffName = staff?.name || staff?.email?.split('@')[0] || 'Staff'
                            const isDone = assign.status === 'completed'
                            const isAssignOverdue = assign.effectiveStatus === 'overdue'

                            return (
                              <div
                                key={assign._id}
                                className="flex flex-col gap-1 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-xs max-w-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: staffColor }}
                                  />
                                  <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                    {staffName}
                                  </span>

                                  {isDone ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md shrink-0">
                                      <Lucide.Check size={11} strokeWidth={3} />
                                      <span>Done {assign.completedAt ? `(${new Date(assign.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                                    </span>
                                  ) : isAssignOverdue ? (
                                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md shrink-0">
                                      Overdue
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md shrink-0">
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {assign.notes && (
                                  <div className="mt-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 italic border-l-2 border-ocean-500 leading-snug">
                                    <span className="font-bold not-italic text-slate-700 dark:text-slate-200">Note: </span>
                                    &quot;{assign.notes}&quot;
                                  </div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-xs text-slate-400 italic">No staff assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handleDeleteDuty(duty._id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete duty"
                    >
                      <Lucide.Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* CREATE DUTY MODAL */}
      {/* ============================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-ocean-100 dark:bg-ocean-950 flex items-center justify-center text-ocean-600 dark:text-ocean-400">
                  <Lucide.Send size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white font-display">
                    Assign New Duty
                  </h3>
                  <p className="text-xs text-slate-400">Dynamic assignment & notifications</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDuty} className="space-y-4 py-4 max-h-[72vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                  Duty Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Check inventory before 4 PM"
                  value={dutyTitle}
                  onChange={(e) => setDutyTitle(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ocean-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                  Detailed Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide step-by-step instructions or requirements..."
                  value={dutyDescription}
                  onChange={(e) => setDutyDescription(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              {/* Date & Time & Priority */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    required
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Assignment Mode (Requirement 7 & 8: Dynamic vs Manual) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Assign To
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentMode('on_duty')
                      setSelectedStaffIds(modalOnDutyStaff.map((item) => String(item.user._id)))
                    }}
                    className={clsx(
                      'p-2.5 rounded-xl border text-left transition-all',
                      assignmentMode === 'on_duty'
                        ? 'border-ocean-500 bg-ocean-50/60 dark:bg-ocean-950/40 text-ocean-700 dark:text-ocean-300 ring-2 ring-ocean-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="text-xs font-black">Staff on Duty ({modalOnDutyStaff.length})</div>
                    <div className="text-[10px] opacity-75 mt-0.5">Auto-detected for {dueDate}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentMode('specific')}
                    className={clsx(
                      'p-2.5 rounded-xl border text-left transition-all',
                      assignmentMode === 'specific'
                        ? 'border-ocean-500 bg-ocean-50/60 dark:bg-ocean-950/40 text-ocean-700 dark:text-ocean-300 ring-2 ring-ocean-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="text-xs font-black">Specific Staff</div>
                    <div className="text-[10px] opacity-75 mt-0.5">Manual selection</div>
                  </button>
                </div>

                {/* Staff Selection Pills */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    {assignmentMode === 'on_duty' ? 'On-Duty Staff Members for Selected Date:' : 'Choose Staff Members:'}
                  </div>

                  {assignmentMode === 'on_duty' && modalOnDutyStaff.length === 0 ? (
                    <div className="text-xs text-amber-600 dark:text-amber-400 py-1">
                      ⚠️ No staff are scheduled on duty for {dueDate}. Switch to &quot;Specific Staff&quot; to assign manually.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(assignmentMode === 'on_duty' ? modalOnDutyStaff.map(i => i.user) : staffMembers.filter(s => !isSuperAdminUser(s))).map((s) => {
                        const sId = String(s._id)
                        const selected = selectedStaffIds.includes(sId)
                        const staffColor = s.color || '#2563EB'
                        const name = s.name || s.email.split('@')[0]

                        return (
                          <button
                            key={sId}
                            type="button"
                            onClick={() => toggleStaffSelect(sId)}
                            className={clsx(
                              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                              selected
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border-slate-300 dark:border-slate-600'
                                : 'bg-transparent text-slate-400 border-transparent opacity-60 hover:opacity-100'
                            )}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: staffColor }}
                            />
                            <span>{name}</span>
                            {selected ? (
                              <Lucide.Check size={12} className="text-emerald-500" />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Channels Preview (Requirement 29: Notification Preview) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-ocean-50 to-indigo-50 dark:from-ocean-950/40 dark:to-indigo-950/40 border border-ocean-200 dark:border-ocean-800 space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-ocean-900 dark:text-ocean-300 flex items-center justify-between">
                  <span>Notification Preview</span>
                  <span className="text-[10px] text-ocean-700 dark:text-ocean-400 font-bold">
                    {selectedStaffIds.length} Recipient(s)
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-ocean-100 dark:border-slate-800">
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    📋 {dutyTitle || 'Duty Title'}
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    Due: {dueDate} at {dueTime} • Priority: {priority.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={sendPush}
                      onChange={(e) => setSendPush(e.target.checked)}
                      className="h-4 w-4 rounded-sm text-ocean-600"
                    />
                    <span>Web Push Notification</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4 rounded-sm text-ocean-600"
                    />
                    <span>Email Notification</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Duty & Send Alerts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
