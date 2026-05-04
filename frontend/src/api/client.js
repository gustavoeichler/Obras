import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

/** Axios instance that injects the JWT header on every request */
export function authed(multipart = false) {
  const token = localStorage.getItem('obras_token')
  return axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: {
      ...(multipart ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

// ── Generic CRUD factory for a base URL ───────────────────────
function crud(base) {
  return {
    list:   (params)   => authed().get(base, { params }).then(r => r.data),
    get:    (id)       => authed().get(`${base}/${id}`).then(r => r.data),
    create: (data)     => authed().post(base, data).then(r => r.data),
    update: (id, data) => authed().put(`${base}/${id}`, data).then(r => r.data),
    delete: (id)       => authed().delete(`${base}/${id}`),
  }
}

// ── Project-scoped API factory ────────────────────────────────
// Every feature belongs to a project; this factory keeps the
// /api/projects/:id prefix out of individual call sites.
export const project = (id) => ({
  expenses:   crud(`/api/projects/${id}/expenses`),

  budgets: {
    ...crud(`/api/projects/${id}/budgets`),
    alerts: () => authed().get(`/api/projects/${id}/budgets/alerts`).then(r => r.data),
  },

  categories: crud(`/api/projects/${id}/categories`),
  suppliers:  crud(`/api/projects/${id}/suppliers`),

  bom: {
    ...crud(`/api/projects/${id}/bom`),
    optimize: (payload) => authed().post(`/api/projects/${id}/bom/optimize`, payload).then(r => r.data),
  },

  documents: {
    list:   (type) => authed().get(
      `/api/projects/${id}/documents`,
      { params: type ? { type } : {} },
    ).then(r => r.data),
    upload: (formData) => authed(true).post(
      `/api/projects/${id}/documents`,
      formData,
    ).then(r => r.data),
    delete: (docId) => authed().delete(`/api/projects/${id}/documents/${docId}`),
    downloadUrl: (docId, inline = false) =>
      `/api/projects/${id}/documents/${docId}/download${inline ? '?inline=1' : ''}`,
  },

  stages: {
    list:   ()               => authed().get(`/api/projects/${id}/stages`).then(r => r.data),
    create: (data)           => authed().post(`/api/projects/${id}/stages`, data).then(r => r.data),
    update: (stageId, data)  => authed().patch(`/api/stages/${stageId}`, data).then(r => r.data),
    delete: (stageId)        => authed().delete(`/api/stages/${stageId}`),
    order:  (stageIds)       => authed()
      .patch(`/api/projects/${id}/stages/order`, { stage_ids: stageIds })
      .then(r => r.data),
  },

  analytics: {
    summary:   () => authed().get(`/api/projects/${id}/analytics/summary`).then(r => r.data),
    sCurve:    () => authed().get(`/api/projects/${id}/analytics/s-curve`).then(r => r.data),
    costPerM2: () => authed().get(`/api/projects/${id}/analytics/cost-per-m2`).then(r => r.data),
    deviation: () => authed().get(`/api/projects/${id}/analytics/budget-deviation`).then(r => r.data),
    forecast:  () => authed().get(`/api/projects/${id}/analytics/forecast`).then(r => r.data),
  },

  dashboard: () => authed().get(`/api/projects/${id}/dashboard`).then(r => r.data),

  health: () => authed().get(`/api/projects/${id}/health`).then(r => r.data),

  timeline: (params) => authed().get(`/api/projects/${id}/timeline`, { params }).then(r => r.data),

  dailyReports: {
    list:   (params)        => authed().get(`/api/projects/${id}/daily-reports`, { params }).then(r => r.data),
    get:    (rid)           => authed().get(`/api/projects/${id}/daily-reports/${rid}`).then(r => r.data),
    create: (data)          => authed().post(`/api/projects/${id}/daily-reports`, data).then(r => r.data),
    update: (rid, data)     => authed().patch(`/api/projects/${id}/daily-reports/${rid}`, data).then(r => r.data),
    delete: (rid)           => authed().delete(`/api/projects/${id}/daily-reports/${rid}`),
    addOccurrence:    (rid, data)      => authed().post(`/api/projects/${id}/daily-reports/${rid}/occurrences`, data).then(r => r.data),
    deleteOccurrence: (rid, occId)     => authed().delete(`/api/projects/${id}/daily-reports/${rid}/occurrences/${occId}`),
    pdfUrl:    (rid) => `/api/projects/${id}/daily-reports/${rid}/generate-pdf`,
    shareLink: (rid) => authed().get(`/api/projects/${id}/daily-reports/${rid}/share-link`).then(r => r.data),
    expenseBenchmark: (eid) =>
      authed().get(`/api/projects/${id}/expenses/${eid}/benchmark`).then(r => r.data),
  },
})

// ── Cross-project endpoints ────────────────────────────────
export const healthApi = {
  summary: () => authed().get('/api/projects/health-summary').then(r => r.data),
}

export const priceIntelligenceApi = {
  benchmark: (params) => authed().get('/api/price-intelligence/benchmark', { params }).then(r => r.data),
  overview:  ()       => authed().get('/api/price-intelligence/overview').then(r => r.data),
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login:    (data) => api.post('/auth/login',    data).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
}

// ── Multi-tenant Projects (list / detail / invite / photos) ───
export const projectsApi = {
  list:         ()             => authed().get('/api/projects/').then(r => r.data),
  create:       (data)         => authed().post('/api/projects/', data).then(r => r.data),
  get:          (id)           => authed().get(`/api/projects/${id}`).then(r => r.data),
  update:       (id, data)     => authed().patch(`/api/projects/${id}`, data).then(r => r.data),
  getStats:     (id)           => authed().get(`/api/projects/${id}/stats`).then(r => r.data),
  sendInvite:   (id, email)    => authed().post(`/api/projects/${id}/invite`, { email }).then(r => r.data),
  getInvite:    (token)        => api.get(`/api/invite/${token}`).then(r => r.data),
  acceptInvite: (token)        => authed().post(`/api/invite/${token}/accept`).then(r => r.data),
  uploadPhoto:  (id, formData) => authed(true).post(`/api/projects/${id}/photos`, formData).then(r => r.data),
  getFeed:      (id)           => authed().get(`/api/projects/${id}/feed`).then(r => r.data),
}

// ── Stage / Task / Workflow (stage- and task-id scoped) ────────
export const projectStagesApi = {
  orderStages:    (projectId, stageIds) => authed().patch(`/api/projects/${projectId}/stages/order`, { stage_ids: stageIds }).then(r => r.data),
  update:         (stageId, data)   => authed().patch(`/api/stages/${stageId}`, data).then(r => r.data),
  delete:         (stageId)         => authed().delete(`/api/stages/${stageId}`),
  updateStatus:   (stageId, data)   => authed().patch(`/api/stages/${stageId}/status`, data).then(r => r.data),
  lockStage:      (stageId)         => authed().patch(`/api/stages/${stageId}/lock`).then(r => r.data),
  unlockStage:    (stageId)         => authed().patch(`/api/stages/${stageId}/unlock`).then(r => r.data),
  getWorkflow:    (stageId)         => authed().get(`/api/stages/${stageId}/workflow`).then(r => r.data),

  createChecklist: (stageId, data)    => authed().post(`/api/stages/${stageId}/checklists`, data).then(r => r.data),
  listChecklists:  (stageId)          => authed().get(`/api/stages/${stageId}/checklists`).then(r => r.data),
  toggleChecklist: (itemId, data)     => authed().patch(`/api/checklists/${itemId}/toggle`, data).then(r => r.data),
  deleteChecklist: (itemId)           => authed().delete(`/api/checklists/${itemId}`),

  createApproval:  (stageId, data)    => authed().post(`/api/stages/${stageId}/approvals`, data).then(r => r.data),
  listApprovals:   (stageId)          => authed().get(`/api/stages/${stageId}/approvals`).then(r => r.data),
  reviewApproval:  (approvalId, data) => authed().patch(`/api/approvals/${approvalId}/review`, data).then(r => r.data),
  deleteApproval:  (approvalId)       => authed().delete(`/api/approvals/${approvalId}`),
}

export const tasksApi = {
  list:   (stageId)       => authed().get(`/api/stages/${stageId}/tasks`).then(r => r.data),
  create: (stageId, data) => authed().post(`/api/stages/${stageId}/tasks`, data).then(r => r.data),
  update: (id, data)      => authed().patch(`/api/tasks/${id}`, data).then(r => r.data),
  delete: (id)            => authed().delete(`/api/tasks/${id}`),
}

// ── Helpers ───────────────────────────────────────────────────
export const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')
}

export const STAGE_STATUSES = [
  { value: 'nao_iniciada', label: 'Não iniciada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida',    label: 'Concluída'    },
]

export const STAGE_STATUS_LABEL = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida:    'Concluída',
}
