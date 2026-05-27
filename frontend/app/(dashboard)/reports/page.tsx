'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from 'react-hot-toast'
import { Upload, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import { reportsApi, patientsApi } from '@/lib/api'
import { Report, Patient } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UploadForm { title: string; description: string }

function ReportsContent() {
  const searchParams = useSearchParams()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset } = useForm<UploadForm>()

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (statusFilter) params.status = statusFilter
      const pid = searchParams.get('patient')
      if (pid) params.patient = pid
      const res = await reportsApi.list(params)
      setReports(res.data.results)
    } catch { toast.error('Erro ao carregar laudos.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const searchPatients = async (q: string) => {
    if (q.length < 2) { setPatientSuggestions([]); return }
    const res = await patientsApi.search(q)
    setPatientSuggestions(res.data)
  }

  const onSubmit = async (data: UploadForm) => {
    if (!selectedPatient) { toast.error('Selecione um paciente.'); return }
    if (!fileRef.current?.files?.[0]) { toast.error('Selecione um arquivo.'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', data.title)
      fd.append('description', data.description)
      fd.append('patient', String(selectedPatient.id))
      fd.append('file', fileRef.current.files[0])
      await reportsApi.upload(fd)
      toast.success('Laudo enviado com sucesso!')
      reset(); setShowUpload(false); setSelectedPatient(null); load()
    } catch { toast.error('Erro ao enviar laudo.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laudos</h1>
          <p className="text-sm text-gray-500 mt-1">{reports.length} laudo(s)</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload size={16} className="mr-2" /> Enviar Laudo
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardHeader><h2 className="font-semibold">Enviar Novo Laudo</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                <Input label="Paciente *" placeholder="Digite para buscar..." value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value) }} />
                {selectedPatient && (
                  <div className="mt-1 p-2 bg-blue-50 rounded text-sm text-blue-800">
                    Selecionado: {selectedPatient.name} ({selectedPatient.protocol})
                  </div>
                )}
                {patientSuggestions.length > 0 && !selectedPatient && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {patientSuggestions.map(p => (
                      <li key={p.id} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); setPatientSuggestions([]) }}>
                        {p.name} — <span className="text-gray-500">{p.protocol}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Input label="Título *" placeholder="Ex: Audiometria Tonal Simples"
                {...register('title', { required: true })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo * (PDF ou imagem)</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={() => setShowUpload(false)}>Cancelar</Button>
                <Button type="submit" loading={saving}>Enviar</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex gap-3 flex-wrap">
            {[
              { v: '', l: 'Todos' },
              { v: 'uploaded', l: 'Enviado' },
              { v: 'revision', l: 'Em Revisão' },
              { v: 'approved', l: 'Aprovado' },
              { v: 'signed', l: 'Assinado' },
              { v: 'published', l: 'Publicado' },
              { v: 'rejected', l: 'Rejeitado' },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>}
              {!loading && reports.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum laudo encontrado.</td></tr>}
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.title}</td>
                  <td className="px-6 py-3 text-gray-600">{r.patient_name}</td>
                  <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{format(new Date(r.created_at), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td className="px-6 py-3">
                    <Link href={`/reports/${r.id}`} className="text-blue-600 hover:text-blue-800"><ChevronRight size={16} /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <ReportsContent />
    </Suspense>
  )
}
