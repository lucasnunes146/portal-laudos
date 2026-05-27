'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from 'react-hot-toast'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { clinicApi, authApi } from '@/lib/api'
import { ClinicSettings, Clinic } from '@/lib/types'

interface SettingsForm {
  portal_title: string
  portal_subtitle: string
  welcome_message: string
  footer_text: string
  primary_color: string
}

interface PasswordForm {
  old_password: string
  new_password: string
  confirm_password: string
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [clinic, setClinic] = useState<Clinic | null>(null)

  const { register, handleSubmit, reset } = useForm<SettingsForm>()
  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { errors: pwErrors } } = useForm<PasswordForm>()

  useEffect(() => {
    clinicApi.getSettings().then(r => {
      reset(r.data)
    }).catch(() => {})
    clinicApi.get().then(r => setClinic(r.data)).catch(() => {})
  }, [reset])

  const onSaveSettings = async (data: SettingsForm) => {
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => fd.append(k, v as string))
      await clinicApi.updateSettings(fd)
      toast.success('Configurações salvas!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  const onChangePassword = async (data: PasswordForm) => {
    setSaving(true)
    try {
      await authApi.changePassword(data)
      toast.success('Senha alterada!')
      resetPw()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: Record<string, string[]> } })
        ?.response?.data
      toast.error(Object.values(msg || {}).flat()[0] || 'Erro ao alterar senha.')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      <Card>
        <CardHeader><h2 className="font-semibold">Portal do Paciente</h2></CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSaveSettings)} className="space-y-4">
            <Input label="Título do portal" placeholder="Portal de Laudos" {...register('portal_title')} />
            <Input label="Subtítulo" placeholder="Acesse seus laudos com segurança" {...register('portal_subtitle')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem de boas-vindas</label>
              <textarea className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3}
                {...register('welcome_message')} />
            </div>
            <Input label="Texto do rodapé" {...register('footer_text')} />
            <div className="flex items-center gap-3">
              <label className="block text-sm font-medium text-gray-700">Cor principal</label>
              <input type="color" {...register('primary_color')} className="h-8 w-16 rounded cursor-pointer border border-gray-300" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Salvar</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">Alterar Senha</h2></CardHeader>
        <CardBody>
          <form onSubmit={handlePw(onChangePassword)} className="space-y-4">
            <Input label="Senha atual" type="password" {...regPw('old_password', { required: true })} />
            <Input label="Nova senha" type="password" error={pwErrors.new_password?.message}
              {...regPw('new_password', { required: true, minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
            <Input label="Confirmar nova senha" type="password" {...regPw('confirm_password', { required: true })} />
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Alterar Senha</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
