const DEFAULT_TIMEOUT_MS = 30000

function withTimeout(signal, ms) {
  const controller = new AbortController()

  // If parent signal is already aborted, abort immediately
  if (signal?.aborted) {
    controller.abort(signal.reason)
    return { signal: controller.signal, cleanup: () => { } }
  }

  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Request Timeout'))
  }, ms)

  const onAbort = () => {
    controller.abort(signal?.reason)
  }

  if (signal) {
    signal.addEventListener('abort', onAbort)
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      if (signal) signal.removeEventListener('abort', onAbort)
    },
  }
}

async function request(path, { method = 'GET', body, baseUrl, signal, token } = {}) {
  const resolvedBaseUrl = (baseUrl || getApiBaseUrl()).replace(/\/$/, '')
  const url = path.startsWith('http') ? path : `${resolvedBaseUrl}${path}`
  console.log(`[API] ${method} ${url}`, { body });
  const authToken = token || localStorage.getItem('admin_token') || localStorage.getItem('token')

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const { signal: timeoutSignal, cleanup } = withTimeout(signal, DEFAULT_TIMEOUT_MS)

  try {
    const options = {
      method,
      headers,
      signal: timeoutSignal,
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const res = await fetch(url, options)

    // Handle Token Expiry & Auto-Refresh
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken')
      const isRefreshEndpoint = path.includes('/api/auth/refresh')
      
      if (refreshToken && !isRefreshEndpoint) {
        console.log('[API] Attempting auto-refresh...')
        try {
          const refreshRes = await fetch(`${resolvedBaseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            localStorage.setItem('token', refreshData.accessToken)
            if (localStorage.getItem('admin_token')) {
              localStorage.setItem('admin_token', refreshData.accessToken)
            }
            
            // Retry the original request with new token
            headers['Authorization'] = `Bearer ${refreshData.accessToken}`
            const retryRes = await fetch(url, { ...options, headers })
            const retryData = await retryRes.json().catch(() => null)
            if (!retryRes.ok) {
              throw {
                status: retryRes.status,
                message: retryData?.message || `Request failed: ${retryRes.status} ${retryRes.statusText}`,
                code: retryData?.code
              }
            }
            return retryData
          }
        } catch (e) {
          console.error('[API] Auto-refresh failed:', e)
        }
      }

      // If refresh failed or no refresh token, session is expired
      const data = await res.json().catch(() => null)
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_role')
      localStorage.removeItem('lastActivityTime')

      const expireMsg = data?.message || 'Your session has expired. Please sign in again to continue.'
      sessionStorage.setItem('session_expired_notice', expireMsg)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dnarai:session-expired', {
            detail: {
              code: data?.code || 'SESSION_EXPIRED',
              message: expireMsg,
              url: window.location.pathname,
            },
          })
        )
      }

      throw {
        status: 401,
        code: data?.code || 'SESSION_EXPIRED',
        message: expireMsg,
      }
    }

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      throw {
        status: res.status,
        message: data?.message || `Request failed: ${res.status} ${res.statusText}`,
        code: data?.code
      }
    }

    return data
  } finally {
    cleanup()
  }
}

export async function login({ email, password, baseUrl }) {
  return request('/api/auth/login', { method: 'POST', body: { email, password }, baseUrl })
}

export async function register({ email, password, role, baseUrl }) {
  return request('/api/auth/register', { method: 'POST', body: { email, password, role }, baseUrl })
}

export async function refreshTokenAPI({ refreshToken, baseUrl }) {
  return request('/api/auth/refresh', { method: 'POST', body: { refreshToken }, baseUrl })
}

export async function addStaff({ email, role, password, baseUrl }) {
  return request('/api/auth/add-staff', { method: 'POST', body: { email, role, password }, baseUrl })
}

export async function fetchStaffMembers({ baseUrl, signal, token } = {}) {
  return request('/api/auth/staff', { baseUrl, signal, token })
}

export async function deleteStaffMember({ id, baseUrl, token }) {
  return request(`/api/auth/staff/${id}`, { method: 'DELETE', baseUrl, token })
}

export async function resendStaffCredentials({ id, baseUrl, token }) {
  return request(`/api/auth/staff/${id}/resend-credentials`, { method: 'POST', baseUrl, token })
}

export async function fetchPassenger({ baseUrl, signal } = {}) {
  // Use portal if user is a passenger, or admin/passengers/me if we add that.
  // For now, portal/me is for passengers.
  return request('/api/portal/me', { baseUrl, signal })
}

export async function fetchPassengers({ baseUrl, signal, token } = {}) {
  return request('/api/passengers', { baseUrl, signal, token })
}

export async function fetchFlights({ baseUrl, signal } = {}) {
  return request('/api/portal/bookings', { baseUrl, signal })
}

export async function fetchNotifications({ baseUrl, signal } = {}) {
  return request('/api/portal/notifications', { baseUrl, signal })
}

export async function submitBookingRequest({ departureCity, destination, date, notes, isReturn, returnDate, passengers, tripType, legs, baseUrl, signal } = {}) {
  return request('/api/portal/booking-requests', {
    method: 'POST',
    body: { departureCity, destination, date, notes, isReturn, returnDate, passengers, tripType, legs },
    baseUrl,
    signal
  })
}

export async function cancelBookingAPI({ id, baseUrl, signal }) {
  return request(`/api/portal/bookings/${id}/cancel`, {
    method: 'POST',
    baseUrl,
    signal
  })
}

export async function updateProfile({ fullName, phone, baseUrl }) {
  return request('/api/portal/update-profile', {
    method: 'POST',
    body: { fullName, phone },
    baseUrl
  })
}

export async function updatePassportAPI({ passportNumber, issueDate, dob, passportName, expiryDate, countryIssue, baseUrl }) {
  return request('/api/portal/update-passport', {
    method: 'POST',
    body: { passportNumber, issueDate, dob, passportName, expiryDate, countryIssue },
    baseUrl
  })
}

export async function updateFrequentFlyersAPI({ frequentFlyerNumbers, baseUrl }) {
  return request('/api/portal/update-frequent-flyers', {
    method: 'POST',
    body: { frequentFlyerNumbers },
    baseUrl
  })
}

export async function createBlog({ title, content, baseUrl, token }) {
  return request('/api/blogs', {
    method: 'POST',
    body: { title, content },
    baseUrl,
    token
  })
}

export async function searchAirports({ q, baseUrl, signal }) {
  return request(`/api/time/search?q=${encodeURIComponent(q)}`, { baseUrl, signal })
}

export async function getAirportTime({ iata, baseUrl, signal }) {
  return request(`/api/time/airport/${iata}`, { baseUrl, signal })
}

export async function convertTime({ from, to, time, baseUrl, signal }) {
  let path = `/api/time/convert?from=${from}&to=${to}`
  if (time) path += `&time=${encodeURIComponent(time)}`
  return request(path, { baseUrl, signal })
}

export async function fetchQuotations({ status, search, page = 1, limit = 20, baseUrl, signal, token } = {}) {
  let path = `/api/quotations?page=${page}&limit=${limit}`
  if (status && status !== 'all') path += `&status=${encodeURIComponent(status)}`
  if (search) path += `&search=${encodeURIComponent(search)}`
  return request(path, { baseUrl, signal, token })
}

export async function fetchQuotationById({ id, baseUrl, signal, token } = {}) {
  return request(`/api/quotations/${id}`, { baseUrl, signal, token })
}

export async function createQuotation({ data, baseUrl, token } = {}) {
  return request('/api/quotations', { method: 'POST', body: data, baseUrl, token })
}

export async function updateQuotation({ id, data, baseUrl, token } = {}) {
  return request(`/api/quotations/${id}`, { method: 'PATCH', body: data, baseUrl, token })
}

export async function updateQuotationStatus({ id, status, baseUrl, token } = {}) {
  return request(`/api/quotations/${id}/status`, { method: 'PATCH', body: { status }, baseUrl, token })
}

export async function deleteQuotation({ id, baseUrl, token } = {}) {
  return request(`/api/quotations/${id}`, { method: 'DELETE', baseUrl, token })
}

export async function fetchQuotationSettings({ baseUrl, signal, token } = {}) {
  return request('/api/quotations/settings', { baseUrl, signal, token })
}

export async function updateQuotationSettings({ data, baseUrl, token } = {}) {
  return request('/api/quotations/settings', { method: 'PATCH', body: data, baseUrl, token })
}

export async function previewQuotationMessage({ data, baseUrl, token } = {}) {
  return request('/api/quotations/preview', { method: 'POST', body: data, baseUrl, token })
}

// -------------------------------------------------------------
// STAFF SCHEDULES & DUTY ASSIGNMENTS API
// -------------------------------------------------------------

export async function fetchSchedules({ staffId, scheduleType, isActive, baseUrl, token } = {}) {
  let path = '/api/schedules?'
  if (staffId) path += `staffId=${encodeURIComponent(staffId)}&`
  if (scheduleType) path += `scheduleType=${encodeURIComponent(scheduleType)}&`
  if (isActive !== undefined) path += `isActive=${isActive}&`
  return request(path.replace(/[&?]$/, ''), { baseUrl, token })
}

export async function fetchOnDutyStaff({ date, baseUrl, token } = {}) {
  let path = '/api/schedules/on-duty'
  if (date) path += `?date=${encodeURIComponent(date)}`
  return request(path, { baseUrl, token })
}

export async function createSchedule({ scheduleData, baseUrl, token } = {}) {
  return request('/api/schedules', { method: 'POST', body: scheduleData, baseUrl, token })
}

export async function updateSchedule({ id, scheduleData, baseUrl, token } = {}) {
  return request(`/api/schedules/${id}`, { method: 'PATCH', body: scheduleData, baseUrl, token })
}

export async function deleteSchedule({ id, baseUrl, token } = {}) {
  return request(`/api/schedules/${id}`, { method: 'DELETE', baseUrl, token })
}

export async function updateStaffColor({ staffId, color, name, baseUrl, token } = {}) {
  return request(`/api/schedules/staff-color/${staffId}`, {
    method: 'PATCH',
    body: { color, name },
    baseUrl,
    token,
  })
}

export async function fetchMySchedule({ baseUrl, token } = {}) {
  return request('/api/schedules/my-schedule', { baseUrl, token })
}

export async function fetchDuties({ status, staffId, priority, date, baseUrl, token } = {}) {
  let path = '/api/duties?'
  if (status && status !== 'all') path += `status=${encodeURIComponent(status)}&`
  if (staffId) path += `staffId=${encodeURIComponent(staffId)}&`
  if (priority) path += `priority=${encodeURIComponent(priority)}&`
  if (date) path += `date=${encodeURIComponent(date)}&`
  return request(path.replace(/[&?]$/, ''), { baseUrl, token })
}

export async function createDuty({ dutyData, baseUrl, token } = {}) {
  return request('/api/duties', { method: 'POST', body: dutyData, baseUrl, token })
}

export async function deleteDuty({ id, baseUrl, token } = {}) {
  return request(`/api/duties/${id}`, { method: 'DELETE', baseUrl, token })
}

export async function fetchMyDuties({ baseUrl, token } = {}) {
  return request('/api/duties/my-duties', { baseUrl, token })
}

export async function completeDutyAssignment({ assignmentId, notes, baseUrl, token } = {}) {
  return request(`/api/duties/assignments/${assignmentId}/complete`, {
    method: 'PATCH',
    body: { notes },
    baseUrl,
    token,
  })
}

export async function updateDutyAssignmentNotes({ assignmentId, notes, baseUrl, token } = {}) {
  return request(`/api/duties/assignments/${assignmentId}/notes`, {
    method: 'PATCH',
    body: { notes },
    baseUrl,
    token,
  })
}

export async function triggerDailyBriefing({ slot, baseUrl, token } = {}) {
  return request('/api/duties/send-daily-briefing', {
    method: 'POST',
    body: { slot },
    baseUrl,
    token,
  })
}

export async function subscribeWebPush({ subscription, baseUrl, token } = {}) {
  return request('/api/auth/web-push/subscribe', {
    method: 'POST',
    body: { subscription },
    baseUrl,
    token,
  })
}

export async function testWebPush({ subscription, baseUrl, token } = {}) {
  return request('/api/auth/web-push/test', {
    method: 'POST',
    body: subscription ? { subscription } : undefined,
    baseUrl,
    token,
  })
}

export async function getWebPushStatus({ baseUrl, token } = {}) {
  return request('/api/auth/web-push/status', {
    method: 'GET',
    baseUrl,
    token,
  })
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
}

