'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { Building2, Users, FileText, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { superAdminApi, authApi } from '@/lib/api'
import { SuperAdminClinic, SuperAdminDashboard } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PLAN_LABELS: Record<string, string> = { free: 'Gratuito', basic: 'Básico', pro: 'Profissional' }
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<SuperAdminDashboard | null>(null)
  const [clinics, setClinics] = useState<SuperAdminClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authApi.me().then(r => {
      if (r.data.role !== 'superadmin') router.replace('/dashboard')
    }).catch(() => router.replace('/login'))

    Promise.all([
      superAdminApi.dashboard(),
      superAdminApi.listClinics(),
    ]).then(([s, c]) => {
      setStats(s.data)
      setClinics(c.data)
    }).catch(() => toast.error('Erro ao carregar dados.'))
    .finally(() => setLoading(false))
  }, [router])

  const openEdit = (c: SuperAdminClinic) => {
    setEditId(c.id)
    setEditData({
      plan: c.plan,
      license_active: c.license_active,
      license_valid_until: c.license_valid_until || '',
      license_notes: c.license_notes,
      is_active: c.is_active,
    })
  }

  const saveEdit = async () => {
    if (!editId) return
    setSaving(true)
    try {
      await superAdminApi.updateClinic(editId, editData)
      const res = await superAdminApi.listClinics()
      setClinics(res.data)
      setEditId(null)
      toast.success('Licença atualizada!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Console Super Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie clientes e licenças do sistema</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total de clientes', value: stats.total_clinics, icon: Building2, color: 'text-blue-600' },
            { label: 'Licenças ativas', value: stats.active_clinics, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Licenças inativas', value: stats.inactive_clinics, icon: XCircle, color: 'text-red-600' },
            { label: 'Total de pacientes', value: stats.total_patients, icon: Users, color: 'text-purple-600' },
            { label: 'Total de laudos', value: stats.total_reports, icon: FileText, color: 'text-orange-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardBody className="flex items-center gap-3 py-4">
                <Icon size={22} className={color} />
                <div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold">Clientes ({clinics.length})</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clínica</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Licença</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Válida até</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuários</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pacientes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clinics.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[c.plan] || 'bg-gray-100 text-gray-600'}`}>
                      {PLAN_LABELS[c.plan] || c.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.license_active && c.is_active
                      ? <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium"><CheckCircle size={12} /> Ativa</span>
                      : <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle size={12} /> Inativa</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.license_valid_until
                      ? format(new Date(c.license_valid_until), 'dd/MM/yyyy', { locale: ptBR })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.users_count}</td>
                  <td className="px-4 py-3 text-gray-600">{c.patients_count}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Gerenciar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-gray-900 mb-4">Gerenciar Licença</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editData.plan as string}
                  onChange={e => setEditData(d => ({ ...d, plan: e.target.value }))}
                >
                  <option value="free">Gratuito</option>
                  <option value="basic">Básico</option>
                  <option value="pro">Profissional</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="lic_active"
                  checked={editData.license_active as boolean}
                  onChange={e => setEditData(d => ({ ...d, license_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="lic_active" className="text-sm font-medium text-gray-700">Licença ativa</label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cli_active"
                  checked={editData.is_active as boolean}
                  onChange={e => setEditData(d => ({ ...d, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="cli_active" className="text-sm font-medium text-gray-700">Clínica ativa</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />Válida até
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editData.license_valid_until as string}
                  onChange={e => setEditData(d => ({ ...d, license_valid_until: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Ex: Vencimento em 30 dias, cliente VIP..."
                  value={editData.license_notes as string}
                  onChange={e => setEditData(d => ({ ...d, license_notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <Button variant="secondary" onClick={() => setEditId(null)}>Cancelar</Button>
              <Button onClick={saveEdit} loading={saving}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
