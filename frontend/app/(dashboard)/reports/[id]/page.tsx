'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import { ArrowLeft, CheckCircle, PenLine, Globe, Download } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { reportsApi } from '@/lib/api'
import { Report } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ReportDetailPage() {
  const { id } = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)

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
      toast.success(`Laudo ${type === 'approve' ? 'aprovado' : type === 'sign' ? 'assinado' : 'publicado'} com sucesso!`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro na operação.'
      toast.error(msg)
    } finally { setLoading(false) }
  }

  const handleDownload = async () => {
    if (!report) return
    try {
      const res = await reportsApi.getDownloadUrl(report.id)
      window.open(res.data.download_url.replace(
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
      ), '_blank')
    } catch { toast.error('Erro ao gerar link de download.') }
  }

  if (!report) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <Toaster position="top-right" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approve */}
        <Card className={report.status !== 'uploaded' ? 'opacity-60' : ''}>
          <CardBody className="text-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${report.status === 'uploaded' ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <CheckCircle size={20} className={report.status === 'uploaded' ? 'text-yellow-600' : 'text-green-600'} />
            </div>
            <p className="font-medium text-sm">Aprovar</p>
            {report.approved_by_name && <p className="text-xs text-gray-500">{report.approved_by_name}</p>}
            {report.approved_at && <p className="text-xs text-gray-400">{format(new Date(report.approved_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>}
            {report.status === 'uploaded' && (
              <Button size="sm" onClick={() => action('approve')} loading={loading}>Aprovar</Button>
            )}
          </CardBody>
        </Card>

        {/* Sign */}
        <Card className={report.status !== 'approved' ? 'opacity-60' : ''}>
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

        {/* Publish */}
        <Card className={report.status !== 'signed' ? 'opacity-60' : ''}>
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

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold">Detalhes do Arquivo</h2>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} className="mr-2" /> Download
          </Button>
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
