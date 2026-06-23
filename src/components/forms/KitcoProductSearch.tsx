import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../../lib/api'
import type { KitcoSearchResult } from '../../types'
import { FormField, inputClass } from '../ui/FormField'

interface KitcoProductSearchProps {
  onSelect: (result: KitcoSearchResult) => void
  className?: string
}

export function KitcoProductSearch({ onSelect, className }: KitcoProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KitcoSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      setLoading(true)
      api.searchKitco(query.trim())
        .then((r) => {
          setResults(r)
          setOpen(true)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (r: KitcoSearchResult) => {
    onSelect(r)
    setQuery(r.name)
    setOpen(false)
  }

  return (
    <FormField label="Search Kitco / Product Catalog" className={className}>
      <div ref={wrapRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input
            className={`${inputClass} pl-9`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Type to search — American Silver Eagle, Gold Buffalo…"
          />
        </div>
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-vault-200 bg-white shadow-lg">
            {results.map((r) => (
              <li key={`${r.source}-${r.slug}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-vault-50"
                  onClick={() => pick(r)}
                >
                  <span className="font-medium text-vault-800">{r.name}</span>
                  {r.kitcoProductRef && (
                    <span className="ml-2 font-mono text-xs text-vault-400">{r.kitcoProductRef}</span>
                  )}
                  {r.standardWeightOz != null && (
                    <span className="ml-2 text-xs text-vault-500">{r.standardWeightOz} oz</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {loading && <p className="mt-1 text-xs text-vault-400">Searching catalog…</p>}
      </div>
    </FormField>
  )
}