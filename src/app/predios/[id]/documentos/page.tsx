'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import DocumentoForm from '../../../components/DocumentoForm'

interface Documento {
  id: string
  predio_id: string
  tipo_documento_id: string
  nombre_archivo: string
  archivo_url: string | null
  tamaño_archivo: number | null
  tipo_mime: string | null
  fecha_subida: string
  fecha_vencimiento: string | null
  notas: string | null
  estado: string
  created_by: string
  updated_at: string
  tipos_documentos: {
    id: string
    nombre: string
    descripcion: string
    obligatorio: boolean
  }
}

interface TipoDocumento {
  id: string
  nombre: string
  descripcion: string
  obligatorio: boolean
  activo: boolean
}

interface Predio {
  id: string
  nombre: string
  propietario: string
  ubicacion: string
}

export default function DocumentosPredioPage() {
  const { user } = useAuth()
  const params = useParams()
  const predioId = params.id as string

  const [predio, setPredio] = useState<Predio | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null)
  const [filterEstado, setFilterEstado] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  const loadPredio = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('predios')
        .select('id, nombre, propietario, ubicacion')
        .eq('id', predioId)
        .single()

      if (error) {
        throw error
      }

      setPredio(data)
    } catch (err) {
      console.error('Error cargando predio:', err)
      setError('No se pudo cargar la información del predio')
    }
  }, [predioId])

  const loadTiposDocumentos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_documentos')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) {
        throw error
      }

      setTiposDocumentos(data || [])
    } catch (err) {
      console.error('Error cargando tipos de documentos:', err)
    }
  }, [])

  const loadDocumentos = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('documentos')
        .select(`
          *,
          tipos_documentos (
            id,
            nombre,
            descripcion,
            obligatorio
          )
        `)
        .eq('predio_id', predioId)
        .order('fecha_subida', { ascending: false })

      // Aplicar filtros
      if (filterEstado) {
        query = query.eq('estado', filterEstado)
      }
      if (filterTipo) {
        query = query.eq('tipo_documento_id', filterTipo)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      setDocumentos(data || [])
    } catch (err) {
      console.error('Error cargando documentos:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user, predioId, filterEstado, filterTipo])

  useEffect(() => {
    loadPredio()
    loadTiposDocumentos()
  }, [loadPredio, loadTiposDocumentos])

  useEffect(() => {
    loadDocumentos()
  }, [loadDocumentos])

  const handleEdit = (documento: Documento) => {
    setEditingDocumento(documento)
    setShowForm(true)
  }

  const handleDelete = async (documentoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documentoId)

      if (error) {
        throw error
      }

      await loadDocumentos()
      alert('Documento eliminado exitosamente')
    } catch (err) {
      console.error('Error eliminando documento:', err)
      alert('Error eliminando el documento: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingDocumento(null)
    loadDocumentos()
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800'
      case 'vencido':
        return 'bg-red-100 text-red-800'
      case 'por_vencer':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const checkVencimiento = (fechaVencimiento: string | null) => {
    if (!fechaVencimiento) return 'activo'
    
    const hoy = new Date()
    const vencimiento = new Date(fechaVencimiento)
    const diasParaVencer = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diasParaVencer < 0) return 'vencido'
    if (diasParaVencer <= 30) return 'por_vencer'
    return 'activo'
  }

  const tiposObligatorios = tiposDocumentos.filter(tipo => tipo.obligatorio)
  const tiposObligatoriosConDocumento = tiposObligatorios.filter(tipo =>
    documentos.some(doc => doc.tipo_documento_id === tipo.id && doc.estado === 'activo')
  )

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p>Debes iniciar sesión para gestionar documentos.</p>
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
          <div>
            <nav className="text-sm text-gray-600 mb-2">
              <Link href="/predios" className="hover:text-blue-600">Predios</Link>
              <span className="mx-2">›</span>
              <span>{predio?.nombre || 'Cargando...'}</span>
              <span className="mx-2">›</span>
              <span>Documentos</span>
            </nav>
            <h1 className="text-3xl font-bold">📁 Documentos del Predio</h1>
            {predio && (
              <p className="text-gray-600 mt-2">
                <span className="font-medium">{predio.nombre}</span> - {predio.propietario}
                <br />
                <span className="text-sm">{predio.ubicacion}</span>
              </p>
            )}
          </div>
          <div className="flex space-x-4">
            <Link 
              href="/predios"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ⬅️ Volver a Predios
            </Link>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              📄 Subir Documento
            </button>
          </div>
        </div>

        {/* Estadísticas de cumplimiento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{documentos.length}</div>
            <div className="text-sm text-blue-700">Total Documentos</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {tiposObligatoriosConDocumento.length}/{tiposObligatorios.length}
            </div>
            <div className="text-sm text-green-700">Obligatorios Cumplidos</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {documentos.filter(doc => checkVencimiento(doc.fecha_vencimiento) === 'por_vencer').length}
            </div>
            <div className="text-sm text-yellow-700">Por Vencer (30 días)</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">
              {documentos.filter(doc => checkVencimiento(doc.fecha_vencimiento) === 'vencido').length}
            </div>
            <div className="text-sm text-red-700">Vencidos</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">🔍 Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Documento</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos los tipos</option>
                {tiposDocumentos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre} {tipo.obligatorio ? '(Obligatorio)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="vencido">Vencido</option>
                <option value="por_vencer">Por Vencer</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadDocumentos}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Documentos faltantes obligatorios */}
        {tiposObligatoriosConDocumento.length < tiposObligatorios.length && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-800 font-semibold mb-2">⚠️ Documentos Obligatorios Faltantes</h3>
            <div className="text-yellow-700">
              {tiposObligatorios
                .filter(tipo => !documentos.some(doc => doc.tipo_documento_id === tipo.id && doc.estado === 'activo'))
                .map(tipo => (
                  <div key={tipo.id} className="mb-1">
                    • {tipo.nombre}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Contenido principal */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Cargando documentos...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold">❌ Error</h3>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={loadDocumentos}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              🔄 Reintentar
            </button>
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold mb-2">No hay documentos registrados</h3>
            <p className="text-gray-600 mb-4">
              Comienza subiendo los documentos requeridos para este predio
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              📄 Subir Primer Documento
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tamaño
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Subida
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentos.map((documento) => {
                    const estadoCalculado = checkVencimiento(documento.fecha_vencimiento)
                    return (
                      <tr key={documento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {documento.nombre_archivo}
                            </div>
                            {documento.notas && (
                              <div className="text-sm text-gray-500">
                                {documento.notas}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">
                              {documento.tipos_documentos.nombre}
                            </div>
                            {documento.tipos_documentos.obligatorio && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Obligatorio
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(documento.tamaño_archivo)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(documento.fecha_subida)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {documento.fecha_vencimiento ? formatDate(documento.fecha_vencimiento) : 'Sin vencimiento'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(estadoCalculado)}`}>
                            {estadoCalculado === 'activo' ? 'Activo' :
                             estadoCalculado === 'por_vencer' ? 'Por Vencer' : 'Vencido'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex space-x-2">
                            {documento.archivo_url && (
                              <a
                                href={documento.archivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="Descargar documento"
                              >
                                📥
                              </a>
                            )}
                            <button
                              onClick={() => handleEdit(documento)}
                              className="text-green-600 hover:text-green-800"
                              title="Editar documento"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(documento.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Eliminar documento"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de formulario */}
        <DocumentoForm
          isOpen={showForm}
          onClose={handleFormClose}
          predioId={predioId}
          documento={editingDocumento}
          tiposDocumentos={tiposDocumentos}
        />
      </div>
    </div>
  )
}
