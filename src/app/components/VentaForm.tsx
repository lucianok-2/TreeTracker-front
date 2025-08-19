'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Modal from './Modal'

interface VentaFormProps {
  isOpen: boolean
  onClose: () => void
}

const PRODUCTOS = [
  { codigo: 'W5.2', nombre: 'Madera dimensionada pinus radiata' },
  { codigo: 'W3.1', nombre: 'Astillas pinus radiata' },
  { codigo: 'W3.2', nombre: 'Aserrín pinus radiata' }
]

const CERTS = [
  'FSC 100%',
  'FSC Mixto',
  'FSC Controlled Wood',
  'Material Controlado'
]

export default function VentaForm({ isOpen, onClose }: VentaFormProps) {
  const [formData, setFormData] = useState({
    fecha: '',
    producto: PRODUCTOS[0].codigo,
    cliente: '',
    num_factura: '',
    volumen: '',
    certificacion: CERTS[0],
    precio_unitario: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validar datos
      if (!formData.fecha || !formData.cliente || !formData.volumen) {
        throw new Error('Por favor completa todos los campos requeridos')
      }

      const volumenNumerico = parseFloat(formData.volumen)
      if (isNaN(volumenNumerico) || volumenNumerico <= 0) {
        throw new Error('El volumen debe ser un número positivo')
      }

      const precioNumerico = formData.precio_unitario ? parseFloat(formData.precio_unitario) : null
      if (formData.precio_unitario && (isNaN(precioNumerico!) || precioNumerico! < 0)) {
        throw new Error('El precio debe ser un número positivo')
      }

      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Insertar en Supabase
      const { data, error: supabaseError } = await supabase
        .from('ventas')
        .insert([
          {
            user_id: user.id,
            fecha_venta: formData.fecha,
            producto_codigo: formData.producto,
            cliente: formData.cliente,
            num_factura: formData.num_factura || null,
            volumen_m3: volumenNumerico,
            certificacion: formData.certificacion,
            precio_unitario: precioNumerico
          }
        ])
        .select()

      if (supabaseError) {
        console.error('Error de Supabase:', supabaseError)
        throw new Error(`Error al guardar: ${supabaseError.message}`)
      }

      console.log('Venta guardada exitosamente:', data)
      
      // Limpiar formulario y cerrar
      setFormData({
        fecha: '',
        producto: PRODUCTOS[0].codigo,
        cliente: '',
        num_factura: '',
        volumen: '',
        certificacion: CERTS[0],
        precio_unitario: ''
      })
      onClose()
      
      // Mostrar mensaje de éxito
      alert('Venta registrada exitosamente')
      
    } catch (err) {
      console.error('Error al guardar venta:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Venta">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="fecha" className="block mb-2 text-gray-700 font-medium">
            Fecha de Venta
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
          <label htmlFor="cliente" className="block mb-2 text-gray-700 font-medium">
            Cliente
          </label>
          <input
            type="text"
            id="cliente"
            name="cliente"
            value={formData.cliente}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            required
            placeholder="Nombre del cliente"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="num_factura" className="block mb-2 text-gray-700 font-medium">
            Número de Factura (Opcional)
          </label>
          <input
            type="text"
            id="num_factura"
            name="num_factura"
            value={formData.num_factura}
            onChange={handleChange}
            className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{ 
              borderColor: 'var(--light-brown)',
              backgroundColor: 'white'
            }}
            placeholder="Ej: FAC-2025-001"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              placeholder="Ej: 1.500"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="precio_unitario" className="block mb-2 text-gray-700 font-medium">
              Precio Unitario (Opcional)
            </label>
            <input
              type="number"
              id="precio_unitario"
              name="precio_unitario"
              value={formData.precio_unitario}
              onChange={handleChange}
              className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ 
                borderColor: 'var(--light-brown)',
                backgroundColor: 'white'
              }}
              step="0.01"
              min="0"
              placeholder="Ej: 150.00"
              disabled={loading}
            />
          </div>
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