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
  const url = `${baseUrl?.replace(/\/$/, '') || ''}${path}`
  console.log(`[API] ${method} ${url}`, { body });
  const authToken = token || localStorage.getItem('token')

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
          const refreshRes = await fetch(`${baseUrl?.replace(/\/$/, '') || ''}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            localStorage.setItem('token', refreshData.accessToken)
            
            // Retry the original request with new token
            headers['Authorization'] = `Bearer ${refreshData.accessToken}`
            const retryRes = await fetch(url, { ...options, headers })
            return await retryRes.json()
          }
        } catch (e) {
          console.error('[API] Auto-refresh failed:', e)
        }
      }

      // If refresh failed or no token, logout
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login'
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

export async function fetchPassenger({ baseUrl, signal } = {}) {
  // Use portal if user is a passenger, or admin/passengers/me if we add that.
  // For now, portal/me is for passengers.
  return request('/api/portal/me', { baseUrl, signal })
}

export async function fetchFlights({ baseUrl, signal } = {}) {
  return request('/api/portal/bookings', { baseUrl, signal })
}

export async function fetchNotifications({ baseUrl, signal } = {}) {
  return request('/api/portal/notifications', { baseUrl, signal })
}

export async function submitBookingRequest({ departureCity, destination, date, notes, isReturn, returnDate, passengers, baseUrl, signal } = {}) {
  return request('/api/portal/booking-requests', {
    method: 'POST',
    body: { departureCity, destination, date, notes, isReturn, returnDate, passengers },
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

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
}

