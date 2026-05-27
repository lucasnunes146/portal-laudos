'use client'
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { auditApi } from '@/lib/api'
import { AuditLog } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await auditApi.list({ action: actionFilter || undefined })
      setLogs(res.data.results)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [actionFilter])

  const actions = [
    { value: '', label: 'Todos' },
    { value: 'login', label: 'Login' },
    { value: 'upload', label: 'Upload' },
    { value: 'approve', label: 'Aprovação' },
    { value: 'sign', label: 'Assinatura' },
    { value: 'publish', label: 'Publicação' },
    { value: 'download', label: 'Download' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <p className="text-sm text-gray-500 mt-1">Registro completo de ações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            {actions.map(a => (
              <button key={a.value} onClick={() => setActionFilter(a.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${actionFilter === a.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {a.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Laudo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum log encontrado.</td></tr>}
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {log.action_display}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-700">{log.user_name}</td>
                  <td className="px-6 py-3 text-gray-600 text-xs">{log.report_title || '—'}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
