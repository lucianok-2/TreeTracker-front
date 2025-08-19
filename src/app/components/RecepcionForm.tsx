// src/app/components/RecepcionForm.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Modal from './Modal'

interface RecepcionFormProps {
  isOpen: boolean
  onClose: () => void
}

const CERTS = [
  'FSC 100%',
  'FSC Mixto',
  'FSC Controlled Wood',
  'Material Controlado'
]

const PRODUCTOS = [
  { codigo: 'W1.1', nombre: 'Trozos de pinus radiata' },
  { codigo: 'W5.2', nombre: 'Madera dimensionada pinus radiata' },
  { codigo: 'W3.1', nombre: 'Astillas pinus radiata' },
  { codigo: 'W3.2', nombre: 'Aserrín pinus radiata' }
]

export default function RecepcionForm({ isOpen, onClose }: RecepcionFormProps) {
  const [formData, setFormData] = useState({
    fecha: '',
    producto: PRODUCTOS[0].codigo,
    proveedor: '',
    num_guia: '',
    volumen: '',
    certificacion: CERTS[0],
    rol: '',
    origen: '',
    comuna: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('') // Limpiar error al cambiar datos
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validar datos
      if (!formData.fecha || !formData.proveedor || !formData.num_guia || !formData.volumen) {
        throw new Error('Por favor completa todos los campos requeridos')
      }

      const volumenNumerico = parseFloat(formData.volumen)
      if (isNaN(volumenNumerico) || volumenNumerico <= 0) {
        throw new Error('El volumen debe ser un número positivo')
      }

      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Insertar en Supabase
      const { data, error: supabaseError } = await supabase
        .from('recepciones')
        .insert([
          {
            user_id: user.id,
            fecha_recepcion: formData.fecha,
            producto_codigo: formData.producto,
            proveedor: formData.proveedor,
            num_guia: formData.num_guia,
            volumen_m3: volumenNumerico,
            certificacion: formData.certificacion,
            rol: formData.rol || null,
            origen: formData.origen || null,
            comuna: formData.comuna || null
          }
        ])
        .select()

      if (supabaseError) {
        console.error('Error de Supabase:', supabaseError)
        throw new Error(`Error al guardar: ${supabaseError.message}`)
      }

      console.log('Recepción guardada exitosamente:', data)
      
      // Limpiar formulario y cerrar
      setFormData({
        fecha: '',
        producto: PRODUCTOS[0].codigo,
        proveedor: '',
        num_guia: '',
        volumen: '',
        certificacion: CERTS[0],
        rol: '',
        origen: '',
        comuna: ''
      })
      onClose()
      
      // Mostrar mensaje de éxito
      alert('Recepción guardada exitosamente')
      
    } catch (err) {
      console.error('Error al guardar recepción:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir Recepción">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="fecha" className="block mb-2 text-gray-700 font-medium">
            Fecha de Recepción
          </label>
          <input
            type="date"
            id="fecha"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="producto" className="block mb-2 text-gray-700 font-medium">
            Producto
          </label>
          <select
            id="producto"
            name="producto"
            value={formData.producto}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            disabled={loading}
          >
            {PRODUCTOS.map(p => (
              <option key={p.codigo} value={p.codigo}>
                {p.codigo} - {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="proveedor" className="block mb-2 text-gray-700 font-medium">
            Proveedor
          </label>
          <input
            type="text"
            id="proveedor"
            name="proveedor"
            value={formData.proveedor}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            required
            placeholder="Ej: Forestal Los Pinos SPA"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="num_guia" className="block mb-2 text-gray-700 font-medium">
            Número de Guía
          </label>
          <input
            type="text"
            id="num_guia"
            name="num_guia"
            value={formData.num_guia}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            required
            placeholder="Ej: GR-2025-001"
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="volumen" className="block mb-2 text-gray-700 font-medium">
            Volumen (m³)
          </label>
          <input
            type="number"
            id="volumen"
            name="volumen"
            value={formData.volumen}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            required
            step="0.001"
            min="0"
            placeholder="Ej: 15.500"
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="certificacion" className="block mb-2 text-gray-700 font-medium">
            Certificación
          </label>
          <select
            id="certificacion"
            name="certificacion"
            value={formData.certificacion}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            disabled={loading}
          >
            {CERTS.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rol" className="block mb-2 text-gray-700 font-medium">
            Rol
          </label>
          <input
            type="text"
            id="rol"
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            placeholder="Rol del predio (opcional)"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="origen" className="block mb-2 text-gray-700 font-medium">
            Origen/Predio
          </label>
          <input
            type="text"
            id="origen"
            name="origen"
            value={formData.origen}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            placeholder="Nombre del predio (opcional)"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="comuna" className="block mb-2 text-gray-700 font-medium">
            Comuna
          </label>
          <input
            type="text"
            id="comuna"
            name="comuna"
            value={formData.comuna}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            placeholder="Comuna del predio (opcional)"
            disabled={loading}
          />
        </div>
        
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--light-brown)',
              color: 'var(--dark-brown)'
            }}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="treetracker-button-primary px-6 py-2 rounded-lg font-medium flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
