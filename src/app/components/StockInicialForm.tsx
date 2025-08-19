'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Modal from './Modal'

interface StockInicialFormProps {
  isOpen: boolean
  onClose: () => void
}

const PRODUCTOS = [
  { codigo: 'W1.1', nombre: 'Trozos de pinus radiata' },
  { codigo: 'W5.2', nombre: 'Madera dimensionada pinus radiata' },
  { codigo: 'W3.1', nombre: 'Astillas pinus radiata' },
  { codigo: 'W3.2', nombre: 'Aserrín pinus radiata' }
]

const MESES = [
  { numero: 1, nombre: 'Enero' },
  { numero: 2, nombre: 'Febrero' },
  { numero: 3, nombre: 'Marzo' },
  { numero: 4, nombre: 'Abril' },
  { numero: 5, nombre: 'Mayo' },
  { numero: 6, nombre: 'Junio' },
  { numero: 7, nombre: 'Julio' },
  { numero: 8, nombre: 'Agosto' },
  { numero: 9, nombre: 'Septiembre' },
  { numero: 10, nombre: 'Octubre' },
  { numero: 11, nombre: 'Noviembre' },
  { numero: 12, nombre: 'Diciembre' }
]

export default function StockInicialForm({ isOpen, onClose }: StockInicialFormProps) {
  const [formData, setFormData] = useState({
    año: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    producto: PRODUCTOS[0].codigo,
    volumen: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: name === 'año' || name === 'mes' ? parseInt(value) : value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validar datos
      if (!formData.volumen) {
        throw new Error('Por favor ingresa el volumen')
      }

      const volumenNumerico = parseFloat(formData.volumen)
      if (isNaN(volumenNumerico) || volumenNumerico < 0) {
        throw new Error('El volumen debe ser un número positivo o cero')
      }

      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Insertar o actualizar en Supabase (UPSERT)
      const { data, error: supabaseError } = await supabase
        .from('stock_inicial')
        .upsert([
          {
            user_id: user.id,
            año: formData.año,
            mes: formData.mes,
            producto_codigo: formData.producto,
            volumen_m3: volumenNumerico
          }
        ], {
          onConflict: 'user_id,año,mes,producto_codigo'
        })
        .select()

      if (supabaseError) {
        console.error('Error de Supabase:', supabaseError)
        throw new Error(`Error al guardar: ${supabaseError.message}`)
      }

      console.log('Stock inicial guardado exitosamente:', data)
      
      // Limpiar formulario y cerrar
      setFormData({
        año: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        producto: PRODUCTOS[0].codigo,
        volumen: ''
      })
      onClose()
      
      // Mostrar mensaje de éxito
      alert('Stock inicial guardado exitosamente')
      
    } catch (err) {
      console.error('Error al guardar stock inicial:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurar Stock Inicial">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="año" className="block mb-2 text-gray-700 font-medium">
              Año
            </label>
            <select
              id="año"
              name="año"
              value={formData.año}
              onChange={handleChange}
              className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ 
                borderColor: 'var(--light-brown)',
                backgroundColor: 'white'
              }}
              disabled={loading}
            >
              {[2023, 2024, 2025, 2026, 2027].map(año => (
                <option key={año} value={año}>
                  {año}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mes" className="block mb-2 text-gray-700 font-medium">
              Mes
            </label>
            <select
              id="mes"
              name="mes"
              value={formData.mes}
              onChange={handleChange}
              className="w-full border-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ 
                borderColor: 'var(--light-brown)',
                backgroundColor: 'white'
              }}
              disabled={loading}
            >
              {MESES.map(mes => (
                <option key={mes.numero} value={mes.numero}>
                  {mes.nombre}
                </option>
              ))}
            </select>
          </div>
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
          <label htmlFor="volumen" className="block mb-2 text-gray-700 font-medium">
            Volumen Inicial (m³)
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
            placeholder="Ej: 5.676"
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