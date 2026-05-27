import Cookies from 'js-cookie'
import { User } from './types'

export function setTokens(access: string, refresh: string) {
  Cookies.set('access_token', access, { expires: 1, sameSite: 'strict' })
  Cookies.set('refresh_token', refresh, { expires: 7, sameSite: 'strict' })
}

export function clearTokens() {
  Cookies.remove('access_token')
  Cookies.remove('refresh_token')
}

export function getAccessToken() {
  return Cookies.get('access_token')
}

export function isStaffMember(user: User) {
  return ['admin', 'secretary', 'doctor'].includes(user.role)
}

export function canApproveOrSign(user: User) {
  return ['admin', 'doctor'].includes(user.role)
}

export function canUpload(user: User) {
  return ['admin', 'secretary', 'doctor'].includes(user.role)
}

export function canManagePatients(user: User) {
  return ['admin', 'secretary'].includes(user.role)
}

export function canViewAuditLogs(user: User) {
  return ['admin', 'doctor'].includes(user.role)
}
