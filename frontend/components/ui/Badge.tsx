import { clsx } from 'clsx'
import { ReportStatus } from '@/lib/types'

const statusConfig: Record<ReportStatus, { label: string; className: string }> = {
  uploaded: { label: 'Enviado', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprovado', className: 'bg-blue-100 text-blue-800' },
  signed: { label: 'Assinado', className: 'bg-purple-100 text-purple-800' },
  published: { label: 'Publicado', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' },
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-red-100 text-red-800' },
    secretary: { label: 'Secretária', className: 'bg-orange-100 text-orange-800' },
    doctor: { label: 'Médica', className: 'bg-blue-100 text-blue-800' },
    patient: { label: 'Paciente', className: 'bg-green-100 text-green-800' },
  }
  const c = config[role] || { label: role, className: 'bg-gray-100 text-gray-800' }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', c.className)}>
      {c.label}
    </span>
  )
}
