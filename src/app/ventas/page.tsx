'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Navbar from '../components/Navbar'

interface Venta {
  id: string
  fecha_venta: string
  producto_codigo: string
  cliente: string
  num_factura: string
  volumen_m3: number
  certificacion: string
  precio_unitario: number | null
  user_id: string
  created_at: string
  updated_at: string
}

export default function VentasPage() {
  const { user } = useAuth()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const loadVentas = useCallback(async () => {
    if (!user) {
      console.log('No hay usuario autenticado')
      setLoading(false)
      return
    }

    console.log('Cargando ventas para usuario:', user.id)
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

      console.log('Sesión activa, consultando ventas...')

      let query = supabase
        .from('ventas')
        .select('*')
        .order('fecha_venta', { ascending: false })

      // Aplicar filtros
      if (fechaInicio) {
        query = query.gte('fecha_venta', fechaInicio)
      }
      if (fechaFin) {
        query = query.lte('fecha_venta', fechaFin)
      }
      if (filtroCliente) {
        query = query.ilike('cliente', `%${filtroCliente}%`)
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

      console.log('Ventas cargadas:', data?.length || 0)
      setVentas(data || [])
    } catch (err) {
      console.error('Error cargando ventas:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user, fechaInicio, fechaFin, filtroCliente, filtroProducto])

  useEffect(() => {
    loadVentas()
  }, [loadVentas])

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

  const formatCurrency = (num: number | null) => {
    if (num === null) return 'N/A'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'CLP'
    }).format(num)
  }

  const totalVolumen = ventas.reduce((sum, v) => sum + v.volumen_m3, 0)
  const totalValor = ventas.reduce((sum, v) => sum + (v.precio_unitario ? v.precio_unitario * v.volumen_m3 : 0), 0)

  const handleEdit = (venta: Venta) => {
    setEditingVenta(venta)
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      await loadVentas()
      alert('Registro eliminado exitosamente')
    } catch (err) {
      console.error('Error eliminando registro:', err)
      alert('Error eliminando el registro: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  const handleSaveEdit = async () => {
    if (!editingVenta) return

    try {
      const { error } = await supabase
        .from('ventas')
        .update({
          fecha_venta: editingVenta.fecha_venta,
          cliente: editingVenta.cliente,
          num_factura: editingVenta.num_factura,
          volumen_m3: editingVenta.volumen_m3,
          producto_codigo: editingVenta.producto_codigo,
          certificacion: editingVenta.certificacion,
          precio_unitario: editingVenta.precio_unitario
        })
        .eq('id', editingVenta.id)

      if (error) {
        throw error
      }

      await loadVentas()
      setShowEditModal(false)
      setEditingVenta(null)
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
          <p>Debes iniciar sesión para ver las ventas.</p>
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
          <h1 className="text-3xl font-bold">💰 Ventas Detalladas</h1>
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
              <label className="block text-sm font-medium mb-2">Cliente</label>
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Buscar cliente..."
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
              onClick={loadVentas}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{ventas.length}</div>
            <div className="text-sm text-green-700">Total Ventas</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(totalVolumen)} m³</div>
            <div className="text-sm text-blue-700">Volumen Total</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(ventas.map(v => v.cliente)).size}
            </div>
            <div className="text-sm text-purple-700">Clientes Únicos</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalValor)}</div>
            <div className="text-sm text-yellow-700">Valor Total</div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Cargando ventas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">❌ Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadVentas}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : ventas.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-semibold mb-2">No hay ventas</h3>
          <p className="text-gray-600">No se encontraron ventas con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Num. Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volumen (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unit.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(venta.fecha_venta)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {venta.cliente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.num_factura}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.producto_codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(venta.volumen_m3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(venta.precio_unitario)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {venta.precio_unitario ? formatCurrency(venta.precio_unitario * venta.volumen_m3) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {venta.certificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(venta)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                          title="Editar registro"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(venta.id)}
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
      {showEditModal && editingVenta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Venta</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha Venta</label>
                <input
                  type="datetime-local"
                  value={editingVenta.fecha_venta.slice(0, 16)}
                  onChange={(e) => setEditingVenta({
                    ...editingVenta,
                    fecha_venta: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Producto Código</label>
                <input
                  type="text"
                  value={editingVenta.producto_codigo}
                  onChange={(e) => setEditingVenta({
                    ...editingVenta,
                    producto_codigo: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Cliente</label>
                <input
                  type="text"
                  value={editingVenta.cliente}
                  onChange={(e) => setEditingVenta({
                    ...editingVenta,
                    cliente: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Número de Factura</label>
                <input
                  type="text"
                  value={editingVenta.num_factura}
                  onChange={(e) => setEditingVenta({
                    ...editingVenta,
                    num_factura: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Volumen (m³)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingVenta.volumen_m3}
                  onChange={(e) => setEditingVenta({
                    ...editingVenta,
                    volumen_m3: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Precio Unitario</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingVenta.precio_unitario || ''}
                  onChange={(e) => setEditingVenta({
                    ...editingVenta,
                    precio_unitario: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="w-full p-2 border rounded-md"
                  placeholder="Opcional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Certificación</label>
                <input
                  type="text"
                  value={editingVenta.certificacion}
                  onChange={(e) => setEditingVenta({
                    ...editingVenta,
                    certificacion: e.target.value
                  })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingVenta(null)
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