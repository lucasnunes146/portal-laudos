export type UserRole = 'admin' | 'secretary' | 'doctor' | 'patient'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  phone: string
  totp_enabled: boolean
  clinic: number | null
  clinic_name: string | null
  date_joined: string
}

export interface Clinic {
  id: number
  name: string
  cnpj: string
  phone: string
  email: string
  address: string
  is_active: boolean
  created_at: string
  settings?: ClinicSettings
}

export interface ClinicSettings {
  logo_url: string | null
  primary_color: string
  secondary_color: string
  portal_title: string
  portal_subtitle: string
  welcome_message: string
  footer_text: string
}

export interface Patient {
  id: number
  protocol: string
  name: string
  cpf: string
  birth_date: string | null
  phone: string
  email: string
  address: string
  notes: string
  reports_count: number
  portal_active: boolean
  portal_username: string | null
  created_at: string
  updated_at: string
}

export type ReportStatus = 'uploaded' | 'approved' | 'signed' | 'published' | 'rejected'

export interface Report {
  id: number
  patient: number
  patient_name: string
  patient_protocol: string
  title: string
  description: string
  file_name: string
  file_size: number
  file_hash: string
  status: ReportStatus
  status_display: string
  uploaded_by_name: string | null
  approved_by_name: string | null
  signed_by_name: string | null
  digital_signature: string
  signature_metadata: Record<string, unknown>
  approved_at: string | null
  signed_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  action: string
  action_display: string
  user: number | null
  user_name: string
  report: number | null
  report_title: string | null
  description: string
  ip_address: string | null
  extra_data: Record<string, unknown>
  created_at: string
}

export interface DashboardData {
  patients: { total: number; new_this_month: number }
  reports: {
    total: number
    pending: number
    signed: number
    published: number
    by_status: Array<{ status: string; count: number }>
  }
  recent_activity: Array<{
    id: number
    action: string
    action_display: string
    user: string
    report_title: string | null
    created_at: string
  }>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
