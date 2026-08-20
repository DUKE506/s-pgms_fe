import { useAuthStore, type Role } from '../../features/auth/store/authStore'

export function usePermission(allow: Role[]): boolean {
  const role = useAuthStore((state) => state.user?.role)
  return role !== undefined && allow.includes(role)
}
