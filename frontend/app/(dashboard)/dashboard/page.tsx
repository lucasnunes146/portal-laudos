'use client'
import { useEffect, useState } from 'react'
import { Users, FileText, CheckCircle, Clock } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { dashboardApi } from '@/lib/api'
import { DashboardData } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Users; label: string; value: number; sub?: string; color: string
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    dashboardApi.get().then(res => setData(res.data)).catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da clínica</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Pacientes" value={data.patients.total}
          sub={`+${data.patients.new_this_month} este mês`} color="bg-blue-600" />
        <StatCard icon={FileText} label="Total de Laudos" value={data.reports.total} color="bg-indigo-600" />
        <StatCard icon={Clock} label="Aguardando" value={data.reports.pending} color="bg-yellow-500" />
        <StatCard icon={CheckCircle} label="Publicados" value={data.reports.published} color="bg-green-600" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Atividade Recente</h2>
        </CardHeader>
        <CardBody className="p-0">
          <ul className="divide-y divide-gray-100">
            {data.recent_activity.length === 0 && (
              <li className="px-6 py-8 text-center text-sm text-gray-500">Nenhuma atividade recente.</li>
            )}
            {data.recent_activity.map((item) => (
              <li key={item.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">{item.action_display}</span>
                  {item.report_title && (
                    <span className="text-sm text-gray-500"> — {item.report_title}</span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">por {item.user}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
