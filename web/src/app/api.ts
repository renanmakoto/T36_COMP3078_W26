const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hb-access');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hb-refresh');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('hb-access', access);
  localStorage.setItem('hb-refresh', refresh);
}

export function clearTokens() {
  localStorage.removeItem('hb-access');
  localStorage.removeItem('hb-refresh');
}

async function rawFetch(path: string, token: string | null, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers });
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let res = await rawFetch(path, getAccessToken(), options);
  if (res.status === 401) {
    const refresh = getRefreshToken();
    if (refresh) {
      const refreshRes = await fetch(`${API}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setTokens(data.access, refresh);
        res = await rawFetch(path, data.access, options);
      }
    }
  }
  return res;
}

// ---- Auth ----

export type UserData = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export type LoginResult = {
  access: string;
  refresh: string;
  user: UserData;
};

export async function apiLogin(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Invalid credentials.');
  }
  return res.json();
}

export async function apiRegister(email: string, password: string): Promise<UserData> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.email?.[0] || data.password?.[0] || data.detail || 'Registration failed.';
    throw new Error(msg);
  }
  return res.json();
}

// ---- Services ----

export type ServiceData = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
};

export async function apiGetServices(): Promise<ServiceData[]> {
  const res = await fetch(`${API}/services`);
  if (!res.ok) throw new Error('Failed to load services.');
  return res.json();
}

// ---- Availability ----

export async function apiGetAvailability(date: string, duration?: number): Promise<{ date: string; slots: string[] }> {
  const params = new URLSearchParams({ date });
  if (duration) params.set('duration', String(duration));
  const res = await fetch(`${API}/availability?${params}`);
  if (!res.ok) throw new Error('Failed to load availability.');
  return res.json();
}

// ---- Appointments (User) ----

export type AppointmentData = {
  id: string;
  service: ServiceData;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
};

export async function apiGetMyAppointments(): Promise<AppointmentData[]> {
  const res = await authFetch('/appointments?me=true');
  if (!res.ok) throw new Error('Failed to load appointments.');
  return res.json();
}

export async function apiCreateAppointment(serviceId: string, date: string, startTime: string): Promise<AppointmentData> {
  const res = await authFetch('/appointments', {
    method: 'POST',
    body: JSON.stringify({ service_id: serviceId, date, start_time: startTime }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.detail
      || (Array.isArray(data.start_time) ? data.start_time[0] : data.start_time)
      || (Array.isArray(data.service_id) ? data.service_id[0] : data.service_id)
      || 'Failed to create appointment.';
    throw new Error(msg);
  }
  return res.json();
}

export async function apiCancelAppointment(id: string): Promise<AppointmentData> {
  const res = await authFetch(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'cancel' }),
  });
  if (!res.ok) throw new Error('Failed to cancel appointment.');
  return res.json();
}

export async function apiRescheduleAppointment(id: string, date: string, startTime: string): Promise<AppointmentData> {
  const res = await authFetch(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reschedule', date, start_time: startTime }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to reschedule appointment.');
  }
  return res.json();
}

// ---- Admin Appointments ----

export type AdminAppointmentData = AppointmentData & {
  user: UserData;
};

export async function apiGetAllAppointments(filters?: { status?: string; date?: string }): Promise<AdminAppointmentData[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.date) params.set('date', filters.date);
  const qs = params.toString();
  const res = await authFetch(`/admin/appointments${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Failed to load appointments.');
  return res.json();
}

export async function apiAdminCancelAppointment(id: string): Promise<AdminAppointmentData> {
  const res = await authFetch(`/admin/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'cancel' }),
  });
  if (!res.ok) throw new Error('Failed to cancel appointment.');
  return res.json();
}

export async function apiAdminChangeStatus(id: string, status: string): Promise<AdminAppointmentData> {
  const res = await authFetch(`/admin/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'change_status', status }),
  });
  if (!res.ok) throw new Error('Failed to update appointment status.');
  return res.json();
}

// ---- Analytics ----

export async function apiBookingsPerDay(month: string): Promise<{ date: string; count: number }[]> {
  const res = await authFetch(`/admin/analytics/bookings-per-day?month=${month}`);
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}

export async function apiBookingsPerMonth(year: string): Promise<{ month: string; count: number }[]> {
  const res = await authFetch(`/admin/analytics/bookings-per-month?year=${year}`);
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}

export async function apiTopServices(): Promise<{ service_name: string; count: number }[]> {
  const res = await authFetch(`/admin/analytics/top-services`);
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}

export async function apiNoShowRate(): Promise<{ total_appointments: number; no_shows: number; no_show_rate_percent: number }> {
  const res = await authFetch(`/admin/analytics/no-show-rate`);
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}
