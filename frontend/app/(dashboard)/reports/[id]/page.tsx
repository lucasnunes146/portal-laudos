'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import { ArrowLeft, CheckCircle, PenLine, Globe, Download, XCircle, RotateCcw, Upload } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { reportsApi } from '@/lib/api'
import { Report } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ModalType = 'reject' | 'revision' | null

export default function ReportDetailPage() {
  const { id } = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalType>(null)
  const [notes, setNotes] = useState('')
  const reuploadRef = useRef<HTMLInputElement>(null)

  const load = () => {
    if (!id) return
    reportsApi.get(Number(id)).then(r => setReport(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [id])

  const action = async (type: 'approve' | 'sign' | 'publish') => {
    if (!report) return
    setLoading(true)
    try {
      let res
      if (type === 'approve') res = await reportsApi.approve(report.id)
      else if (type === 'sign') res = await reportsApi.sign(report.id)
      else res = await reportsApi.publish(report.id)
      setReport(res.data)
      const label = type === 'approve' ? 'aprovado' : type === 'sign' ? 'assinado' : 'publicado'
      toast.success(`Laudo ${label} com sucesso!`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro na operação.'
      toast.error(msg)
    } finally { setLoading(false) }
  }

  const confirmModal = async () => {
    if (!report || !modal) return
    if (!notes.trim() && modal === 'revision') { toast.error('Informe o motivo.'); return }
    setLoading(true)
    try {
      let res
      if (modal === 'reject') res = await reportsApi.reject(report.id, notes)
      else res = await reportsApi.requestRevision(report.id, notes)
      setReport(res.data)
      toast.success(modal === 'reject' ? 'Laudo rejeitado.' : 'Revisão solicitada.')
      setModal(null); setNotes('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro na operação.'
      toast.error(msg)
    } finally { setLoading(false) }
  }

  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!report || !e.target.files?.[0]) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', e.target.files[0])
      const res = await reportsApi.reupload(report.id, fd)
      setReport(res.data)
      toast.success('Arquivo substituído com sucesso!')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao substituir arquivo.'
      toast.error(msg)
    } finally {
      setLoading(false)
      if (reuploadRef.current) reuploadRef.current.value = ''
    }
  }

  const handleDownload = async () => {
    if (!report) return
    try {
      const res = await reportsApi.getDownloadUrl(report.id)
      window.open(res.data.download_url, '_blank')
    } catch { toast.error('Erro ao gerar link de download.') }
  }

  if (!report) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  const canAct = !['published', 'rejected'].includes(report.status)
  const isUploaded = report.status === 'uploaded' || report.status === 'revision'

  return (
    <div className="space-y-6 max-w-4xl">
      <Toaster position="top-right" />

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              {modal === 'reject' ? 'Reprovar laudo' : 'Solicitar revisão'}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              {modal === 'reject'
                ? 'Informe o motivo da reprovação (opcional).'
                : 'Descreva o que precisa ser corrigido.'}
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder={modal === 'reject' ? 'Ex: Exame incompleto...' : 'Ex: Corrigir o nome do paciente...'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" onClick={() => { setModal(null); setNotes('') }}>Cancelar</Button>
              <Button
                onClick={confirmModal}
                loading={loading}
                className={modal === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {modal === 'reject' ? 'Reprovar' : 'Solicitar Revisão'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link href="/reports" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={report.status} />
            <span className="text-sm text-gray-500">{report.patient_name}</span>
            <span className="text-xs text-gray-400 font-mono">{report.patient_protocol}</span>
          </div>
        </div>
      </div>

      {/* Doctor notes (revision/rejection reason) */}
      {report.doctor_notes && (
        <div className={`rounded-lg p-4 border ${report.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {report.status === 'rejected' ? 'Motivo da reprovação:' : 'Solicitação de revisão:'}
          </p>
          <p className="text-sm text-gray-600">{report.doctor_notes}</p>
          {report.rejected_by_name && <p className="text-xs text-gray-400 mt-1">Por: {report.rejected_by_name}</p>}
        </div>
      )}

      {/* Workflow cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={isUploaded ? '' : 'opacity-60'}>
          <CardBody className="text-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isUploaded ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <CheckCircle size={20} className={isUploaded ? 'text-yellow-600' : 'text-green-600'} />
            </div>
            <p className="font-medium text-sm">Aprovar</p>
            {report.approved_by_name && <p className="text-xs text-gray-500">{report.approved_by_name}</p>}
            {report.approved_at && <p className="text-xs text-gray-400">{format(new Date(report.approved_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>}
            {isUploaded && (
              <Button size="sm" onClick={() => action('approve')} loading={loading}>Aprovar</Button>
            )}
          </CardBody>
        </Card>

        <Card className={report.status === 'approved' ? '' : 'opacity-60'}>
          <CardBody className="text-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${report.status === 'approved' ? 'bg-blue-100' : 'bg-green-100'}`}>
              <PenLine size={20} className={report.status === 'approved' ? 'text-blue-600' : 'text-green-600'} />
            </div>
            <p className="font-medium text-sm">Assinar</p>
            {report.signed_by_name && <p className="text-xs text-gray-500">{report.signed_by_name}</p>}
            {report.signed_at && <p className="text-xs text-gray-400">{format(new Date(report.signed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>}
            {report.status === 'approved' && (
              <Button size="sm" onClick={() => action('sign')} loading={loading}>Assinar</Button>
            )}
          </CardBody>
        </Card>

        <Card className={report.status === 'signed' ? '' : 'opacity-60'}>
          <CardBody className="text-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${report.status === 'signed' ? 'bg-purple-100' : 'bg-green-100'}`}>
              <Globe size={20} className={report.status === 'signed' ? 'text-purple-600' : 'text-green-600'} />
            </div>
            <p className="font-medium text-sm">Publicar</p>
            {report.published_at && <p className="text-xs text-gray-400">{format(new Date(report.published_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>}
            {report.status === 'signed' && (
              <Button size="sm" onClick={() => action('publish')} loading={loading}>Publicar</Button>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Actions bar */}
      {canAct && (
        <Card>
          <CardBody className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={14} className="mr-2" /> Baixar arquivo
            </Button>

            <label className="cursor-pointer">
              <input ref={reuploadRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleReupload} />
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Upload size={14} className="mr-2" /> Substituir arquivo
              </span>
            </label>

            {report.status !== 'rejected' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setNotes(''); setModal('revision') }}>
                  <RotateCcw size={14} className="mr-2" /> Solicitar revisão
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-0"
                  onClick={() => { setNotes(''); setModal('reject') }}>
                  <XCircle size={14} className="mr-2" /> Reprovar
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* File details */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold">Detalhes do Arquivo</h2>
          {report.status === 'published' && (
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={14} className="mr-2" /> Download
            </Button>
          )}
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <div><span className="text-gray-500">Arquivo:</span> <span className="ml-2 font-mono">{report.file_name}</span></div>
          <div><span className="text-gray-500">Tamanho:</span> <span className="ml-2">{(report.file_size / 1024).toFixed(1)} KB</span></div>
          <div><span className="text-gray-500">Hash SHA-256:</span> <span className="ml-2 font-mono text-xs break-all">{report.file_hash}</span></div>
          {report.digital_signature && (
            <div><span className="text-gray-500">Assinatura:</span> <span className="ml-2 font-mono text-xs break-all text-green-700">{report.digital_signature}</span></div>
          )}
          {report.description && <div><span className="text-gray-500">Descrição:</span> <span className="ml-2">{report.description}</span></div>}
          <div><span className="text-gray-500">Enviado por:</span> <span className="ml-2">{report.uploaded_by_name}</span></div>
          <div><span className="text-gray-500">Data:</span> <span className="ml-2">{format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span></div>
        </CardBody>
      </Card>
    </div>
  )
}
