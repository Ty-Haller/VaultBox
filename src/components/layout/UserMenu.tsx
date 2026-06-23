import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-vault-200 px-2 py-1.5 text-sm hover:bg-vault-50 dark:border-vault-600 dark:hover:bg-vault-800"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-vault-700 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[120px] truncate text-vault-700 dark:text-vault-200 md:inline">
          {user.displayName || user.username}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-vault-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-vault-200 bg-white py-1 shadow-lg dark:border-vault-600 dark:bg-vault-900">
          <div className="border-b border-vault-100 px-4 py-2 dark:border-vault-700">
            <p className="truncate text-sm font-medium text-vault-900 dark:text-white">{user.displayName || user.username}</p>
            <p className="truncate text-xs text-vault-500">{user.email || user.username}</p>
            {user.permissions.globalRole && (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-gold-500">
                {user.permissions.globalRole.replace(/_/g, ' ')}
              </p>
            )}
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-vault-700 hover:bg-vault-50 dark:text-vault-200 dark:hover:bg-vault-800"
          >
            <Settings className="h-4 w-4" />
            User Settings
          </Link>
          {user.permissions.canManageUsers && (
            <Link
              to="/admin/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-vault-700 hover:bg-vault-50 dark:text-vault-200 dark:hover:bg-vault-800"
            >
              <User className="h-4 w-4" />
              Manage Users
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              setOpen(false)
              await logout()
              navigate('/login')
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}