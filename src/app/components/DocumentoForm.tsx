'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Modal from './Modal'

interface DocumentoFormProps {
  isOpen: boolean
  onClose: () => void
  predioId: string
  documento?: {
    id: string
    tipo_documento_id: string
    nombre_archivo: string
    fecha_vencimiento: string | null
    notas: string | null
    estado: string
  } | null
  tiposDocumentos: Array<{
    id: string
    nombre: string
    descripcion: string
    obligatorio: boolean
  }>
}

export default function DocumentoForm({ 
  isOpen, 
  onClose, 
  predioId, 
  documento, 
  tiposDocumentos 
}: DocumentoFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    tipo_documento_id: '',
    nombre_archivo: '',
    fecha_vencimiento: '',
    notas: '',
    estado: 'activo'
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  // Actualizar formulario cuando se pasa un documento para editar
  useEffect(() => {
    if (documento) {
      setFormData({
        tipo_documento_id: documento.tipo_documento_id,
        nombre_archivo: documento.nombre_archivo,
        fecha_vencimiento: documento.fecha_vencimiento ? documento.fecha_vencimiento.split('T')[0] : '',
        notas: documento.notas || '',
        estado: documento.estado
      })
    } else {
      setFormData({
        tipo_documento_id: tiposDocumentos.length > 0 ? tiposDocumentos[0].id : '',
        nombre_archivo: '',
        fecha_vencimiento: '',
        notas: '',
        estado: 'activo'
      })
    }
    setSelectedFile(null)
    setUploadProgress(0)
    setError('')
  }, [documento, tiposDocumentos, isOpen])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      
      // Auto-completar nombre del archivo si está vacío
      if (!formData.nombre_archivo) {
        setFormData(prev => ({ ...prev, nombre_archivo: file.name }))
      }
    }
    setError('')
  }

  const uploadFile = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${user.id}/${predioId}/${fileName}`

    const { error } = await supabase.storage
      .from('documentos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUploadProgress(0)

    try {
      // Validaciones
      if (!formData.tipo_documento_id) {
        throw new Error('Selecciona un tipo de documento')
      }

      if (!formData.nombre_archivo.trim()) {
        throw new Error('El nombre del archivo es requerido')
      }

      if (!documento && !selectedFile) {
        throw new Error('Selecciona un archivo para subir')
      }

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      let archivo_url = null
      let tamaño_archivo = null
      let tipo_mime = null

      // Subir archivo si se seleccionó uno nuevo
      if (selectedFile) {
        setUploadProgress(25)
        archivo_url = await uploadFile(selectedFile)
        tamaño_archivo = selectedFile.size
        tipo_mime = selectedFile.type
        setUploadProgress(75)
      }

      const documentoData = {
        predio_id: predioId,
        tipo_documento_id: formData.tipo_documento_id,
        nombre_archivo: formData.nombre_archivo.trim(),
        fecha_vencimiento: formData.fecha_vencimiento || null,
        notas: formData.notas.trim() || null,
        estado: formData.estado,
        created_by: user.id,
        ...(archivo_url && { archivo_url }),
        ...(tamaño_archivo && { tamaño_archivo }),
        ...(tipo_mime && { tipo_mime })
      }

      if (documento) {
        // Actualizar documento existente
        const { error: updateError } = await supabase
          .from('documentos')
          .update({
            ...documentoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', documento.id)

        if (updateError) {
          throw updateError
        }

        console.log('Documento actualizado exitosamente')
      } else {
        // Crear nuevo documento
        const { data, error: insertError } = await supabase
          .from('documentos')
          .insert([documentoData])
          .select()

        if (insertError) {
          throw insertError
        }

        console.log('Documento creado exitosamente:', data)
      }

      setUploadProgress(100)

      // Limpiar formulario y cerrar modal
      setFormData({
        tipo_documento_id: tiposDocumentos.length > 0 ? tiposDocumentos[0].id : '',
        nombre_archivo: '',
        fecha_vencimiento: '',
        notas: '',
        estado: 'activo'
      })
      setSelectedFile(null)
      
      onClose()
    } catch (err) {
      console.error('Error guardando documento:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const getTipoDocumentoSeleccionado = () => {
    return tiposDocumentos.find(tipo => tipo.id === formData.tipo_documento_id)
  }

  if (!isOpen) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={documento ? 'Editar Documento' : 'Subir Documento'}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {documento ? '✏️ Editar Documento' : '📄 Subir Nuevo Documento'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">❌ {error}</p>
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Subiendo archivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de documento */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de Documento *
            </label>
            <select
              name="tipo_documento_id"
              value={formData.tipo_documento_id}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            >
              <option value="">Selecciona un tipo</option>
              {tiposDocumentos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre} {tipo.obligatorio ? '(Obligatorio)' : '(Opcional)'}
                </option>
              ))}
            </select>
            {getTipoDocumentoSeleccionado()?.descripcion && (
              <p className="text-sm text-gray-600 mt-1">
                {getTipoDocumentoSeleccionado()?.descripcion}
              </p>
            )}
          </div>

          {/* Archivo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {documento ? 'Reemplazar Archivo (opcional)' : 'Archivo *'}
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              {...(!documento && { required: true })}
            />
            <p className="text-sm text-gray-600 mt-1">
              Formatos soportados: PDF, Word, Excel, Imágenes (máx. 10MB)
            </p>
            {selectedFile && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                📎 {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </div>
            )}
          </div>

          {/* Nombre del archivo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre del Documento *
            </label>
            <input
              type="text"
              name="nombre_archivo"
              value={formData.nombre_archivo}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Certificado de Capacitación 2024"
              disabled={loading}
              required
            />
          </div>

          {/* Fecha de vencimiento */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Fecha de Vencimiento (opcional)
            </label>
            <input
              type="date"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-gray-600 mt-1">
              Si el documento tiene vencimiento, especifica la fecha
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Estado
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="activo">Activo</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Notas Adicionales (opcional)
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Información adicional sobre este documento"
              disabled={loading}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {uploadProgress > 0 ? 'Subiendo...' : 'Guardando...'}
                </>
              ) : (
                <>
                  {documento ? '💾 Actualizar' : '📄 Subir'} Documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
