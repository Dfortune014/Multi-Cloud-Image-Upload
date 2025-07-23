'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cloud, Upload, Files } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/',
      label: 'Upload',
      icon: Upload,
    },
    {
      href: '/files',
      label: 'Files',
      icon: Files,
    },
  ]

  return (
    <nav className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 text-white">
              <Cloud className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              CloudUploader
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-slate-900 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
