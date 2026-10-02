import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import clsx from 'clsx'
import { fetchMyDuties, completeDutyAssignment, updateDutyAssignmentNotes } from '../../data/api'

export default function StaffDutyDashboard() {
  const [searchParams] = useSearchParams()
  const targetDutyId = searchParams.get('dutyId')
  const targetAssignmentId = searchParams.get('assignmentId')

  const [data, setData] = useState({
    isCurrentlyOnDuty: false,
    todayScheduleInfo: null,
    todayTravels: [],
    assignments: [],
  })
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState(null)
  const [savingNoteId, setSavingNoteId] = useState(null)
  const [tab, setTab] = useState('today') // today | all | completed | travels

  // Complete Task Modal state
  const [completeModalAssignment, setCompleteModalAssignment] = useState(null)
  const [completionNotes, setCompletionNotes] = useState('')

  // Edit/Add Note Modal state
  const [noteModalAssignment, setNoteModalAssignment] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')

  // Notification / Success Feedback toast
  const [feedbackToast, setFeedbackToast] = useState(null)

  const cardRefs = useRef({})

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type })
    setTimeout(() => setFeedbackToast(null), 4000)
  }

  const loadMyDuties = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchMyDuties()
      if (res?.ok) {
        setData({
          isCurrentlyOnDuty: res.isCurrentlyOnDuty,
          todayScheduleInfo: res.todayScheduleInfo,
          todayTravels: res.todayTravels || [],
          assignments: res.assignments || [],
        })
      }
    } catch (err) {
      console.error('Failed to load my duties:', err)
      showToast('Failed to load duties. Please refresh.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyDuties()
  }, [loadMyDuties])

  // Auto-scroll and highlight if URL contains dutyId or assignmentId from email link
  useEffect(() => {
    if (!loading && (targetDutyId || targetAssignmentId)) {
      const target = data.assignments.find(
        (a) =>
          (targetAssignmentId && a._id === targetAssignmentId) ||
          (targetDutyId && a.dutyId?._id === targetDutyId)
      )
      if (target && cardRefs.current[target._id]) {
        setTimeout(() => {
          cardRefs.current[target._id]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }, 300)
      }
    }
  }, [loading, targetDutyId, targetAssignmentId, data.assignments])

  // Greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  // Filtered views
  const todayAssignments = useMemo(() => {
    return data.assignments.filter((a) => a.isToday)
  }, [data.assignments])

  const pendingAssignments = useMemo(() => {
    return data.assignments.filter((a) => a.status === 'pending')
  }, [data.assignments])

  const completedAssignments = useMemo(() => {
    return data.assignments.filter((a) => a.status === 'completed')
  }, [data.assignments])

  const displayedAssignments = useMemo(() => {
    if (tab === 'today') return todayAssignments
    if (tab === 'completed') return completedAssignments
    return data.assignments
  }, [tab, todayAssignments, completedAssignments, data.assignments])

  // Open Complete Modal
  const openCompleteModal = (assignment) => {
    setCompleteModalAssignment(assignment)
    setCompletionNotes(assignment.notes || '')
  }

  // Handle Mark as Done
  const handleConfirmComplete = async () => {
    if (!completeModalAssignment) return
    const assignmentId = completeModalAssignment._id
    const notes = completionNotes.trim()

    setCompletingId(assignmentId)

    // Optimistic UI update
    setData((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a._id === assignmentId
          ? {
              ...a,
              status: 'completed',
              completedAt: new Date().toISOString(),
              notes,
            }
          : a
      ),
    }))

    try {
      const res = await completeDutyAssignment({ assignmentId, notes })
      if (res?.ok) {
        showToast('Task marked completed! Admin notified via push & email.')
        setCompleteModalAssignment(null)
        setCompletionNotes('')
      } else {
        await loadMyDuties()
        showToast(res?.message || 'Failed to complete duty', 'error')
      }
    } catch (err) {
      console.error('Error completing duty:', err)
      await loadMyDuties()
      showToast(err.message || 'Error updating duty status', 'error')
    } finally {
      setCompletingId(null)
    }
  }

  // Open Edit Note Modal
  const openNoteModal = (assignment) => {
    setNoteModalAssignment(assignment)
    setNoteDraft(assignment.notes || '')
  }

  // Handle Save Note
  const handleConfirmSaveNote = async () => {
    if (!noteModalAssignment) return
    const assignmentId = noteModalAssignment._id
    const notes = noteDraft.trim()

    setSavingNoteId(assignmentId)

    // Optimistic UI update
    setData((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a._id === assignmentId ? { ...a, notes } : a
      ),
    }))

    try {
      const res = await updateDutyAssignmentNotes({ assignmentId, notes })
      if (res?.ok) {
        showToast('Note saved! Admin notified of progress update.')
        setNoteModalAssignment(null)
        setNoteDraft('')
      } else {
        await loadMyDuties()
        showToast(res?.message || 'Failed to update note', 'error')
      }
    } catch (err) {
      console.error('Error updating note:', err)
      await loadMyDuties()
      showToast(err.message || 'Error updating note', 'error')
    } finally {
      setSavingNoteId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={clsx(
            'fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold transition-all transform animate-in fade-in slide-in-from-top-4',
            feedbackToast.type === 'error'
              ? 'bg-rose-900 text-rose-100 border border-rose-700'
              : 'bg-emerald-900 text-emerald-100 border border-emerald-700'
          )}
        >
          {feedbackToast.type === 'error' ? (
            <Lucide.AlertCircle size={18} className="text-rose-400" />
          ) : (
            <Lucide.CheckCircle2 size={18} className="text-emerald-400" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-ocean-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
          <Lucide.ClipboardCheck size={180} />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-ocean-200">
            <Lucide.Sparkles size={13} className="text-amber-400" />
            <span>Operational Staff Workspace</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {greeting}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Stay active on your duty roster, track flights, and resolve tasks assigned by administration.
              </p>
            </div>

            {/* On Duty Status Badge */}
            <div className="shrink-0">
              {data.isCurrentlyOnDuty ? (
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/40">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      You are ON DUTY today
                    </span>
                    <span className="text-[11px] opacity-90 block font-semibold text-emerald-200">
                      Stay active please •{' '}
                      {data.todayScheduleInfo?.startTime || '08:00'} -{' '}
                      {data.todayScheduleInfo?.endTime || '17:00'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                  <span>Off-Duty Today</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Duty Hours
              </span>
              <span className="text-sm font-black text-white mt-0.5 block">
                {data.todayScheduleInfo
                  ? `${data.todayScheduleInfo.startTime} - ${data.todayScheduleInfo.endTime}`
                  : 'Flexible / Standard'}
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Flights Today
              </span>
              <span className="text-sm font-black text-sky-400 mt-0.5 block">
                {data.todayTravels.length} departures
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pending Tasks
              </span>
              <span className="text-sm font-black text-amber-400 mt-0.5 block">
                {pendingAssignments.length} to do
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Completed
              </span>
              <span className="text-sm font-black text-emerald-400 mt-0.5 block">
                {completedAssignments.length} done
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S FLIGHT DEPARTURES WIDGET */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Lucide.PlaneTakeoff size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Today&apos;s Flight Operations & Travels
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Scheduled departures requiring staff monitoring & passenger assistance
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900">
            {data.todayTravels.length} flights
          </span>
        </div>

        {data.todayTravels.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No passenger flight departures currently scheduled for today.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.todayTravels.map((travel) => (
              <div
                key={travel._id}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 hover:border-ocean-300 dark:hover:border-ocean-700 transition-all"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {travel.flightNumber}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {travel.airlineName}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-ocean-700 dark:text-ocean-300 flex items-center gap-1.5">
                    <span>{travel.originCity} ({travel.originIata})</span>
                    <Lucide.ArrowRight size={12} className="text-slate-400 shrink-0" />
                    <span>{travel.destCity} ({travel.destIata})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Passenger: <strong className="text-slate-700 dark:text-slate-300">{travel.passengerName}</strong>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-end gap-1">
                    <Lucide.Clock size={12} className="text-slate-400" />
                    <span>{travel.departureTime}</span>
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {travel.status || 'Confirmed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Segmented Tab Bar for Tasks */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setTab('today')}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
              tab === 'today'
                ? 'bg-[#00456E] text-white shadow-md shadow-[#00456E]/20'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Today&apos;s Duties ({todayAssignments.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
              tab === 'all'
                ? 'bg-[#00456E] text-white shadow-md shadow-[#00456E]/20'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            All Assigned ({data.assignments.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
              tab === 'completed'
                ? 'bg-[#00456E] text-white shadow-md shadow-[#00456E]/20'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Completed ({completedAssignments.length})
          </button>
        </div>

        <button
          onClick={loadMyDuties}
          className="self-end sm:self-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh Duties"
        >
          <Lucide.RotateCw size={14} className={clsx(loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Duty List Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Lucide.Loader2 size={24} className="animate-spin text-ocean-600" />
            <span>Loading assigned tasks...</span>
          </div>
        ) : displayedAssignments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-400">
            <Lucide.CheckCircle size={40} className="mx-auto mb-3 text-emerald-500 opacity-80" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {tab === 'today'
                ? 'No duties scheduled for today'
                : tab === 'completed'
                ? 'No completed duties yet'
                : 'No duties assigned to you'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You are all caught up! When admin assigns new tasks or departures to your roster, they will appear here with push & email alerts.
            </p>
          </div>
        ) : (
          displayedAssignments.map((assignment) => {
            const duty = assignment.dutyId
            if (!duty) return null

            const isDone = assignment.status === 'completed'
            const isOverdue = assignment.effectiveStatus === 'overdue'
            const isUrgent = duty.priority === 'urgent' || duty.priority === 'high'
            const isTargetHighlight =
              (targetAssignmentId && assignment._id === targetAssignmentId) ||
              (targetDutyId && duty._id === targetDutyId)

            return (
              <div
                key={assignment._id}
                ref={(el) => (cardRefs.current[assignment._id] = el)}
                className={clsx(
                  'bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-6 shadow-sm transition-all relative overflow-hidden',
                  isTargetHighlight && 'ring-4 ring-ocean-500/40 border-ocean-500',
                  isDone
                    ? 'border-emerald-200 dark:border-emerald-950/60 opacity-90'
                    : isOverdue
                    ? 'border-rose-300 dark:border-rose-900/60 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-ocean-300 dark:hover:border-ocean-800'
                )}
              >
                {/* Left accent border */}
                <div
                  className={clsx(
                    'absolute left-0 top-0 bottom-0 w-1.5',
                    isDone
                      ? 'bg-emerald-500'
                      : isOverdue
                      ? 'bg-rose-500'
                      : isUrgent
                      ? 'bg-amber-500'
                      : 'bg-ocean-600'
                  )}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority Badge */}
                      <span
                        className={clsx(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          isUrgent
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        )}
                      >
                        {duty.priority}
                      </span>

                      {/* Due date & time badge */}
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                        <Lucide.Clock size={13} />
                        Due {duty.dueDate} at {duty.dueTime}
                      </span>

                      {/* Overdue tag */}
                      {isOverdue && !isDone && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                          Overdue
                        </span>
                      )}

                      {/* Today badge */}
                      {assignment.isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Today
                        </span>
                      )}
                    </div>

                    <h3
                      className={clsx(
                        'text-lg font-bold tracking-tight text-slate-900 dark:text-white',
                        isDone && 'line-through text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {duty.title}
                    </h3>

                    {duty.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {duty.description}
                      </p>
                    )}

                    {/* Staff Notes Display Box */}
                    {assignment.notes && (
                      <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Lucide.FileText size={12} className="text-ocean-600" />
                            <span>Staff Notes & Remarks</span>
                          </span>
                          <button
                            onClick={() => openNoteModal(assignment)}
                            className="text-[11px] font-bold text-ocean-600 hover:text-ocean-700 dark:text-ocean-400 hover:underline flex items-center gap-1"
                          >
                            <Lucide.Pencil size={11} />
                            <span>Edit</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
                          &quot;{assignment.notes}&quot;
                        </p>
                      </div>
                    )}

                    {/* Completion Info */}
                    {isDone && (
                      <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Lucide.CheckCircle2 size={15} />
                        <span>
                          Completed at{' '}
                          {assignment.completedAt
                            ? new Date(assignment.completedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : 'Done'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="shrink-0 flex flex-row sm:flex-col items-end gap-2 self-end sm:self-center">
                    {!isDone ? (
                      <>
                        <button
                          onClick={() => openCompleteModal(assignment)}
                          disabled={completingId === assignment._id}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Lucide.Check size={16} strokeWidth={2.5} />
                          <span>
                            {completingId === assignment._id ? 'Saving...' : 'Mark as Done'}
                          </span>
                        </button>

                        <button
                          onClick={() => openNoteModal(assignment)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
                        >
                          <Lucide.FilePlus size={14} className="text-slate-400" />
                          <span>{assignment.notes ? 'Edit Note' : 'Add Note'}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <Lucide.Check size={14} strokeWidth={3} />
                          <span>Completed</span>
                        </div>
                        <button
                          onClick={() => openNoteModal(assignment)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:underline flex items-center gap-1"
                        >
                          <Lucide.Pencil size={11} />
                          <span>Update Note</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* COMPLETE TASK MODAL */}
      {completeModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Task Completion
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Mark Duty Completed
                </h3>
              </div>
              <button
                onClick={() => setCompleteModalAssignment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <Lucide.X size={20} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {completeModalAssignment.dutyId?.title}
              </div>
              <div className="text-[11px] text-slate-500">
                Due {completeModalAssignment.dutyId?.dueDate} at{' '}
                {completeModalAssignment.dutyId?.dueTime} • Priority:{' '}
                <span className="uppercase font-bold">
                  {completeModalAssignment.dutyId?.priority}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Completion / Handover Notes (Optional)
              </label>
              <p className="text-[11px] text-slate-500">
                Any remarks entered here will be instantly sent to Admins in both Push Notification and Email.
              </p>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Passenger boarded successfully; tickets and boarding passes issued to client; handover remarks..."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCompleteModalAssignment(null)}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                disabled={completingId === completeModalAssignment._id}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Lucide.Check size={16} strokeWidth={2.5} />
                <span>
                  {completingId === completeModalAssignment._id
                    ? 'Completing...'
                    : 'Confirm & Alert Admin'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ADD NOTE MODAL */}
      {noteModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ocean-100 text-ocean-800 dark:bg-ocean-950 dark:text-ocean-300">
                  Duty Progress Note
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Add / Edit Task Note
                </h3>
              </div>
              <button
                onClick={() => setNoteModalAssignment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <Lucide.X size={20} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {noteModalAssignment.dutyId?.title}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Progress Remarks / Operational Notes
              </label>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Record current progress, passenger inquiries, flight status, or handover details..."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNoteModalAssignment(null)}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveNote}
                disabled={savingNoteId === noteModalAssignment._id}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#00456E] hover:bg-[#003656] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#00456E]/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Lucide.Save size={16} />
                <span>
                  {savingNoteId === noteModalAssignment._id ? 'Saving...' : 'Save Note & Alert Admin'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
