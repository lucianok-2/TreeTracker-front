'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '../components/Navbar'

interface Recepcion {
  id: string
  fecha_recepcion: string
  producto_codigo: string
  proveedor: string
  num_guia: string
  volumen_m3: number
  certificacion: string
  rol?: string
  origen?: string
  comuna?: string
  user_id: string
  created_at: string
  updated_at: string
}

export default function RecepcionesPage() {
  const { user } = useAuth()
  const [recepciones, setRecepciones] = useState<Recepcion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroOrigen, setFiltroOrigen] = useState('')
  const [filtroComuna, setFiltroComuna] = useState('')
  const [editingRecepcion, setEditingRecepcion] = useState<Recepcion | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const loadRecepciones = useCallback(async () => {
    if (!user) {
      console.log('No hay usuario autenticado')
      setLoading(false)
      return
    }

    console.log('Cargando recepciones para usuario:', user.id)
    setLoading(true)
    setError(null)

    try {
      // Verificar la sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error obteniendo sesión:', sessionError)
        throw new Error('Error de autenticación: ' + sessionError.message)
      }

      if (!session) {
        throw new Error('No hay sesión activa')
      }

      console.log('Sesión activa, consultando recepciones...')

      let query = supabase
        .from('recepciones')
        .select('*')
        .order('fecha_recepcion', { ascending: false })

      // Aplicar filtros
      if (fechaInicio) {
        query = query.gte('fecha_recepcion', fechaInicio)
      }
      if (fechaFin) {
        query = query.lte('fecha_recepcion', fechaFin)
      }
      if (filtroProveedor) {
        query = query.ilike('proveedor', `%${filtroProveedor}%`)
      }
      if (filtroRol) {
        query = query.ilike('rol', `%${filtroRol}%`)
      }
      if (filtroOrigen) {
        query = query.ilike('origen', `%${filtroOrigen}%`)
      }
      if (filtroComuna) {
        query = query.ilike('comuna', `%${filtroComuna}%`)
      }

      console.log('Ejecutando consulta...')
      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error en consulta:', fetchError)
        throw fetchError
      }

      console.log('Recepciones cargadas:', data?.length || 0)
      setRecepciones(data || [])
    } catch (err) {
      console.error('Error cargando recepciones:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user, fechaInicio, fechaFin, filtroProveedor, filtroRol, filtroOrigen, filtroComuna])

  useEffect(() => {
    loadRecepciones()
  }, [loadRecepciones])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(num)
  }

  const totalVolumen = recepciones.reduce((sum, r) => sum + r.volumen_m3, 0)

  const handleEdit = (recepcion: Recepcion) => {
    setEditingRecepcion(recepcion)
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('recepciones')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      // Recargar la lista después de eliminar
      await loadRecepciones()
      alert('Registro eliminado exitosamente')
    } catch (err) {
      console.error('Error eliminando registro:', err)
      alert('Error eliminando el registro: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  const handleSaveEdit = async () => {
    if (!editingRecepcion) return

    try {
      const { error } = await supabase
        .from('recepciones')
        .update({
          fecha_recepcion: editingRecepcion.fecha_recepcion,
          proveedor: editingRecepcion.proveedor,
          num_guia: editingRecepcion.num_guia,
          volumen_m3: editingRecepcion.volumen_m3,
          producto_codigo: editingRecepcion.producto_codigo,
          certificacion: editingRecepcion.certificacion,
          rol: editingRecepcion.rol || null,
          origen: editingRecepcion.origen || null,
          comuna: editingRecepcion.comuna || null
        })
        .eq('id', editingRecepcion.id)

      if (error) {
        throw error
      }

      // Recargar la lista después de editar
      await loadRecepciones()
      setShowEditModal(false)
      setEditingRecepcion(null)
      alert('Registro actualizado exitosamente')
    } catch (err) {
      console.error('Error actualizando registro:', err)
      alert('Error actualizando el registro: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p>Debes iniciar sesión para ver las recepciones.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--light-green)' }}>
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">📋 Recepciones Detalladas</h1>
        
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">🔍 Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Proveedor</label>
              <input
                type="text"
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                placeholder="Buscar proveedor..."
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rol</label>
              <input
                type="text"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                placeholder="Buscar rol..."
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Origen/Predio</label>
              <input
                type="text"
                value={filtroOrigen}
                onChange={(e) => setFiltroOrigen(e.target.value)}
                placeholder="Buscar origen..."
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Comuna</label>
              <input
                type="text"
                value={filtroComuna}
                onChange={(e) => setFiltroComuna(e.target.value)}
                placeholder="Buscar comuna..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={loadRecepciones}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{recepciones.length}</div>
            <div className="text-sm text-green-700">Total Recepciones</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(totalVolumen)} m³</div>
            <div className="text-sm text-blue-700">Volumen Total</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(recepciones.map(r => r.proveedor)).size}
            </div>
            <div className="text-sm text-purple-700">Proveedores Únicos</div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Cargando recepciones...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">❌ Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadRecepciones}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : recepciones.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold mb-2">No hay recepciones</h3>
          <p className="text-gray-600">No se encontraron recepciones con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Recepción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Num. Guía
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volumen (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origen/Predio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comuna
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recepciones.map((recepcion) => (
                  <tr key={recepcion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(recepcion.fecha_recepcion)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {recepcion.proveedor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recepcion.num_guia}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(recepcion.volumen_m3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recepcion.producto_codigo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {recepcion.certificacion}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {recepcion.rol || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {recepcion.origen || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {recepcion.comuna || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(recepcion)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                          title="Editar registro"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(recepcion.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                          title="Eliminar registro"
                        >
                          🗑️ Eliminar
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

      {/* Modal de Edición */}
      {showEditModal && editingRecepcion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Recepción</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Recepción</label>
                <input
                  type="datetime-local"
                  value={editingRecepcion.fecha_recepcion.slice(0, 16)}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    fecha_recepcion: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Producto Código</label>
                <input
                  type="text"
                  value={editingRecepcion.producto_codigo}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    producto_codigo: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Proveedor</label>
                <input
                  type="text"
                  value={editingRecepcion.proveedor}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    proveedor: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Número de Guía</label>
                <input
                  type="text"
                  value={editingRecepcion.num_guia}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    num_guia: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Volumen (m³)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingRecepcion.volumen_m3}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    volumen_m3: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Certificación</label>
                <input
                  type="text"
                  value={editingRecepcion.certificacion}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    certificacion: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Rol</label>
                <input
                  type="text"
                  value={editingRecepcion.rol || ''}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    rol: e.target.value || undefined
                  })}
                  className="w-full p-2 border rounded-md"
                  placeholder="Opcional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Origen/Predio</label>
                <input
                  type="text"
                  value={editingRecepcion.origen || ''}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    origen: e.target.value || undefined
                  })}
                  className="w-full p-2 border rounded-md"
                  placeholder="Opcional"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Comuna</label>
                <input
                  type="text"
                  value={editingRecepcion.comuna || ''}
                  onChange={(e) => setEditingRecepcion({
                    ...editingRecepcion,
                    comuna: e.target.value || undefined
                  })}
                  className="w-full p-2 border rounded-md"
                  placeholder="Opcional"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingRecepcion(null)
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                💾 Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}