'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import { ArrowLeft, Key, FileText } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { patientsApi, reportsApi } from '@/lib/api'
import { Patient, Report } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PatientDetailPage() {
  const { id } = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!id) return
    patientsApi.get(Number(id)).then(r => setPatient(r.data)).catch(() => {})
    reportsApi.list({ patient: Number(id) }).then(r => setReports(r.data.results)).catch(() => {})
  }, [id])

  const handleCreateAccess = async () => {
    if (!patient) return
    setCreating(true)
    try {
      const res = await patientsApi.createPortalAccess(patient.id)
      toast.success(`Acesso criado!\nUsuário: ${res.data.username}\nSenha: ${res.data.temp_password}`, { duration: 10000 })
      patientsApi.get(patient.id).then(r => setPatient(r.data))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar acesso.'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  if (!patient) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <Toaster position="top-right" />
      <div className="flex items-center gap-4">
        <Link href="/patients" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-sm text-gray-500 font-mono">{patient.protocol}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="font-semibold">Dados do Paciente</h2></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div><span className="text-gray-500">CPF:</span> <span className="ml-2">{patient.cpf || '—'}</span></div>
            <div><span className="text-gray-500">Nascimento:</span> <span className="ml-2">{patient.birth_date ? format(new Date(patient.birth_date), 'dd/MM/yyyy') : '—'}</span></div>
            <div><span className="text-gray-500">Telefone:</span> <span className="ml-2">{patient.phone || '—'}</span></div>
            <div><span className="text-gray-500">E-mail:</span> <span className="ml-2">{patient.email || '—'}</span></div>
            <div><span className="text-gray-500">Endereço:</span> <span className="ml-2">{patient.address || '—'}</span></div>
            {patient.notes && <div><span className="text-gray-500">Obs:</span> <span className="ml-2">{patient.notes}</span></div>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Portal do Paciente</h2></CardHeader>
          <CardBody className="space-y-4">
            {patient.portal_active ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
                <Key size={16} />
                <div>
                  <p className="font-medium">Acesso ativo</p>
                  <p className="text-xs text-green-600">Usuário: {patient.portal_username}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">Paciente ainda não possui acesso ao portal.</p>
                <Button onClick={handleCreateAccess} loading={creating} disabled={!patient.email}>
                  <Key size={14} className="mr-2" /> Criar Acesso
                </Button>
                {!patient.email && <p className="text-xs text-red-500 mt-2">Cadastre um e-mail primeiro.</p>}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><FileText size={18} /> Laudos ({reports.length})</h2>
          <Link href={`/reports?patient=${patient.id}`}>
            <Button variant="secondary" size="sm">Ver todos</Button>
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.length === 0 && <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-500">Nenhum laudo.</td></tr>}
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link href={`/reports/${r.id}`} className="text-blue-600 hover:underline">{r.title}</Link>
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{format(new Date(r.created_at), 'dd/MM/yyyy', { locale: ptBR })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
