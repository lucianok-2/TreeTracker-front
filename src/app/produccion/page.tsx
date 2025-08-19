'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Navbar from '../components/Navbar'

interface Produccion {
  id: string
  fecha_produccion: string
  producto_origen_codigo: string
  volumen_origen_m3: number
  producto_destino_codigo: string
  volumen_destino_m3: number
  factor_rendimiento: number
  user_id: string
  created_at: string
  updated_at: string
}

export default function ProduccionPage() {
  const { user } = useAuth()
  const [producciones, setProducciones] = useState<Produccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroProductoOrigen, setFiltroProductoOrigen] = useState('')
  const [filtroProductoDestino, setFiltroProductoDestino] = useState('')
  const [editingProduccion, setEditingProduccion] = useState<Produccion | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const loadProducciones = useCallback(async () => {
    if (!user) {
      console.log('No hay usuario autenticado')
      setLoading(false)
      return
    }

    console.log('Cargando producciones para usuario:', user.id)
    setLoading(true)
    setError(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error obteniendo sesión:', sessionError)
        throw new Error('Error de autenticación: ' + sessionError.message)
      }

      if (!session) {
        throw new Error('No hay sesión activa')
      }

      console.log('Sesión activa, consultando producciones...')

      let query = supabase
        .from('produccion')
        .select('*')
        .order('fecha_produccion', { ascending: false })

      // Aplicar filtros
      if (fechaInicio) {
        query = query.gte('fecha_produccion', fechaInicio)
      }
      if (fechaFin) {
        query = query.lte('fecha_produccion', fechaFin)
      }
      if (filtroProductoOrigen) {
        query = query.ilike('producto_origen_codigo', `%${filtroProductoOrigen}%`)
      }
      if (filtroProductoDestino) {
        query = query.ilike('producto_destino_codigo', `%${filtroProductoDestino}%`)
      }

      console.log('Ejecutando consulta...')
      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error en consulta:', fetchError)
        throw fetchError
      }

      console.log('Producciones cargadas:', data?.length || 0)
      setProducciones(data || [])
    } catch (err) {
      console.error('Error cargando producciones:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user, fechaInicio, fechaFin, filtroProductoOrigen, filtroProductoDestino])

  useEffect(() => {
    loadProducciones()
  }, [loadProducciones])

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

  const formatPercentage = (num: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(num / 100)
  }

  const totalVolumenOrigen = producciones.reduce((sum, p) => sum + p.volumen_origen_m3, 0)
  const totalVolumenDestino = producciones.reduce((sum, p) => sum + p.volumen_destino_m3, 0)
  const rendimientoPromedio = producciones.length > 0 
    ? producciones.reduce((sum, p) => sum + p.factor_rendimiento, 0) / producciones.length 
    : 0

  const handleEdit = (produccion: Produccion) => {
    setEditingProduccion(produccion)
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('produccion')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      await loadProducciones()
      alert('Registro eliminado exitosamente')
    } catch (err) {
      console.error('Error eliminando registro:', err)
      alert('Error eliminando el registro: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  const handleSaveEdit = async () => {
    if (!editingProduccion) return

    try {
      const { error } = await supabase
        .from('produccion')
        .update({
          fecha_produccion: editingProduccion.fecha_produccion,
          producto_origen_codigo: editingProduccion.producto_origen_codigo,
          volumen_origen_m3: editingProduccion.volumen_origen_m3,
          producto_destino_codigo: editingProduccion.producto_destino_codigo,
          volumen_destino_m3: editingProduccion.volumen_destino_m3,
          factor_rendimiento: editingProduccion.factor_rendimiento
        })
        .eq('id', editingProduccion.id)

      if (error) {
        throw error
      }

      await loadProducciones()
      setShowEditModal(false)
      setEditingProduccion(null)
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
          <p>Debes iniciar sesión para ver la producción.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">🏭 Producción Detallada</h1>
          <Link 
            href="/dashboard"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            🏠 Volver al Dashboard
          </Link>
        </div>
        
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">🔍 Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium mb-2">Producto Origen</label>
              <input
                type="text"
                value={filtroProductoOrigen}
                onChange={(e) => setFiltroProductoOrigen(e.target.value)}
                placeholder="Buscar producto origen..."
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Producto Destino</label>
              <input
                type="text"
                value={filtroProductoDestino}
                onChange={(e) => setFiltroProductoDestino(e.target.value)}
                placeholder="Buscar producto destino..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={loadProducciones}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{producciones.length}</div>
            <div className="text-sm text-green-700">Total Producciones</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(totalVolumenOrigen)} m³</div>
            <div className="text-sm text-blue-700">Volumen Origen</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{formatNumber(totalVolumenDestino)} m³</div>
            <div className="text-sm text-purple-700">Volumen Destino</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{formatPercentage(rendimientoPromedio)}</div>
            <div className="text-sm text-yellow-700">Rendimiento Promedio</div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Cargando producciones...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">❌ Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadProducciones}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : producciones.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏭</div>
          <h3 className="text-xl font-semibold mb-2">No hay producciones</h3>
          <p className="text-gray-600">No se encontraron producciones con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Producción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto Origen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vol. Origen (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto Destino
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vol. Destino (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rendimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {producciones.map((produccion) => (
                  <tr key={produccion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(produccion.fecha_produccion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {produccion.producto_origen_codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(produccion.volumen_origen_m3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {produccion.producto_destino_codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(produccion.volumen_destino_m3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatPercentage(produccion.factor_rendimiento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(produccion.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(produccion)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                          title="Editar registro"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(produccion.id)}
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
      {showEditModal && editingProduccion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Producción</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Producción</label>
                <input
                  type="datetime-local"
                  value={editingProduccion.fecha_produccion.slice(0, 16)}
                  onChange={(e) => setEditingProduccion({
                    ...editingProduccion,
                    fecha_produccion: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Producto Origen</label>
                <input
                  type="text"
                  value={editingProduccion.producto_origen_codigo}
                  onChange={(e) => setEditingProduccion({
                    ...editingProduccion,
                    producto_origen_codigo: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Volumen Origen (m³)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingProduccion.volumen_origen_m3}
                  onChange={(e) => setEditingProduccion({
                    ...editingProduccion,
                    volumen_origen_m3: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Producto Destino</label>
                <input
                  type="text"
                  value={editingProduccion.producto_destino_codigo}
                  onChange={(e) => setEditingProduccion({
                    ...editingProduccion,
                    producto_destino_codigo: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Volumen Destino (m³)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingProduccion.volumen_destino_m3}
                  onChange={(e) => setEditingProduccion({
                    ...editingProduccion,
                    volumen_destino_m3: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Factor Rendimiento (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduccion.factor_rendimiento}
                  onChange={(e) => setEditingProduccion({
                    ...editingProduccion,
                    factor_rendimiento: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingProduccion(null)
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