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

interface LoginForm { username: string; password: string }

export default function PatientLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.username, data.password)
      setTokens(res.data.access, res.data.refresh)
      router.push('/portal')
    } catch {
      toast.error('Usuário ou senha incorretos.')
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
              <h1 className="text-xl font-bold text-gray-900">Portal do Paciente</h1>
              <p className="text-xs text-gray-500">Acesse seus laudos com segurança</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Usuário (CPF)" placeholder="Digite seu CPF (só números)"
              error={errors.username?.message}
              {...register('username', { required: 'Usuário obrigatório' })} />
            <Input label="Senha" type="password" placeholder="Senha fornecida pela clínica"
              error={errors.password?.message}
              {...register('password', { required: 'Senha obrigatória' })} />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Entrar
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Funcionário da clínica?{' '}
            <a href="/login" className="text-blue-600 hover:underline">Acesse o sistema interno</a>
          </p>
        </div>
      </div>
    </div>
  )
}
