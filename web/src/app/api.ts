const API = process.env.NEXT_PUBLIC_API_URL || '/api-proxy';
const SESSION_CHANGE_EVENT = 'hb-session-change';

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

export function clearSessionStorage() {
  if (typeof window === 'undefined') return;
  clearTokens();
  localStorage.removeItem('hb-role');
  localStorage.removeItem('hb-name');
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.non_field_errors?.[0] === 'string') return data.non_field_errors[0];

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

async function rawFetch(path: string, token: string | null, options: RequestInit = {}): Promise<Response> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) || {}) };
  if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;
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
      } else {
        clearSessionStorage();
      }
    } else {
      clearSessionStorage();
    }
  }
  if (res.status === 401) {
    clearSessionStorage();
  }
  return res;
}

export type UserData = {
  id: string;
  email: string;
  display_name: string;
  phone: string;
  role: 'USER' | 'ADMIN';
};

export type LoginResult = {
  access: string;
  refresh: string;
  user: UserData;
};

export type AccountDeletionResult = {
  result: 'deleted';
  deleted_email: string;
};

export type AddOnData = {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  duration_minutes: number;
  sort_order: number;
};

export type ServiceSummaryData = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  image_url: string;
};

export type ServiceData = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  payment_note: string;
  duration_minutes: number;
  price_cents: number;
  sort_order: number;
  available_add_ons: AddOnData[];
};

export type AppointmentData = {
  id: string;
  service: ServiceSummaryData;
  add_ons: AddOnData[];
  start_time: string;
  end_time: string;
  total_price_cents: number;
  total_duration_minutes: number;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AdminAppointmentData = AppointmentData & {
  user: UserData;
};

export type PortfolioItemData = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  tag: string;
  created_at: string;
  updated_at: string;
};

export type BlogPostSummaryData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type BlogPostDetailData = BlogPostSummaryData & {
  body: string;
  created_by?: UserData | null;
};

export type TestimonialData = {
  id: string;
  author_name: string;
  quote: string;
  rating: number;
  service?: ServiceSummaryData | null;
  created_at: string;
};

export type HomeContentData = {
  featured_services: ServiceData[];
  featured_portfolio: PortfolioItemData[];
  featured_blog_posts: BlogPostSummaryData[];
  featured_testimonials: TestimonialData[];
};

export type AdminAnalyticsOverviewData = {
  total_bookings: number;
  upcoming_bookings: number;
  today_bookings: number;
  scheduled_revenue_cents: number;
  completed_revenue_cents: number;
  this_month_revenue_cents: number;
  unique_clients: number;
  returning_clients: number;
  new_clients_this_month: number;
};

export type AdminServiceData = ServiceData & {
  is_featured_home: boolean;
  home_order: number;
  is_active: boolean;
  created_at: string;
};

export type AdminAddOnData = AddOnData & {
  is_active: boolean;
  services: ServiceSummaryData[];
  created_at: string;
};

export type AdminPortfolioItemData = PortfolioItemData & {
  is_published: boolean;
  is_featured_home: boolean;
  home_order: number;
};

export type AdminBlogPostData = BlogPostDetailData & {
  is_published: boolean;
  is_featured_home: boolean;
  home_order: number;
};

export type AdminTestimonialData = TestimonialData & {
  author_email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes: string;
  is_featured_home: boolean;
  home_order: number;
  updated_at: string;
};

export async function apiLogin(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Invalid credentials.'));
  }
  return res.json();
}

export async function apiRegister(email: string, password: string, displayName = '', phone = ''): Promise<UserData> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName, phone }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Registration failed.'));
  }
  return res.json();
}

export async function apiDeleteAccount(): Promise<AccountDeletionResult> {
  const res = await authFetch('/auth/account', {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to delete account.'));
  }
  return res.json();
}

export async function apiGetHomeContent(): Promise<HomeContentData> {
  const res = await fetch(`${API}/home-content`);
  if (!res.ok) throw new Error('Failed to load home content.');
  return res.json();
}

export async function apiGetServices(): Promise<ServiceData[]> {
  const res = await fetch(`${API}/services`);
  if (!res.ok) throw new Error('Failed to load services.');
  return res.json();
}

export async function apiGetPortfolioItems(): Promise<PortfolioItemData[]> {
  const res = await fetch(`${API}/portfolio`);
  if (!res.ok) throw new Error('Failed to load portfolio.');
  return res.json();
}

export async function apiGetBlogPosts(): Promise<BlogPostSummaryData[]> {
  const res = await fetch(`${API}/blog-posts`);
  if (!res.ok) throw new Error('Failed to load blog posts.');
  return res.json();
}

export async function apiGetBlogPost(slug: string): Promise<BlogPostDetailData> {
  const res = await fetch(`${API}/blog-posts/${slug}`);
  if (!res.ok) throw new Error('Failed to load blog post.');
  return res.json();
}

export async function apiGetTestimonials(): Promise<TestimonialData[]> {
  const res = await fetch(`${API}/testimonials`);
  if (!res.ok) throw new Error('Failed to load testimonials.');
  return res.json();
}

export async function apiCreateTestimonial(payload: {
  author_name?: string;
  quote: string;
  rating: number;
  service_id?: string;
}): Promise<TestimonialData> {
  const res = await authFetch('/testimonials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to submit testimonial.'));
  }
  return res.json();
}

