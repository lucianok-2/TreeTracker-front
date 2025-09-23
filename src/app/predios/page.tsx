'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import PredioForm from '../components/PredioForm'

interface Predio {
  id: string
  nombre: string
  superficie_hectareas: number
  ubicacion: string
  propietario: string
  rut_propietario: string
  descripcion: string
  certificacion_fsc: boolean
  certificacion_pefc: boolean
  created_at: string
  updated_at: string
  created_by: string
  _count?: {
    documentos: number
  }
}

export default function PrediosPage() {
  const { user } = useAuth()
  const [predios, setPredios] = useState<Predio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPredio, setEditingPredio] = useState<Predio | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const loadPredios = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error('Error de autenticación: ' + sessionError.message)
      }

      if (!session) {
        throw new Error('No hay sesión activa')
      }

      // Cargar predios con conteo de documentos
      const { data, error: fetchError } = await supabase
        .from('predios')
        .select(`
          *,
          documentos(count)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      // Transformar los datos para incluir el conteo
      const prediosWithCount = data?.map(predio => ({
        ...predio,
        _count: {
          documentos: predio.documentos?.[0]?.count || 0
        }
      })) || []

      setPredios(prediosWithCount)
    } catch (err) {
      console.error('Error cargando predios:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadPredios()
  }, [loadPredios])

  const handleEdit = (predio: Predio) => {
    setEditingPredio(predio)
    setShowForm(true)
  }

  const handleDelete = async (predioId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este predio? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('predios')
        .delete()
        .eq('id', predioId)

      if (error) {
        throw error
      }

      await loadPredios()
      alert('Predio eliminado exitosamente')
    } catch (err) {
      console.error('Error eliminando predio:', err)
      alert('Error eliminando el predio: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingPredio(null)
    loadPredios()
  }

  const filteredPredios = predios.filter(predio =>
    predio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    predio.propietario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    predio.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatHectareas = (hectareas: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(hectareas)
  }

  const getCertificaciones = (predio: Predio) => {
    const certs = []
    if (predio.certificacion_fsc) certs.push('FSC')
    if (predio.certificacion_pefc) certs.push('PEFC')
    return certs.length > 0 ? certs.join(', ') : 'Sin certificación'
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p>Debes iniciar sesión para gestionar predios.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">🌲 Gestión de Predios</h1>
          <div className="flex space-x-4">
            <Link 
              href="/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              🏠 Volver al Dashboard
            </Link>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ➕ Nuevo Predio
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">🔍 Buscar predios</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, propietario o ubicación..."
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredPredios.length} de {predios.length} predios
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{predios.length}</div>
            <div className="text-sm text-green-700">Total Predios</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {formatHectareas(predios.reduce((sum, p) => sum + (p.superficie_hectareas || 0), 0))}
            </div>
            <div className="text-sm text-blue-700">Hectáreas Totales</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {predios.filter(p => p.certificacion_fsc).length}
            </div>
            <div className="text-sm text-purple-700">Con FSC</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {predios.filter(p => p.certificacion_pefc).length}
            </div>
            <div className="text-sm text-yellow-700">Con PEFC</div>
          </div>
        </div>

        {/* Contenido principal */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Cargando predios...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold">❌ Error</h3>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={loadPredios}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              🔄 Reintentar
            </button>
          </div>
        ) : filteredPredios.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🌲</div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'No se encontraron predios' : 'No hay predios registrados'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza creando tu primer predio'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                ➕ Crear Primer Predio
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Predio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Propietario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Superficie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Certificaciones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documentos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPredios.map((predio) => (
                    <tr key={predio.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {predio.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {predio.ubicacion}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{predio.propietario}</div>
                          <div className="text-sm text-gray-500">{predio.rut_propietario}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatHectareas(predio.superficie_hectareas || 0)} ha
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getCertificaciones(predio) === 'Sin certificación' 
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {getCertificaciones(predio)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Link
                          href={`/predios/${predio.id}/documentos`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          📄 {predio._count?.documentos || 0} documentos
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(predio)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar predio"
                          >
                            ✏️
                          </button>
                          <Link
                            href={`/predios/${predio.id}/documentos`}
                            className="text-green-600 hover:text-green-800"
                            title="Gestionar documentos"
                          >
                            📁
                          </Link>
                          <button
                            onClick={() => handleDelete(predio.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar predio"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de formulario */}
        <PredioForm
          isOpen={showForm}
          onClose={handleFormClose}
          predio={editingPredio}
        />
      </div>
    </div>
  )
}
