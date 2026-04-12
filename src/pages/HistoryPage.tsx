import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { GenerationRow } from '@/types'

export function HistoryPage() {
  const [generations, setGenerations] = useState<GenerationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('generations').select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setGenerations(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-gray-400">Loading history...</p>

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-1">History</h2>
      <p className="text-gray-500 text-sm mb-8">All generations across shot types</p>

      <div className="space-y-4">
        {generations.map((gen) => (
          <div key={gen.id} className="flex items-start gap-4 border border-gray-200 rounded-lg p-4">
            {gen.result_urls[0] && (
              <img src={gen.result_urls[0]} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 line-clamp-2">{gen.prompt}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span className={
                  gen.status === 'complete' ? 'text-green-600' :
                  gen.status === 'failed' ? 'text-red-500' :
                  'text-yellow-600'
                }>
                  {gen.status}
                </span>
                <span>{gen.media_type}</span>
                <span>{gen.aspect_ratio}</span>
                <span>{new Date(gen.created_at).toLocaleString()}</span>
                <span>{gen.result_urls.length} results</span>
              </div>
            </div>
          </div>
        ))}

        {generations.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-12">No generations yet.</p>
        )}
      </div>
    </div>
  )
}
