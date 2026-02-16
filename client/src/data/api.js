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

async function request(path, { method = 'GET', body, baseUrl, signal } = {}) {
  const url = `${baseUrl?.replace(/\/$/, '') || ''}${path}`
  console.log(`[API] ${method} ${url}`, { body });
  const token = localStorage.getItem('token')

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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

    if (res.status === 401) {
      localStorage.removeItem('token')
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

export async function updateProfile({ fullName, phone, baseUrl }) {
  return request('/api/portal/update-profile', {
    method: 'POST',
    body: { fullName, phone },
    baseUrl
  })
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
}

