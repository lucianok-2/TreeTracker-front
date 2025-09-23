'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoPredioPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a la página principal de predios con el modal abierto
    router.push('/predios?nuevo=true')
  }, [router])

  return (
    <div className="container mx-auto p-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4">Redirigiendo...</p>
      </div>
    </div>
  )
}
