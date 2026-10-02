import { useState, useEffect, useMemo } from 'react'
import * as Lucide from 'lucide-react'
import clsx from 'clsx'
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  updateStaffColor,
  fetchOnDutyStaff,
  fetchStaffMembers,
} from '../../data/api'
import { useAuth } from '../../data/AuthContext'
import { isSuperAdminUser } from '../../utils/superAdmin'

const PRESET_COLORS = [
  '#2563EB', // Ocean Blue
  '#0D9488', // Teal
  '#7C3AED', // Purple
  '#EA580C', // Orange
  '#E11D48', // Rose / Red
  '#059669', // Emerald
  '#D97706', // Amber
  '#4F46E5', // Indigo
  '#0891B2', // Cyan
  '#BE185D', // Deep Pink
]

const DAYS = [
  { key: 'monday', label: 'Mon', full: 'Monday' },
  { key: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { key: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { key: 'thursday', label: 'Thu', full: 'Thursday' },
  { key: 'friday', label: 'Fri', full: 'Friday' },
  { key: 'saturday', label: 'Sat', full: 'Saturday' },
  { key: 'sunday', label: 'Sun', full: 'Sunday' },
]

function getStartOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(date.setDate(diff))
}

function addDays(d, days) {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

function formatDateYMD(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function SpreadsheetScheduleView({ staffMembers: initialStaffMembers = [], onReloadStaff, readOnly = false }) {
  const { user: currentUser } = useAuth()
  const currentRole = currentUser?.role || localStorage.getItem('admin_role')
  const canEdit = !readOnly && currentRole === 'admin'

  const [internalStaff, setInternalStaff] = useState([])
  const [schedules, setSchedules] = useState([])
  const [onDutyList, setOnDutyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()))
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // all | recurring | part_time | one_day
  const [staffFilter, setStaffFilter] = useState('all') // 'all' | 'my_schedule' | specificStaffId
  const [viewingShiftDetails, setViewingShiftDetails] = useState(null)

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isColorModalOpen, setIsColorModalOpen] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)
  const [selectedStaffForColor, setSelectedStaffForColor] = useState(null)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [localStaffColors, setLocalStaffColors] = useState({})
  const [savingColor, setSavingColor] = useState(null)
  const [colorSaveSuccess, setColorSaveSuccess] = useState(false)
  const [colorSaveError, setColorSaveError] = useState(null)

  // Schedule Form State
  const [formStaffId, setFormStaffId] = useState('')
  const [formScheduleType, setFormScheduleType] = useState('recurring')
  const [formDaysOfWeek, setFormDaysOfWeek] = useState([])
  const [formSpecificDate, setFormSpecificDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('08:00')
  const [formEndTime, setFormEndTime] = useState('17:00')
  const [formNotes, setFormNotes] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formSendPush, setFormSendPush] = useState(true)
  const [formSendEmail, setFormSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)

  // Calculate week dates
  const weekDates = useMemo(() => {
    return DAYS.map((d, index) => {
      const dateObj = addDays(currentWeekStart, index)
      return {
        ...d,
        dateObj,
        ymd: formatDateYMD(dateObj),
        displayDate: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      }
    })
  }, [currentWeekStart])

  // Self load staff members if not provided by parent
  useEffect(() => {
    if (!initialStaffMembers || initialStaffMembers.length === 0) {
      fetchStaffMembers().then((res) => {
        if (res?.ok && Array.isArray(res.staff)) {
          setInternalStaff(res.staff)
        }
      }).catch((err) => {
        console.error('Failed to self-load staff members in schedule view:', err)
      })
    }
  }, [initialStaffMembers])

  const rawStaffList = initialStaffMembers && initialStaffMembers.length > 0 ? initialStaffMembers : internalStaff

  // EXCLUDE the Super Admin (regular admins and staff are kept)
  const eligibleStaff = useMemo(() => {
    return rawStaffList.filter((s) => !isSuperAdminUser(s))
  }, [rawStaffList])

  // Load schedules and on-duty list
  const loadData = async () => {
    setLoading(true)
    try {
      const todayYmd = formatDateYMD(new Date())
      const [schedRes, onDutyRes] = await Promise.all([
        fetchSchedules(),
        fetchOnDutyStaff({ date: todayYmd }),
      ])
      if (schedRes?.ok) {
        const validScheds = (schedRes.schedules || []).filter((s) => !isSuperAdminUser(s.staffId))
        setSchedules(validScheds)
      }
      if (onDutyRes?.ok) {
        const validOnDuty = (onDutyRes.onDuty || []).filter((item) => !isSuperAdminUser(item.user))
        setOnDutyList(validOnDuty)
      }
    } catch (err) {
      console.error('Failed to load schedule data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered staff members
  const filteredStaff = useMemo(() => {
    let list = eligibleStaff

    if (staffFilter === 'my_schedule') {
      const myEmail = currentUser?.email?.toLowerCase().trim()
      const myId = currentUser?.id || currentUser?._id || currentUser?.sub
      list = list.filter((s) => {
        if (myId && String(s._id) === String(myId)) return true
        if (myEmail && s.email?.toLowerCase().trim() === myEmail) return true
        return false
      })
    } else if (staffFilter !== 'all') {
      list = list.filter((s) => String(s._id) === String(staffFilter))
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      list = list.filter((s) => {
        return (
          (s.name && s.name.toLowerCase().includes(query)) ||
          (s.email && s.email.toLowerCase().includes(query))
        )
      })
    }
    return list
  }, [eligibleStaff, staffFilter, searchQuery, currentUser])

  // Map schedules by staffId
  const schedulesByStaff = useMemo(() => {
    const map = {}
    for (const sched of schedules) {
      if (!sched.staffId) continue
      const sId = typeof sched.staffId === 'object' ? sched.staffId._id : sched.staffId
      if (!map[sId]) map[sId] = []
      map[sId].push(sched)
    }
    return map
  }, [schedules])

  // Get status for a specific staff member on a specific week day
  const getCellSchedule = (staffId, weekDay) => {
    const staffScheds = schedulesByStaff[staffId] || []
    const matching = staffScheds.filter((sched) => {
      if (!sched.isActive) return false
      if (typeFilter !== 'all' && sched.scheduleType !== typeFilter) return false

      if (sched.scheduleType === 'one_day') {
        return sched.specificDate === weekDay.ymd
      } else if (sched.scheduleType === 'recurring' || sched.scheduleType === 'part_time') {
        const hasDay = sched.daysOfWeek && sched.daysOfWeek.includes(weekDay.key)
        if (!hasDay) return false
        const startOk = !sched.startDate || weekDay.ymd >= sched.startDate
        const endOk = !sched.endDate || weekDay.ymd <= sched.endDate
        return startOk && endOk
      }
      return false
    })
    return matching
  }

  const handleOpenAddModal = (staffId = null, dayKey = null) => {
    setEditingSchedule(null)
    setConflictWarning(null)
    setFormStaffId(staffId || (eligibleStaff[0]?._id || ''))
    setFormScheduleType('recurring')
    setFormDaysOfWeek(dayKey ? [dayKey] : ['monday', 'tuesday', 'wednesday'])
    setFormSpecificDate(formatDateYMD(new Date()))
    setFormStartTime('08:00')
    setFormEndTime('17:00')
    setFormNotes('')
    setFormIsActive(true)
    setFormSendPush(true)
    setFormSendEmail(true)
    setIsScheduleModalOpen(true)
  }

  const handleOpenEditModal = (sched) => {
    setEditingSchedule(sched)
    setConflictWarning(null)
    setFormStaffId(typeof sched.staffId === 'object' ? sched.staffId._id : sched.staffId)
    setFormScheduleType(sched.scheduleType)
    setFormDaysOfWeek(sched.daysOfWeek || [])
    setFormSpecificDate(sched.specificDate || formatDateYMD(new Date()))
    setFormStartTime(sched.startTime || '08:00')
    setFormEndTime(sched.endTime || '17:00')
    setFormNotes(sched.notes || '')
    setFormIsActive(sched.isActive !== false)
    setFormSendPush(true)
    setFormSendEmail(true)
    setIsScheduleModalOpen(true)
  }

  const handleSaveSchedule = async (overrideConflict = false) => {
    if (!formStaffId) return alert('Please select a staff member')
    if (formScheduleType === 'one_day' && !formSpecificDate) return alert('Please select a specific date')
    if ((formScheduleType === 'recurring' || formScheduleType === 'part_time') && formDaysOfWeek.length === 0) {
      return alert('Please select at least one day of the week')
    }

    setSaving(true)
    try {
      const payload = {
        staffId: formStaffId,
        scheduleType: formScheduleType,
        daysOfWeek: formDaysOfWeek,
        specificDate: formScheduleType === 'one_day' ? formSpecificDate : null,
        startTime: formStartTime,
        endTime: formEndTime,
        notes: formNotes,
        isActive: formIsActive,
        overrideConflict,
        sendPush: formSendPush,
        sendEmail: formSendEmail,
      }

      let res
      if (editingSchedule) {
        res = await updateSchedule({ id: editingSchedule._id, scheduleData: payload })
      } else {
        res = await createSchedule({ scheduleData: payload })
      }

      if (res?.conflict) {
        setConflictWarning(res.message)
        setSaving(false)
        return
      }

      if (res?.ok) {
        setIsScheduleModalOpen(false)
        setConflictWarning(null)
        await loadData()
      } else {
        alert(res?.message || 'Failed to save schedule')
      }
    } catch (err) {
      console.error('Save schedule error:', err)
      alert(err.message || 'Error saving schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to remove this schedule?')) return
    try {
      const res = await deleteSchedule({ id })
      if (res?.ok) {
        setIsScheduleModalOpen(false)
        await loadData()
      }
    } catch (err) {
      alert(err.message || 'Error deleting schedule')
    }
  }

  const handleOpenColorModal = (staff) => {
    setSelectedStaffForColor(staff)
    setColorSaveError(null)
    setColorSaveSuccess(false)
    setSavingColor(null)
    setIsColorModalOpen(true)
  }

  const handleSaveStaffColor = async (color) => {
    if (!selectedStaffForColor || savingColor) return
    const staffId = selectedStaffForColor._id
    const prevColor = localStaffColors[staffId] || selectedStaffForColor.color || '#2563EB'

    // Immediate optimistic update
    setSavingColor(color)
    setColorSaveError(null)
    setColorSaveSuccess(false)
    setLocalStaffColors((prev) => ({ ...prev, [staffId]: color }))

    try {
      const res = await updateStaffColor({
        staffId,
        color,
      })
      if (res?.ok) {
        setColorSaveSuccess(true)
        if (onReloadStaff) onReloadStaff()
        loadData()
        setTimeout(() => {
          setIsColorModalOpen(false)
          setSavingColor(null)
          setColorSaveSuccess(false)
        }, 450)
      } else {
        throw new Error(res?.message || 'Failed to update color')
      }
    } catch (err) {
      console.error('Color update failed:', err)
      // Revert optimistic update
      setLocalStaffColors((prev) => ({ ...prev, [staffId]: prevColor }))
      setColorSaveError(err.message || 'Failed to save color')
      setSavingColor(null)
    }
  }

  const toggleDayOfWeek = (dayKey) => {
    setFormDaysOfWeek((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: On Duty Today summary */}
      <div className="bg-gradient-to-r from-slate-900 via-ocean-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                Live Duty Roster • {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight font-display text-white">
              Currently On Duty Today
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              The system automatically resolves who is on duty from recurring, part-time, and one-day schedules.
            </p>
          </div>

          {/* On duty staff badge pills */}
          <div className="flex flex-wrap items-center gap-2">
            {onDutyList.length === 0 ? (
              <span className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3.5 py-1.5 rounded-xl">
                No staff scheduled on duty today
              </span>
            ) : (
              onDutyList.map((item) => {
                const staff = item.user
                const staffColor = localStaffColors[staff._id] || staff.color || '#2563EB'
                return (
                  <div
                    key={staff._id}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-sm"
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: staffColor }}
                    />
                    <div className="text-left">
                      <div className="text-xs font-extrabold text-white leading-tight">
                        {staff.name || staff.email.split('@')[0]}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.scheduleType.replace('_', ' ')} • {item.startTime}-{item.endTime}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeekStart((prev) => addDays(prev, -7))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Previous Week"
          >
            <Lucide.ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))}
            className="px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentWeekStart((prev) => addDays(prev, 7))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Next Week"
          >
            <Lucide.ChevronRight size={18} />
          </button>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">
            Week of {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Search, Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search by name/email */}
          <div className="relative">
            <Lucide.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 text-slate-800 dark:text-white w-36 sm:w-44"
            />
          </div>

          {/* Quick Staff Filter Buttons (All Team vs My Schedule) */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStaffFilter('all')}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition-all",
                staffFilter === 'all'
                  ? "bg-white dark:bg-slate-900 text-ocean-600 dark:text-ocean-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              All Staff
            </button>
            <button
              onClick={() => setStaffFilter('my_schedule')}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                staffFilter === 'my_schedule'
                  ? "bg-white dark:bg-slate-900 text-ocean-600 dark:text-ocean-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
              title="Show only my personal schedule"
            >
              <Lucide.UserCheck size={14} />
              <span>My Schedule</span>
            </button>
          </div>

          {/* Specific Staff Dropdown Selector */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none max-w-[180px] truncate"
          >
            <option value="all">Staff: Everyone ({eligibleStaff.length})</option>
            <option value="my_schedule">⭐ My Schedule Only</option>
            {eligibleStaff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name || s.email.split('@')[0]} {s.role === 'admin' ? '(Admin)' : ''}
              </option>
            ))}
          </select>

          {/* Filter Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Shift Types</option>
            <option value="recurring">Recurring</option>
            <option value="part_time">Part-Time</option>
            <option value="one_day">One-Day</option>
          </select>

          {canEdit ? (
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
            >
              <Lucide.Plus size={16} />
              <span>Add Schedule</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold">
              <Lucide.Eye size={15} className="text-ocean-600 dark:text-ocean-400" />
              <span>Roster View</span>
            </div>
          )}
        </div>
      </div>

      {/* EXCEL / SPREADSHEET SCHEDULE TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            {/* Header Row */}
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 select-none">
                <th className="py-3.5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 w-64 border-r border-slate-200 dark:border-slate-800">
                  Staff Member
                </th>
                {weekDates.map((d) => {
                  const isToday = d.ymd === formatDateYMD(new Date())
                  return (
                    <th
                      key={d.key}
                      className={clsx(
                        "py-3 px-2 text-center text-xs font-black uppercase tracking-wider border-r border-slate-200 dark:border-slate-800 last:border-r-0 transition-colors",
                        isToday ? "bg-ocean-50/70 dark:bg-ocean-950/40 text-ocean-600 dark:text-ocean-400" : "text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black">{d.label}</span>
                        <span className={clsx(
                          "text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full",
                          isToday ? "bg-ocean-600 text-white" : "text-slate-400"
                        )}>
                          {d.displayDate}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Table Body (Staff Rows) */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Lucide.Loader2 size={32} className="animate-spin mx-auto mb-2 text-ocean-600" />
                    Loading duty schedules...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Lucide.Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No staff members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const staffColor = localStaffColors[staff._id] || staff.color || '#2563EB'
                  const staffDisplayName = staff.name || staff.email.split('@')[0]

                  return (
                    <tr
                      key={staff._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Staff Header Cell */}
                      <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 sticky left-0 z-10">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Color Dot Button (Editable only by Admin) */}
                            {canEdit ? (
                              <button
                                onClick={() => handleOpenColorModal(staff)}
                                className="h-4 w-4 rounded-full shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-900 hover:scale-125 transition-transform"
                                style={{ backgroundColor: staffColor }}
                                title="Click to change custom staff color"
                              />
                            ) : (
                              <span
                                className="h-4 w-4 rounded-full shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-900"
                                style={{ backgroundColor: staffColor }}
                              />
                            )}
                            <div className="min-w-0">
                              <div
                                className="font-extrabold truncate text-slate-900 dark:text-white"
                                style={{ color: staffColor }}
                              >
                                {staffDisplayName} {staff.role === 'admin' ? '(Admin)' : ''}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{staff.email}</div>
                            </div>
                          </div>

                          {/* Quick Add Schedule for this staff (Admin Only) */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenAddModal(staff._id)}
                              className="p-1 rounded-lg text-slate-300 hover:text-ocean-600 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Add schedule"
                            >
                              <Lucide.Plus size={15} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Day Columns */}
                      {weekDates.map((weekDay) => {
                        const cellScheds = getCellSchedule(staff._id, weekDay)
                        const hasSched = cellScheds.length > 0
                        const isToday = weekDay.ymd === formatDateYMD(new Date())

                        return (
                          <td
                            key={weekDay.key}
                            onClick={() => {
                              if (canEdit && !hasSched) {
                                handleOpenAddModal(staff._id, weekDay.key)
                              }
                            }}
                            className={clsx(
                              "py-2 px-1.5 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 transition-colors relative",
                              canEdit ? "cursor-pointer" : hasSched ? "cursor-pointer" : "cursor-default",
                              isToday ? "bg-ocean-50/30 dark:bg-ocean-950/20" : "",
                              canEdit && !hasSched && "hover:bg-ocean-50/40 dark:hover:bg-ocean-950/30"
                            )}
                          >
                            {hasSched ? (
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {cellScheds.map((sched) => {
                                  const isPt = sched.scheduleType === 'part_time'
                                  const isOneDay = sched.scheduleType === 'one_day'

                                  return (
                                    <button
                                      key={sched._id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (canEdit) {
                                          handleOpenEditModal(sched)
                                        } else {
                                          setViewingShiftDetails({
                                            ...sched,
                                            staffDisplayName,
                                            staffEmail: staff.email,
                                            staffColor,
                                            weekDayDisplay: `${weekDay.full}, ${weekDay.displayDate}`,
                                          })
                                        }
                                      }}
                                      style={{
                                        borderColor: staffColor,
                                        backgroundColor: `${staffColor}18`, // 10% opacity tint
                                        color: staffColor,
                                      }}
                                      className="w-full max-w-[95px] px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-xs hover:scale-105 active:scale-95 transition-all text-center flex flex-col items-center justify-center"
                                      title={canEdit ? `Click to edit: ${sched.scheduleType.toUpperCase()} (${sched.startTime} - ${sched.endTime})` : `Click to view shift details (${sched.startTime} - ${sched.endTime})`}
                                    >
                                      <div className="flex items-center gap-1 font-black">
                                        <span
                                          className="h-1.5 w-1.5 rounded-full shrink-0"
                                          style={{ backgroundColor: staffColor }}
                                        />
                                        <span>{isPt ? 'PT' : isOneDay ? '1-DAY' : 'ON'}</span>
                                      </div>
                                      <span className="text-[9px] font-bold opacity-80 mt-0.5">
                                        {sched.startTime}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              canEdit ? (
                                <div className="h-9 flex items-center justify-center text-slate-300 dark:text-slate-700 opacity-0 hover:opacity-100 transition-opacity">
                                  <Lucide.Plus size={14} />
                                </div>
                              ) : (
                                <div className="h-9 flex items-center justify-center text-slate-200 dark:text-slate-800 text-[10px]">
                                  —
                                </div>
                              )
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SCHEDULE MODAL (Create / Edit) */}
      {/* ============================================================= */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-ocean-100 dark:bg-ocean-950 flex items-center justify-center text-ocean-600 dark:text-ocean-400">
                  <Lucide.CalendarClock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-display">
                    {editingSchedule ? 'Edit Staff Schedule' : 'Assign Duty Schedule'}
                  </h3>
                  <p className="text-xs text-slate-400">Set recurring, part-time, or one-day assignments</p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            {/* Conflict Warning Box */}
            {conflictWarning && (
              <div className="my-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <Lucide.AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-extrabold">{conflictWarning}</p>
                    <p className="opacity-90">
                      Do you want to proceed and override this schedule conflict anyway?
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSaveSchedule(true)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-sm"
                      >
                        Override & Save
                      </button>
                      <button
                        onClick={() => setConflictWarning(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]"
                      >
                        Adjust Times
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Staff Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Staff Member
                </label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                >
                  {eligibleStaff.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name || s.email.split('@')[0]} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule Type Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Schedule Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'recurring', label: 'Constant / Recurring', desc: 'Auto ON duty each week' },
                    { id: 'part_time', label: 'Part-Time', desc: 'Selected recurring days' },
                    { id: 'one_day', label: 'Specific Date', desc: 'Single day replacement' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setFormScheduleType(mode.id)}
                      className={clsx(
                        'p-2.5 rounded-2xl border text-left transition-all',
                        formScheduleType === mode.id
                          ? 'border-ocean-500 bg-ocean-50/60 dark:bg-ocean-950/40 text-ocean-700 dark:text-ocean-300 ring-2 ring-ocean-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      <div className="text-xs font-black">{mode.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Days of Week (for Recurring & Part-Time) */}
              {(formScheduleType === 'recurring' || formScheduleType === 'part_time') && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Days of the Week
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map((d) => {
                      const selected = formDaysOfWeek.includes(d.key)
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDayOfWeek(d.key)}
                          className={clsx(
                            'py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all',
                            selected
                              ? 'bg-ocean-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          )}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Specific Date (for One-Day) */}
              {formScheduleType === 'one_day' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Assignment Date
                  </label>
                  <input
                    type="date"
                    value={formSpecificDate}
                    onChange={(e) => setFormSpecificDate(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Staff will automatically be marked ON DUTY only for this specific date.
                  </p>
                </div>
              )}

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning counter duties, emergency shift..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Active Schedule
                </span>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded-sm text-ocean-600 focus:ring-ocean-500"
                />
              </div>

              {/* Notification Delivery Options */}
              <div className="p-3.5 rounded-2xl bg-ocean-50/60 dark:bg-ocean-950/20 border border-ocean-100 dark:border-ocean-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-ocean-800 dark:text-ocean-300 flex items-center gap-1.5">
                    <Lucide.BellRing size={13} className="text-ocean-600 dark:text-ocean-400" />
                    Staff Notifications
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ocean-100 dark:bg-ocean-900/60 text-ocean-700 dark:text-ocean-300">
                    Instant Delivery
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Web Push */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-ocean-300 dark:hover:border-ocean-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={formSendPush}
                      onChange={(e) => setFormSendPush(e.target.checked)}
                      className="h-4 w-4 rounded text-ocean-600 focus:ring-ocean-500"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <Lucide.Smartphone size={14} className="text-sky-500" />
                      <span>Web Push</span>
                    </div>
                  </label>

                  {/* Email Alert */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-ocean-300 dark:hover:border-ocean-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={formSendEmail}
                      onChange={(e) => setFormSendEmail(e.target.checked)}
                      className="h-4 w-4 rounded text-ocean-600 focus:ring-ocean-500"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <Lucide.Mail size={14} className="text-emerald-500" />
                      <span>Email Alert</span>
                    </div>
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Staff member will receive automated alerts when this schedule is assigned or reassigned.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
              {editingSchedule ? (
                <button
                  type="button"
                  onClick={() => handleDeleteSchedule(editingSchedule._id)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                >
                  Delete Schedule
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveSchedule(false)}
                  className="px-5 py-2 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* COLOR PICKER MODAL */}
      {/* ============================================================= */}
      {isColorModalOpen && selectedStaffForColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white font-display">
                  Assign Staff Color
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedStaffForColor.name || selectedStaffForColor.email}
                </p>
              </div>
              <button
                disabled={!!savingColor}
                onClick={() => setIsColorModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl disabled:opacity-40"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Choose a color for this staff member. It will be displayed throughout the spreadsheet and duty assignments:
            </p>

            <div className="grid grid-cols-5 gap-3 my-4">
              {PRESET_COLORS.map((col) => {
                const currentColor = localStaffColors[selectedStaffForColor._id] || selectedStaffForColor.color || '#2563EB'
                const isSelected = currentColor.toLowerCase() === col.toLowerCase()
                const isThisSaving = savingColor === col

                return (
                  <button
                    key={col}
                    type="button"
                    disabled={!!savingColor}
                    onClick={() => handleSaveStaffColor(col)}
                    className={clsx(
                      'h-10 w-10 rounded-2xl transition-all shadow-sm flex items-center justify-center relative',
                      savingColor ? 'cursor-not-allowed opacity-90' : 'hover:scale-110 active:scale-95',
                      isSelected ? 'ring-4 ring-offset-2 ring-slate-900 dark:ring-white scale-105' : ''
                    )}
                    style={{ backgroundColor: col }}
                    title={col}
                  >
                    {isThisSaving ? (
                      <Lucide.Loader2 size={18} className="animate-spin text-white drop-shadow-md" />
                    ) : isSelected ? (
                      <Lucide.Check size={18} className="text-white drop-shadow-md" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            {/* Live Loading & Status Indicator */}
            {savingColor && (
              <div className="flex items-center justify-center gap-2 p-2.5 my-3 rounded-xl bg-ocean-50 dark:bg-ocean-950/40 border border-ocean-200 dark:border-ocean-800 text-xs font-bold text-ocean-700 dark:text-ocean-300 animate-in fade-in">
                <Lucide.Loader2 size={15} className="animate-spin text-ocean-600 shrink-0" />
                <span>Updating staff color...</span>
              </div>
            )}

            {colorSaveSuccess && (
              <div className="flex items-center justify-center gap-2 p-2.5 my-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                <Lucide.CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Color updated successfully!</span>
              </div>
            )}

            {colorSaveError && (
              <div className="flex items-center gap-2 p-2.5 my-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 animate-in fade-in">
                <Lucide.AlertCircle size={16} className="text-rose-500 shrink-0" />
                <span>{colorSaveError}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                disabled={!!savingColor}
                onClick={() => setIsColorModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* READ-ONLY SHIFT DETAILS MODAL (For Staff Viewing Roster) */}
      {/* ============================================================= */}
      {viewingShiftDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: viewingShiftDetails.staffColor || '#2563EB' }}
                />
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white font-display">
                    Duty Shift Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewingShiftDetails.staffDisplayName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingShiftDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <Lucide.X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  Schedule Type
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-ocean-100 dark:bg-ocean-950/60 text-ocean-700 dark:text-ocean-300">
                  {viewingShiftDetails.scheduleType?.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                    Duty Hours
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block">
                    {viewingShiftDetails.startTime} — {viewingShiftDetails.endTime}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                    Shift Days / Date
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1 block">
                    {viewingShiftDetails.scheduleType === 'one_day'
                      ? viewingShiftDetails.specificDate
                      : viewingShiftDetails.daysOfWeek && viewingShiftDetails.daysOfWeek.length > 0
                      ? viewingShiftDetails.daysOfWeek.map((d) => d.slice(0, 3).toUpperCase()).join(', ')
                      : 'Everyday'}
                  </span>
                </div>
              </div>

              {viewingShiftDetails.notes && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-300">
                  <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-700 dark:text-amber-400 mb-1">
                    Operational Shift Notes
                  </span>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">
                    {viewingShiftDetails.notes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold pt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Confirmed Active on Agency Roster</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingShiftDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