export async function apiGetAvailability(date: string, duration?: number): Promise<{ date: string; slots: string[] }> {
  const params = new URLSearchParams({ date });
  if (duration) params.set('duration', String(duration));
  const res = await fetch(`${API}/availability?${params}`);
  if (!res.ok) throw new Error('Failed to load availability.');
  return res.json();
}

export async function apiGetMyAppointments(): Promise<AppointmentData[]> {
  const res = await authFetch('/appointments?me=true');
  if (!res.ok) throw new Error('Failed to load appointments.');
  return res.json();
}

export async function apiCreateAppointment(payload: {
  service_id: string;
  add_on_ids?: string[];
  date: string;
  start_time: string;
  notes?: string;
}): Promise<AppointmentData> {
  const res = await authFetch('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to create appointment.'));
  }
  return res.json();
}

export async function apiCancelAppointment(id: string): Promise<AppointmentData> {
  const res = await authFetch(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'cancel' }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to cancel appointment.'));
  return res.json();
}

export async function apiRescheduleAppointment(id: string, date: string, startTime: string): Promise<AppointmentData> {
  const res = await authFetch(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reschedule', date, start_time: startTime }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to reschedule appointment.'));
  }
  return res.json();
}

export async function apiResolveBookingLink(token: string): Promise<{ action: string; appointment: AppointmentData }> {
  const params = new URLSearchParams({ token });
  const res = await fetch(`${API}/booking-links/resolve?${params}`);
  if (!res.ok) throw new Error(await parseError(res, 'Failed to open booking link.'));
  return res.json();
}

export async function apiCancelBookingLink(token: string): Promise<{ result: string; appointment: AppointmentData }> {
  const res = await fetch(`${API}/booking-links/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to cancel appointment.'));
  return res.json();
}

export async function apiRescheduleBookingLink(
  token: string,
  date: string,
  startTime: string,
): Promise<{ result: string; appointment: AppointmentData }> {
  const res = await fetch(`${API}/booking-links/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, date, start_time: startTime }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to reschedule appointment.'));
  return res.json();
}

export async function apiGetAllAppointments(filters?: { status?: string; date?: string }): Promise<AdminAppointmentData[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.date) params.set('date', filters.date);
  const qs = params.toString();
  const res = await authFetch(`/admin/appointments${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to load appointments.');
  return res.json();
}

export async function apiAdminCreateAppointment(payload: {
  customer_email: string;
  customer_name?: string;
  service_id: string;
  add_on_ids?: string[];
  date: string;
  start_time: string;
  status?: string;
  notes?: string;
}): Promise<AdminAppointmentData> {
  const res = await authFetch('/admin/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to create appointment.'));
  return res.json();
}

export async function apiAdminUpdateAppointment(
  id: string,
  payload: Record<string, unknown>,
): Promise<AdminAppointmentData> {
  const res = await authFetch(`/admin/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to update appointment.'));
  return res.json();
}

export async function apiAdminCancelAppointment(id: string): Promise<AdminAppointmentData> {
  return apiAdminUpdateAppointment(id, { action: 'cancel' });
}

export async function apiAdminChangeStatus(id: string, status: string): Promise<AdminAppointmentData> {
  return apiAdminUpdateAppointment(id, { action: 'change_status', status });
}

export async function apiGetAdminServices(): Promise<AdminServiceData[]> {
  const res = await authFetch('/admin/services');
  if (!res.ok) throw new Error('Failed to load services.');
  return res.json();
}

