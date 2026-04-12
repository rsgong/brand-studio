import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ShotTypeRow } from '@/types'
import { Video } from 'lucide-react'

export function GalleryPage() {
  const [shotTypes, setShotTypes] = useState<ShotTypeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('shot_types')
        .select('*')
        .order('name')
      if (!error && data) setShotTypes(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-gray-400">Loading shot types...</p>

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-1">Gallery</h2>
      <p className="text-gray-500 text-sm mb-8">Choose a shot type to start generating</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shotTypes.map((st) => (
          <Link
            key={st.id}
            to={`/generate/${st.id}`}
            className="group block border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Thumbnail area — show first reference image or placeholder */}
            <div className="aspect-video bg-gray-100 relative flex items-center justify-center">
              {st.reference_image_urls?.[0] ? (
                <img
                  src={st.reference_image_urls[0]}
                  alt={st.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-300 text-sm">No preview</span>
              )}
              {st.media_type === 'video' && (
                <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-gray-700">
                  <Video size={12} /> Video
                </span>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                {st.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{st.description}</p>
            </div>
          </Link>
        ))}

        {shotTypes.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-gray-400 mb-2">No shot types yet.</p>
            <Link to="/shot-types" className="text-brand-600 text-sm hover:underline">
              Create your first shot type
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
