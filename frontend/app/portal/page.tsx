'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import toast, { Toaster } from 'react-hot-toast'
import { FileText, Download, LogOut, Activity } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { authApi, reportsApi } from '@/lib/api'
import { clearTokens } from '@/lib/auth'
import { Report, User } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PatientPortalPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('access_token')
    if (!token) { router.replace('/portal/login'); return }

    authApi.me()
      .then(res => {
        const u = res.data as User
        if (u.role !== 'patient') { router.replace('/dashboard'); return }
        setUser(u)
        return reportsApi.list()
      })
      .then(res => {
        if (res) setReports(res.data.results)
      })
      .catch(() => {
        clearTokens()
        router.replace('/portal/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    const refresh = Cookies.get('refresh_token') || ''
    try { await authApi.logout(refresh) } catch {}
    clearTokens()
    router.push('/portal/login')
  }

  const handleDownload = async (reportId: number) => {
    try {
      const res = await reportsApi.getDownloadUrl(reportId)
      window.open(res.data.download_url, '_blank')
    } catch { toast.error('Erro ao gerar link de download.') }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Portal do Paciente</h1>
              <p className="text-xs text-gray-500">{user?.clinic_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Olá, {user?.full_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={16} className="mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Meus Laudos</h2>
          <p className="text-sm text-gray-500 mt-1">{reports.length} laudo(s) disponível(is)</p>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <FileText size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum laudo disponível ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Quando seu laudo estiver disponível, você receberá uma notificação.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <Card key={report.id}>
                <CardBody className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.title}</h3>
                      {report.description && <p className="text-sm text-gray-600 mt-0.5">{report.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        Publicado em {report.published_at
                          ? format(new Date(report.published_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '—'}
                      </p>
                      {report.digital_signature && (
                        <p className="text-xs text-green-600 mt-0.5">✓ Assinado digitalmente</p>
                      )}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleDownload(report.id)}>
                    <Download size={14} className="mr-2" /> Baixar
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
