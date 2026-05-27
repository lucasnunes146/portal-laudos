'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/lib/api'
import { setTokens } from '@/lib/auth'
import { Activity } from 'lucide-react'

interface LoginForm {
  username: string
  password: string
}

interface TwoFAForm {
  code: string
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [requires2fa, setRequires2fa] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const { register: reg2fa, handleSubmit: handle2fa, formState: { errors: errors2fa } } = useForm<TwoFAForm>()

  const onLogin = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.username, data.password)
      if (res.data.requires_2fa) {
        setUserId(res.data.user_id)
        setRequires2fa(true)
        toast.success('Digite o código 2FA do seu autenticador.')
      } else {
        setTokens(res.data.access, res.data.refresh)
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { non_field_errors?: string[] } } })
        ?.response?.data?.non_field_errors?.[0] || 'Erro ao fazer login.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const on2fa = async (data: TwoFAForm) => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await authApi.login2fa(userId, data.code)
      setTokens(res.data.access, res.data.refresh)
      router.push('/dashboard')
    } catch {
      toast.error('Código 2FA inválido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Portal de Laudos</h1>
              <p className="text-xs text-gray-500">Sistema de Gestão Médica</p>
            </div>
          </div>

          {!requires2fa ? (
            <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 text-center mb-6">Entrar no sistema</h2>
              <Input
                label="Usuário"
                placeholder="Digite seu usuário"
                error={errors.username?.message}
                {...register('username', { required: 'Usuário obrigatório' })}
              />
              <Input
                label="Senha"
                type="password"
                placeholder="Digite sua senha"
                error={errors.password?.message}
                {...register('password', { required: 'Senha obrigatória' })}
              />
              <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
                Entrar
              </Button>
              <p className="text-center text-xs text-gray-500 mt-4">
                Paciente?{' '}
                <a href="/portal/login" className="text-blue-600 hover:underline">
                  Acesse o Portal do Paciente
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={handle2fa(on2fa)} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">Verificação 2FA</h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                Digite o código de 6 dígitos do seu autenticador.
              </p>
              <Input
                label="Código 2FA"
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                error={errors2fa.code?.message}
                {...reg2fa('code', {
                  required: 'Código obrigatório',
                  pattern: { value: /^\d{6}$/, message: 'Código deve ter 6 dígitos' }
                })}
              />
              <Button type="submit" loading={loading} size="lg" className="w-full">
                Verificar
              </Button>
              <button
                type="button"
                onClick={() => setRequires2fa(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                ← Voltar ao login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
