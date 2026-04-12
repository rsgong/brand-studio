import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ShotTypeRow } from '@/types'
import { ShotTypeEditor } from '@/components/ShotTypeEditor'
import { Plus, ChevronDown, ChevronUp, Pencil } from 'lucide-react'

export function ShotTypesPage() {
  const [shotTypes, setShotTypes] = useState<ShotTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadShotTypes() {
    const { data } = await supabase.from('shot_types').select('*').order('name')
    if (data) setShotTypes(data)
    setLoading(false)
  }

  useEffect(() => { loadShotTypes() }, [])

  function handleSaved() {
    setEditingId(null)
    setCreating(false)
    loadShotTypes()
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold">Manage Shot Types</h2>
          <p className="text-gray-500 text-sm mt-1">Create and version your brand generation templates.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} /> New Shot Type
        </button>
      </div>

      {creating && (
        <div className="mb-6 border border-gray-200 rounded-xl p-6">
          <ShotTypeEditor onSave={handleSaved} onCancel={() => setCreating(false)} />
        </div>
      )}

      <div className="space-y-3">
        {shotTypes.map((st) => (
          <div key={st.id} className="border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">{st.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                  {st.media_type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Version history</span>
                <button
                  onClick={() => setExpandedId(expandedId === st.id ? null : st.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {expandedId === st.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => setEditingId(st.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </div>

            {expandedId === st.id && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 rounded-b-xl">
                <p className="text-sm text-gray-500">{st.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Default: {st.default_aspect_ratio} · {st.default_variants} variants · v{st.version}
                </p>
              </div>
            )}

            {editingId === st.id && (
              <div className="border-t border-gray-200 p-6">
                <ShotTypeEditor
                  shotType={st}
                  onSave={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
