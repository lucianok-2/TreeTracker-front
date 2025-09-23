'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Modal from './Modal'

interface PredioFormProps {
  isOpen: boolean
  onClose: () => void
  predio?: {
    id: string
    nombre: string
    superficie_hectareas: number
    ubicacion: string
    propietario: string
    rut_propietario: string
    descripcion: string
    certificacion_fsc: boolean
    certificacion_pefc: boolean
  } | null
}

export default function PredioForm({ isOpen, onClose, predio }: PredioFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    nombre: '',
    superficie_hectareas: '',
    ubicacion: '',
    propietario: '',
    rut_propietario: '',
    descripcion: '',
    certificacion_fsc: false,
    certificacion_pefc: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Actualizar formulario cuando se pasa un predio para editar
  useEffect(() => {
    if (predio) {
      setFormData({
        nombre: predio.nombre || '',
        superficie_hectareas: predio.superficie_hectareas?.toString() || '',
        ubicacion: predio.ubicacion || '',
        propietario: predio.propietario || '',
        rut_propietario: predio.rut_propietario || '',
        descripcion: predio.descripcion || '',
        certificacion_fsc: predio.certificacion_fsc || false,
        certificacion_pefc: predio.certificacion_pefc || false
      })
    } else {
      setFormData({
        nombre: '',
        superficie_hectareas: '',
        ubicacion: '',
        propietario: '',
        rut_propietario: '',
        descripcion: '',
        certificacion_fsc: false,
        certificacion_pefc: false
      })
    }
    setError('')
  }, [predio, isOpen])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, type, value } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    setError('')
  }

  const formatRut = (rut: string) => {
    // Remover puntos y guiones
    const cleanRut = rut.replace(/[^0-9kK]/g, '')
    
    if (cleanRut.length < 2) return cleanRut
    
    // Separar número y dígito verificador
    const rutNumber = cleanRut.slice(0, -1)
    const dv = cleanRut.slice(-1)
    
    // Formatear número con puntos
    const formattedNumber = rutNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    return `${formattedNumber}-${dv}`
  }

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formattedRut = formatRut(value)
    setFormData(prev => ({ ...prev, rut_propietario: formattedRut }))
    setError('')
  }

  const validateRut = (rut: string) => {
    const cleanRut = rut.replace(/[^0-9kK]/g, '')
    if (cleanRut.length < 8) return false
    
    const rutNumber = cleanRut.slice(0, -1)
    const dv = cleanRut.slice(-1).toUpperCase()
    
    let sum = 0
    let multiplier = 2
    
    for (let i = rutNumber.length - 1; i >= 0; i--) {
      sum += parseInt(rutNumber[i]) * multiplier
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }
    
    const remainder = sum % 11
    const calculatedDv = remainder < 2 ? remainder.toString() : remainder === 10 ? 'K' : (11 - remainder).toString()
    
    return dv === calculatedDv
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del predio es requerido')
      }

      if (!formData.propietario.trim()) {
        throw new Error('El propietario es requerido')
      }

      if (!formData.rut_propietario.trim()) {
        throw new Error('El RUT del propietario es requerido')
      }

      if (!validateRut(formData.rut_propietario)) {
        throw new Error('El RUT ingresado no es válido')
      }

      const superficie = parseFloat(formData.superficie_hectareas)
      if (isNaN(superficie) || superficie <= 0) {
        throw new Error('La superficie debe ser un número positivo')
      }

      if (!formData.ubicacion.trim()) {
        throw new Error('La ubicación es requerida')
      }

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const predioData = {
        nombre: formData.nombre.trim(),
        superficie_hectareas: superficie,
        ubicacion: formData.ubicacion.trim(),
        propietario: formData.propietario.trim(),
        rut_propietario: formData.rut_propietario.trim(),
        descripcion: formData.descripcion.trim() || null,
        certificacion_fsc: formData.certificacion_fsc,
        certificacion_pefc: formData.certificacion_pefc,
        created_by: user.id
      }

      if (predio) {
        // Actualizar predio existente
        const { error: updateError } = await supabase
          .from('predios')
          .update({
            ...predioData,
            updated_at: new Date().toISOString()
          })
          .eq('id', predio.id)

        if (updateError) {
          throw updateError
        }

        console.log('Predio actualizado exitosamente')
      } else {
        // Crear nuevo predio
        const { data, error: insertError } = await supabase
          .from('predios')
          .insert([predioData])
          .select()

        if (insertError) {
          throw insertError
        }

        console.log('Predio creado exitosamente:', data)
      }

      // Limpiar formulario y cerrar modal
      setFormData({
        nombre: '',
        superficie_hectareas: '',
        ubicacion: '',
        propietario: '',
        rut_propietario: '',
        descripcion: '',
        certificacion_fsc: false,
        certificacion_pefc: false
      })
      
      onClose()
    } catch (err) {
      console.error('Error guardando predio:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={predio ? 'Editar Predio' : 'Nuevo Predio'}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {predio ? '✏️ Editar Predio' : '🌲 Nuevo Predio'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">❌ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre del Predio *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Predio Las Encinas"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Superficie (hectáreas) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="superficie_hectareas"
                value={formData.superficie_hectareas}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Ubicación *
            </label>
            <input
              type="text"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: Comuna de Valdivia, Región de Los Ríos"
              disabled={loading}
              required
            />
          </div>

          {/* Información del propietario */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">👤 Información del Propietario</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre del Propietario *
                </label>
                <input
                  type="text"
                  name="propietario"
                  value={formData.propietario}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nombre completo"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  RUT del Propietario *
                </label>
                <input
                  type="text"
                  name="rut_propietario"
                  value={formData.rut_propietario}
                  onChange={handleRutChange}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="12.345.678-9"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Certificaciones */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">🏆 Certificaciones Forestales</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="certificacion_fsc"
                  name="certificacion_fsc"
                  checked={formData.certificacion_fsc}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  disabled={loading}
                />
                <label htmlFor="certificacion_fsc" className="ml-2 text-sm font-medium text-gray-900">
                  Certificación FSC (Forest Stewardship Council)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="certificacion_pefc"
                  name="certificacion_pefc"
                  checked={formData.certificacion_pefc}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  disabled={loading}
                />
                <label htmlFor="certificacion_pefc" className="ml-2 text-sm font-medium text-gray-900">
                  Certificación PEFC (Programme for the Endorsement of Forest Certification)
                </label>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Descripción Adicional
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={4}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Información adicional sobre el predio (opcional)"
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
              className="px-6 py-3 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  {predio ? '💾 Actualizar' : '🌲 Crear'} Predio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
