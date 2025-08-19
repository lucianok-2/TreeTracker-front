'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Navbar from '../components/Navbar'

interface Consumo {
  id: string
  fecha_consumo: string
  producto_codigo: string
  volumen_m3: number
  user_id: string
  created_at: string
  updated_at: string
}

export default function ConsumoPage() {
  const { user } = useAuth()
  const [consumos, setConsumos] = useState<Consumo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [editingConsumo, setEditingConsumo] = useState<Consumo | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const loadConsumos = useCallback(async () => {
    if (!user) {
      console.log('No hay usuario autenticado')
      setLoading(false)
      return
    }

    console.log('Cargando consumos para usuario:', user.id)
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

      console.log('Sesión activa, consultando consumos...')

      let query = supabase
        .from('consumos')
        .select('*')
        .order('fecha_consumo', { ascending: false })

      // Aplicar filtros
      if (fechaInicio) {
        query = query.gte('fecha_consumo', fechaInicio)
      }
      if (fechaFin) {
        query = query.lte('fecha_consumo', fechaFin)
      }
      if (filtroProducto) {
        query = query.ilike('producto_codigo', `%${filtroProducto}%`)
      }

      console.log('Ejecutando consulta...')
      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error en consulta:', fetchError)
        throw fetchError
      }

      console.log('Consumos cargados:', data?.length || 0)
      setConsumos(data || [])
    } catch (err) {
      console.error('Error cargando consumos:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user, fechaInicio, fechaFin, filtroProducto])

  useEffect(() => {
    loadConsumos()
  }, [loadConsumos])

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

  const totalVolumen = consumos.reduce((sum, c) => sum + c.volumen_m3, 0)
  const consumoPromedio = consumos.length > 0 ? totalVolumen / consumos.length : 0

  // Agrupar por mes para estadísticas
  const consumosPorMes = consumos.reduce((acc, consumo) => {
    const mes = new Date(consumo.fecha_consumo).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
    acc[mes] = (acc[mes] || 0) + consumo.volumen_m3
    return acc
  }, {} as Record<string, number>)

  const handleEdit = (consumo: Consumo) => {
    setEditingConsumo(consumo)
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('consumos')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      await loadConsumos()
      alert('Registro eliminado exitosamente')
    } catch (err) {
      console.error('Error eliminando registro:', err)
      alert('Error eliminando el registro: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  const handleSaveEdit = async () => {
    if (!editingConsumo) return

    try {
      const { error } = await supabase
        .from('consumos')
        .update({
          fecha_consumo: editingConsumo.fecha_consumo,
          producto_codigo: editingConsumo.producto_codigo,
          volumen_m3: editingConsumo.volumen_m3
        })
        .eq('id', editingConsumo.id)

      if (error) {
        throw error
      }

      await loadConsumos()
      setShowEditModal(false)
      setEditingConsumo(null)
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
          <p>Debes iniciar sesión para ver los consumos.</p>
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
          <h1 className="text-3xl font-bold">⚡ Consumo Detallado</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium mb-2">Producto</label>
              <input
                type="text"
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={loadConsumos}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{consumos.length}</div>
            <div className="text-sm text-red-700">Total Consumos</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{formatNumber(totalVolumen)} m³</div>
            <div className="text-sm text-orange-700">Volumen Total</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{formatNumber(consumoPromedio)} m³</div>
            <div className="text-sm text-yellow-700">Consumo Promedio</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(consumosPorMes).length}
            </div>
            <div className="text-sm text-purple-700">Meses con Consumo</div>
          </div>
        </div>

        {/* Consumo por mes */}
        {Object.keys(consumosPorMes).length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">📊 Consumo por Mes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(consumosPorMes)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([mes, volumen]) => (
                <div key={mes} className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-gray-800">{formatNumber(volumen)} m³</div>
                  <div className="text-sm text-gray-600 capitalize">{mes}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Cargando consumos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">❌ Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadConsumos}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : consumos.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2">No hay consumos</h3>
          <p className="text-gray-600">No se encontraron consumos con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Consumo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volumen (m³)
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
                {consumos.map((consumo) => (
                  <tr key={consumo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(consumo.fecha_consumo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumo.producto_codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatNumber(consumo.volumen_m3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(consumo.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(consumo)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                          title="Editar registro"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(consumo.id)}
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
      {showEditModal && editingConsumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Consumo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Consumo</label>
                <input
                  type="datetime-local"
                  value={editingConsumo.fecha_consumo.slice(0, 16)}
                  onChange={(e) => setEditingConsumo({
                    ...editingConsumo,
                    fecha_consumo: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Producto Código</label>
                <input
                  type="text"
                  value={editingConsumo.producto_codigo}
                  onChange={(e) => setEditingConsumo({
                    ...editingConsumo,
                    producto_codigo: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Volumen (m³)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingConsumo.volumen_m3}
                  onChange={(e) => setEditingConsumo({
                    ...editingConsumo,
                    volumen_m3: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingConsumo(null)
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