export async function apiUploadAdminImage(
  file: File,
  kind: 'service' | 'portfolio' | 'blog' | 'misc',
): Promise<{ url: string; path: string; name: string; size: number; content_type: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  const res = await authFetch('/admin/uploads/image', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to upload image.'));
  return res.json();
}

export async function apiCreateAdminService(payload: Record<string, unknown>): Promise<AdminServiceData> {
  const res = await authFetch('/admin/services', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to create service.'));
  return res.json();
}

export async function apiUpdateAdminService(id: string, payload: Record<string, unknown>): Promise<AdminServiceData> {
  const res = await authFetch(`/admin/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to update service.'));
  return res.json();
}

export async function apiDeleteAdminService(id: string): Promise<void> {
  const res = await authFetch(`/admin/services/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete service.'));
}

export async function apiGetAdminAddOns(): Promise<AdminAddOnData[]> {
  const res = await authFetch('/admin/add-ons');
  if (!res.ok) throw new Error('Failed to load add-ons.');
  return res.json();
}

export async function apiCreateAdminAddOn(payload: Record<string, unknown>): Promise<AdminAddOnData> {
  const res = await authFetch('/admin/add-ons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to create add-on.'));
  return res.json();
}

export async function apiUpdateAdminAddOn(id: string, payload: Record<string, unknown>): Promise<AdminAddOnData> {
  const res = await authFetch(`/admin/add-ons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to update add-on.'));
  return res.json();
}

export async function apiDeleteAdminAddOn(id: string): Promise<void> {
  const res = await authFetch(`/admin/add-ons/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete add-on.'));
}

export async function apiGetAdminPortfolioItems(): Promise<AdminPortfolioItemData[]> {
  const res = await authFetch('/admin/portfolio-items');
  if (!res.ok) throw new Error('Failed to load portfolio items.');
  return res.json();
}

export async function apiCreateAdminPortfolioItem(payload: Record<string, unknown>): Promise<AdminPortfolioItemData> {
  const res = await authFetch('/admin/portfolio-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to create portfolio item.'));
  return res.json();
}

export async function apiUpdateAdminPortfolioItem(
  id: string,
  payload: Record<string, unknown>,
): Promise<AdminPortfolioItemData> {
  const res = await authFetch(`/admin/portfolio-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to update portfolio item.'));
  return res.json();
}

export async function apiDeleteAdminPortfolioItem(id: string): Promise<void> {
  const res = await authFetch(`/admin/portfolio-items/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete portfolio item.'));
}

export async function apiGetAdminBlogPosts(): Promise<AdminBlogPostData[]> {
  const res = await authFetch('/admin/blog-posts');
  if (!res.ok) throw new Error('Failed to load blog posts.');
  return res.json();
}

export async function apiCreateAdminBlogPost(payload: Record<string, unknown>): Promise<AdminBlogPostData> {
  const res = await authFetch('/admin/blog-posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to create blog post.'));
  return res.json();
}

export async function apiUpdateAdminBlogPost(id: string, payload: Record<string, unknown>): Promise<AdminBlogPostData> {
  const res = await authFetch(`/admin/blog-posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to update blog post.'));
  return res.json();
}

export async function apiDeleteAdminBlogPost(id: string): Promise<void> {
  const res = await authFetch(`/admin/blog-posts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete blog post.'));
}

export async function apiGetAdminTestimonials(): Promise<AdminTestimonialData[]> {
  const res = await authFetch('/admin/testimonials');
  if (!res.ok) throw new Error('Failed to load testimonials.');
  return res.json();
}

export async function apiCreateAdminTestimonial(payload: Record<string, unknown>): Promise<AdminTestimonialData> {
  const res = await authFetch('/admin/testimonials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to create testimonial.'));
  return res.json();
}

export async function apiUpdateAdminTestimonial(
  id: string,
  payload: Record<string, unknown>,
): Promise<AdminTestimonialData> {
  const res = await authFetch(`/admin/testimonials/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to update testimonial.'));
  return res.json();
}

export async function apiBookingsPerDay(month: string): Promise<{ date: string; count: number }[]> {
  const res = await authFetch(`/admin/analytics/bookings-per-day?month=${month}`);
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}

export async function apiAnalyticsOverview(): Promise<AdminAnalyticsOverviewData> {
  const res = await authFetch('/admin/analytics/overview');
  if (!res.ok) throw new Error('Failed to load analytics overview.');
  return res.json();
}

export async function apiBookingsPerMonth(year: string): Promise<{ month: string; count: number }[]> {
  const res = await authFetch(`/admin/analytics/bookings-per-month?year=${year}`);
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}

export async function apiTopServices(): Promise<{ service_name: string; count: number }[]> {
  const res = await authFetch('/admin/analytics/top-services');
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}

export async function apiNoShowRate(): Promise<{
  total_appointments: number;
  no_shows: number;
  no_show_rate_percent: number;
}> {
  const res = await authFetch('/admin/analytics/no-show-rate');
  if (!res.ok) throw new Error('Failed to load analytics.');
  return res.json();
}
