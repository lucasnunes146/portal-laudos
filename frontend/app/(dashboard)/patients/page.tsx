'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from 'react-hot-toast'
import { Plus, Search, ChevronRight, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { patientsApi } from '@/lib/api'
import { Patient } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PatientForm {
  name: string; cpf: string; birth_date: string; phone: string; email: string; notes: string
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PatientForm>()

  const load = async (q = '') => {
    setLoading(true)
    try {
      const res = await patientsApi.list({ q })
      setPatients(res.data.results)
      setTotal(res.data.count)
    } catch {
      toast.error('Erro ao carregar pacientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); load(search) }

  const onSubmit = async (data: PatientForm) => {
    setSaving(true)
    try {
      await patientsApi.create(data)
      toast.success('Paciente cadastrado com sucesso!')
      reset()
      setShowForm(false)
      load()
    } catch {
      toast.error('Erro ao cadastrar paciente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-1">{total} paciente(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-2" /> Novo Paciente
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="font-semibold">Cadastrar Novo Paciente</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Nome completo *" placeholder="Nome do paciente"
                  error={errors.name?.message}
                  {...register('name', { required: 'Nome obrigatório' })} />
              </div>
              <Input label="CPF" placeholder="000.000.000-00" {...register('cpf')} />
              <Input label="Data de nascimento" type="date" {...register('birth_date')} />
              <Input label="Telefone" placeholder="(11) 90000-0000" {...register('phone')} />
              <Input label="E-mail" type="email" placeholder="email@exemplo.com" {...register('email')} />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={2} {...register('notes')} />
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" loading={saving}>Salvar</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <form onSubmit={onSearch} className="flex gap-2">
            <Input placeholder="Buscar por nome, CPF ou protocolo..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <Button type="submit" variant="secondary"><Search size={16} /></Button>
          </form>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protocolo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Laudos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Portal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cadastro</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
              )}
              {!loading && patients.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Nenhum paciente encontrado.</td></tr>
              )}
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{p.protocol}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-3 text-gray-600">{p.phone || '—'}</td>
                  <td className="px-6 py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{p.reports_count}</span>
                  </td>
                  <td className="px-6 py-3">
                    {p.portal_active
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><UserCheck size={14} /> Ativo</span>
                      : <span className="text-gray-400 text-xs">Sem acesso</span>}
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">
                    {format(new Date(p.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-3">
                    <Link href={`/patients/${p.id}`} className="text-blue-600 hover:text-blue-800">
                      <ChevronRight size={16} />
                    </Link>
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
