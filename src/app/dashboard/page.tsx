'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardData } from '@/types/dashboard'
import ExcelExporter from '../components/ExcelExporter'
import RecepcionForm from '../components/RecepcionForm'
import ProduccionForm from '../components/ProduccionForm'
import VentaForm from '../components/VentaForm'
import StockInicialForm from '../components/StockInicialForm'
import ConsumoForm from '../components/ConsumoForm'
import Navbar from '../components/Navbar'
import UserFunctionsManager from '../components/UserFunctionsManager'
import DocumentProcessor from '../components/DocumentProcessor'
import withAuth from '../components/with-auth'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Certificaciones que usas
const CERTS = [
  'FSC 100%',
  'FSC Mixto',
  'FSC Controlled Wood',
  'Material Controlado'
]

interface StockItem {
  mes: number
  producto_codigo: string
  volumen_m3: string
}

interface RecepcionItem {
  fecha_recepcion: string
  certificacion: string
  volumen_m3: string
}

interface ConsumoItem {
  fecha_consumo: string
  volumen_m3: string
}

interface ProduccionItem {
  fecha_produccion: string
  producto_destino_codigo: string
  volumen_destino_m3: string
  factor_rendimiento?: string
}

interface VentaItem {
  fecha_venta: string
  certificacion: string
  producto_codigo: string
  volumen_m3: string
  cliente: string
}

interface RawData {
  stock: StockItem[]
  recepciones: RecepcionItem[]
  consumos: ConsumoItem[]
  produccion: ProduccionItem[]
  ventas: VentaItem[]
}



function DashboardPage() {
  const { user } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  


  // Función para formatear números: 1 decimal, pero si es entero no mostrar .0
  const formatNumber = (value: number | undefined | null): string => {
    if (!value || value === 0) return ''
    // Si es un número entero, no mostrar decimales
    if (value % 1 === 0) return value.toString()
    // Si tiene decimales, mostrar 1 decimal
    return value.toFixed(1)
  }
  const [isRecepcionOpen, setRecepcionOpen] = useState(false)
  const [isProduccionOpen, setProduccionOpen] = useState(false)
  const [isVentaOpen, setVentaOpen] = useState(false)
  const [isStockInicialOpen, setStockInicialOpen] = useState(false)
  const [isConsumoOpen, setConsumoOpen] = useState(false)
  const [isFunctionsManagerOpen, setFunctionsManagerOpen] = useState(false)
  const [isDocumentProcessorOpen, setDocumentProcessorOpen] = useState(false)
  const [data, setData] = useState<DashboardData>({
    stockInicial: {},
    ingresos: {},
    stockFinal: {},
    consumo: {},
    produccionMadera: {},
    rendimientoMadera: {},
    ventasMadera: {},
    stockInicialMadera: {},
    stockFinalMadera: {},
    produccionAstillas: {},
    rendimientoAstillas: {},
    ventasAstillas: {},
    stockInicialAstillas: {},
    stockFinalAstillas: {},
    produccionAserrin: {},
    rendimientoAserrin: {},
    ventasAserrin: {},
    stockInicialAserrin: {},
    stockFinalAserrin: {}
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        await loadAllData()
      } catch (error) {
        console.error('Error en fetchData:', error)
      }
    }

    const loadAllData = async () => {
      try {
        const currentYear = year

        // Cargar stock inicial
        const { data: stockData, error: stockError } = await supabase
          .from('stock_inicial')
          .select('*')
          .eq('año', currentYear)

        // Cargar recepciones - FILTRO MEJORADO PARA FECHAS
        const { data: recepcionesData, error: recepcionesError } = await supabase
          .from('recepciones')
          .select('*')
          .gte('fecha_recepcion', `${currentYear}-01-01T00:00:00`)
          .lt('fecha_recepcion', `${currentYear + 1}-01-01T00:00:00`)

        // Cargar consumos - FILTRO MEJORADO PARA FECHAS
        const { data: consumosData, error: consumosError } = await supabase
          .from('consumos')
          .select('*')
          .gte('fecha_consumo', `${currentYear}-01-01T00:00:00`)
          .lt('fecha_consumo', `${currentYear + 1}-01-01T00:00:00`)

        // Cargar producción - FILTRO MEJORADO PARA FECHAS
        const { data: produccionData, error: produccionError } = await supabase
          .from('produccion')
          .select('*')
          .gte('fecha_produccion', `${currentYear}-01-01T00:00:00`)
          .lt('fecha_produccion', `${currentYear + 1}-01-01T00:00:00`)

        // Cargar ventas - FILTRO MEJORADO PARA FECHAS
        const { data: ventasData, error: ventasError } = await supabase
          .from('ventas')
          .select('*')
          .gte('fecha_venta', `${currentYear}-01-01T00:00:00`)
          .lt('fecha_venta', `${currentYear + 1}-01-01T00:00:00`)

        if (stockError) console.error('Error loading stock:', stockError)
        if (recepcionesError) console.error('Error loading recepciones:', recepcionesError)
        if (consumosError) console.error('Error loading consumos:', consumosError)
        if (produccionError) console.error('Error loading produccion:', produccionError)
        if (ventasError) console.error('Error loading ventas:', ventasError)

        // Procesar y organizar los datos
        const processedData = processDataForDashboard({
          stock: stockData || [],
          recepciones: recepcionesData || [],
          consumos: consumosData || [],
          produccion: produccionData || [],
          ventas: ventasData || []
        })

        setData(processedData)
        console.log('Datos cargados y procesados:', processedData)

      } catch (error) {
        console.error('Error en loadAllData:', error)
      }
    }

    // Función para procesar los datos y organizarlos por mes
    const processDataForDashboard = (rawData: RawData) => {
      const processedData: DashboardData = {
        stockInicial: {},
        ingresos: {},
        stockFinal: {},
        consumo: {},
        produccionMadera: {},
        rendimientoMadera: {},
        ventasMadera: {},
        stockInicialMadera: {},
        stockFinalMadera: {},
        produccionAstillas: {},
        rendimientoAstillas: {},
        ventasAstillas: {},
        stockInicialAstillas: {},
        stockFinalAstillas: {},
        produccionAserrin: {},
        rendimientoAserrin: {},
        ventasAserrin: {},
        stockInicialAserrin: {},
        stockFinalAserrin: {}
      }

      // Procesar stock inicial
      rawData.stock.forEach((item: StockItem) => {
        const mesNombre = MESES[item.mes - 1]
        if (!processedData.stockInicial[item.producto_codigo]) {
          processedData.stockInicial[item.producto_codigo] = {}
        }
        processedData.stockInicial[item.producto_codigo][mesNombre] = parseFloat(item.volumen_m3)
      })

      // Procesar recepciones (ingresos)
      rawData.recepciones.forEach((item: RecepcionItem) => {
        // Usar procesamiento robusto de fecha para evitar problemas de zona horaria
        const fechaStr = item.fecha_recepcion.split('T')[0] // Tomar solo la parte de fecha
        const [año, mes] = fechaStr.split('-').map(Number)
        const mesNumero = mes - 1 // Convertir de 1-12 a 0-11
        const mesNombre = MESES[mesNumero]
        const cert = item.certificacion

        console.log('Procesando recepción:', {
          fecha_original: item.fecha_recepcion,
          fecha_procesada: fechaStr,
          año: año,
          mes: mes,
          mes_nombre: mesNombre,
          volumen: item.volumen_m3
        })

        if (!processedData.ingresos[cert]) {
          processedData.ingresos[cert] = {}
        }
        if (!processedData.ingresos[cert][mesNombre]) {
          processedData.ingresos[cert][mesNombre] = 0
        }
        processedData.ingresos[cert][mesNombre] += parseFloat(item.volumen_m3)
      })

      // Procesar consumos
      rawData.consumos.forEach((item: ConsumoItem) => {
        // Usar procesamiento robusto de fecha para evitar problemas de zona horaria
        const fechaStr = item.fecha_consumo.split('T')[0] // Tomar solo la parte de fecha
        const [año, mes] = fechaStr.split('-').map(Number)
        const mesNumero = mes - 1 // Convertir de 1-12 a 0-11
        const mesNombre = MESES[mesNumero]

        console.log('Procesando consumo:', {
          fecha_original: item.fecha_consumo,
          fecha_procesada: fechaStr,
          año: año,
          mes: mes,
          mes_nombre: mesNombre,
          volumen: item.volumen_m3
        })

        if (!processedData.consumo[mesNombre]) {
          processedData.consumo[mesNombre] = 0
        }
        processedData.consumo[mesNombre] += parseFloat(item.volumen_m3)
      })

      // Procesar producción
      rawData.produccion.forEach((item: ProduccionItem) => {
        // Usar procesamiento robusto de fecha para evitar problemas de zona horaria
        const fechaStr = item.fecha_produccion.split('T')[0] // Tomar solo la parte de fecha
        const [año, mes] = fechaStr.split('-').map(Number)
        const mesNumero = mes - 1 // Convertir de 1-12 a 0-11
        const mesNombre = MESES[mesNumero]

        console.log('Procesando producción:', {
          fecha_original: item.fecha_produccion,
          fecha_procesada: fechaStr,
          año: año,
          mes: mes,
          mes_nombre: mesNombre,
          producto: item.producto_destino_codigo,
          volumen: item.volumen_destino_m3
        })

        // Producción de madera (W5.2)
        if (item.producto_destino_codigo === 'W5.2') {
          if (!processedData.produccionMadera[mesNombre]) {
            processedData.produccionMadera[mesNombre] = 0
          }
          processedData.produccionMadera[mesNombre] += parseFloat(item.volumen_destino_m3)

          // Factor de rendimiento
          if (item.factor_rendimiento) {
            processedData.rendimientoMadera[mesNombre] = parseFloat(item.factor_rendimiento)
          }
        }

        // Producción de astillas (W3.1) y aserrín (W3.2) se calculará después sumando las ventas

        // Producción de aserrín (W3.2)
        if (item.producto_destino_codigo === 'W3.2') {
          if (!processedData.produccionAserrin[mesNombre]) {
            processedData.produccionAserrin[mesNombre] = 0
          }
          processedData.produccionAserrin[mesNombre] += parseFloat(item.volumen_destino_m3)

          if (item.factor_rendimiento) {
            processedData.rendimientoAserrin[mesNombre] = parseFloat(item.factor_rendimiento)
          }
        }
      })

      // Procesar ventas
      if (rawData.ventas && Array.isArray(rawData.ventas)) {
        rawData.ventas.forEach((item: VentaItem) => {
          // Usar procesamiento robusto de fecha para evitar problemas de zona horaria
          const fechaStr = item.fecha_venta.split('T')[0] // Tomar solo la parte de fecha
          const [año, mes] = fechaStr.split('-').map(Number)
          const mesNumero = mes - 1 // Convertir de 1-12 a 0-11
          const mesNombre = MESES[mesNumero]
          const cert = item.certificacion

          console.log('Procesando venta:', {
            fecha_original: item.fecha_venta,
            fecha_procesada: fechaStr,
            año: año,
            mes: mes,
            mes_nombre: mesNombre,
            producto: item.producto_codigo,
            volumen: item.volumen_m3,
            cliente: item.cliente
          })

          // Ventas de madera (W5.2)
          if (item.producto_codigo === 'W5.2') {
            if (!processedData.ventasMadera[cert]) {
              processedData.ventasMadera[cert] = {}
            }
            if (!processedData.ventasMadera[cert][mesNombre]) {
              processedData.ventasMadera[cert][mesNombre] = 0
            }
            processedData.ventasMadera[cert][mesNombre] += parseFloat(item.volumen_m3)
          }

          // Ventas de astillas (W3.1)
          if (item.producto_codigo === 'W3.1') {
            if (!processedData.ventasAstillas[cert]) {
              processedData.ventasAstillas[cert] = {}
            }
            if (!processedData.ventasAstillas[cert][mesNombre]) {
              processedData.ventasAstillas[cert][mesNombre] = 0
            }
            processedData.ventasAstillas[cert][mesNombre] += parseFloat(item.volumen_m3)
          }

          // Ventas de aserrín (W3.2)
          if (item.producto_codigo === 'W3.2') {
            if (!processedData.ventasAserrin[cert]) {
              processedData.ventasAserrin[cert] = {}
            }
            if (!processedData.ventasAserrin[cert][mesNombre]) {
              processedData.ventasAserrin[cert][mesNombre] = 0
            }
            processedData.ventasAserrin[cert][mesNombre] += parseFloat(item.volumen_m3)
          }
        })
      }

      // Calcular Stock Inicial automático y Stock Final
      // El stock inicial de cada mes debe ser el stock final del mes anterior
      ['W1.1', 'W5.2', 'W3.1', 'W3.2'].forEach(producto => {
        let stockAnterior = 0

        MESES.forEach(mes => {
          // Asegurar que la estructura existe
          if (!processedData.stockInicial[producto]) {
            processedData.stockInicial[producto] = {}
          }
          if (!processedData.stockFinal[producto]) {
            processedData.stockFinal[producto] = {}
          }

          // Stock inicial: usar el configurado manualmente o el stock final del mes anterior
          let stockInicial = processedData.stockInicial[producto][mes] || 0

          // Si no hay stock inicial configurado y hay stock anterior, usar el stock anterior
          // EXCEPTO para astillas y aserrín que siempre tienen stock 0
          if (stockInicial === 0 && stockAnterior > 0 && producto !== 'W3.1' && producto !== 'W3.2') {
            stockInicial = stockAnterior
            // Actualizar el stock inicial calculado
            if (!processedData.stockInicial[producto]) {
              processedData.stockInicial[producto] = {}
            }
            processedData.stockInicial[producto][mes] = stockInicial
          }

          // Calcular recepciones para este producto en este mes
          let totalRecepciones = 0
          if (producto === 'W1.1') {
            // Para W1.1, sumar todas las recepciones
            Object.keys(processedData.ingresos).forEach(cert => {
              totalRecepciones += processedData.ingresos[cert]?.[mes] || 0
            })
          }

          // Calcular producción para productos terminados
          let produccionMes = 0
          if (producto === 'W5.2') {
            produccionMes = processedData.produccionMadera[mes] || 0
          } else if (producto === 'W3.1') {
            produccionMes = processedData.produccionAstillas[mes] || 0
          } else if (producto === 'W3.2') {
            produccionMes = processedData.produccionAserrin[mes] || 0
          }

          // Calcular consumo (principalmente afecta a W1.1)
          const consumoMes = producto === 'W1.1' ? (processedData.consumo[mes] || 0) : 0

          // Calcular ventas para productos terminados
          let ventasMes = 0
          if (producto === 'W5.2') {
            Object.keys(processedData.ventasMadera).forEach(cert => {
              ventasMes += processedData.ventasMadera[cert]?.[mes] || 0
            })
          } else if (producto === 'W3.1') {
            Object.keys(processedData.ventasAstillas).forEach(cert => {
              ventasMes += processedData.ventasAstillas[cert]?.[mes] || 0
            })
          } else if (producto === 'W3.2') {
            Object.keys(processedData.ventasAserrin).forEach(cert => {
              ventasMes += processedData.ventasAserrin[cert]?.[mes] || 0
            })
          }

          // Calcular stock final según el tipo de producto
          let stockFinal = 0
          if (producto === 'W1.1') {
            // Para materia prima: Stock Inicial + Recepciones - Consumo
            stockFinal = stockInicial + totalRecepciones - consumoMes
          } else if (producto === 'W5.2') {
            // Para MADERA (W5.2): Stock Inicial + Producción - Ventas
            stockFinal = stockInicial + produccionMes - ventasMes
          } else if (producto === 'W3.1' || producto === 'W3.2') {
            // Para ASTILLAS y ASERRÍN: SIEMPRE STOCK INICIAL Y FINAL = 0 (se vende todo)
            stockInicial = 0
            stockFinal = 0
            // Actualizar también el stock inicial a 0
            if (!processedData.stockInicial[producto]) {
              processedData.stockInicial[producto] = {}
            }
            processedData.stockInicial[producto][mes] = 0
          }

          // Guardar stock final
          if (!processedData.stockFinal[producto]) {
            processedData.stockFinal[producto] = {}
          }
          processedData.stockFinal[producto][mes] = stockFinal

          // Actualizar stock anterior para el próximo mes
          // EXCEPTO para astillas y aserrín que siempre mantienen stock 0
          if (producto === 'W3.1' || producto === 'W3.2') {
            stockAnterior = 0
          } else {
            stockAnterior = stockFinal
          }
        })
      })

      // Calcular producción de astillas y aserrín (igual a las ventas totales del mes)
      MESES.forEach(mes => {
        // Producción de astillas = suma de todas las ventas de astillas del mes
        let totalVentasAstillasMes = 0
        Object.keys(processedData.ventasAstillas).forEach(cert => {
          totalVentasAstillasMes += processedData.ventasAstillas[cert]?.[mes] || 0
        })
        processedData.produccionAstillas[mes] = totalVentasAstillasMes

        // Producción de aserrín = suma de todas las ventas de aserrín del mes
        let totalVentasAserrinMes = 0
        Object.keys(processedData.ventasAserrin).forEach(cert => {
          totalVentasAserrinMes += processedData.ventasAserrin[cert]?.[mes] || 0
        })
        processedData.produccionAserrin[mes] = totalVentasAserrinMes
      })

      // Calcular factores de rendimiento automáticamente
      // Factor de Rendimiento = (Producción / Consumo) * 100
      MESES.forEach(mes => {
        // Factor de rendimiento para madera
        if (processedData.produccionMadera[mes] && processedData.consumo[mes]) {
          const factor = (processedData.produccionMadera[mes] / processedData.consumo[mes]) * 100
          processedData.rendimientoMadera[mes] = factor
        }

        // Factor de rendimiento para astillas: suma de ventas / Consumo W1.1
        let totalVentasAstillasMes = 0
        Object.keys(processedData.ventasAstillas).forEach(cert => {
          totalVentasAstillasMes += processedData.ventasAstillas[cert]?.[mes] || 0
        })
        if (totalVentasAstillasMes > 0 && processedData.consumo[mes]) {
          const factor = (totalVentasAstillasMes / processedData.consumo[mes]) * 100
          processedData.rendimientoAstillas[mes] = factor
          console.log(`📊 ${mes}: Rendimiento Astillas = ${totalVentasAstillasMes} / ${processedData.consumo[mes]} * 100 = ${factor.toFixed(2)}%`)
        }

        // Factor de rendimiento para aserrín: suma de ventas / Consumo W1.1
        let totalVentasAserrinMes = 0
        Object.keys(processedData.ventasAserrin).forEach(cert => {
          totalVentasAserrinMes += processedData.ventasAserrin[cert]?.[mes] || 0
        })
        if (totalVentasAserrinMes > 0 && processedData.consumo[mes]) {
          const factor = (totalVentasAserrinMes / processedData.consumo[mes]) * 100
          processedData.rendimientoAserrin[mes] = factor
          console.log(`📊 ${mes}: Rendimiento Aserrín = ${totalVentasAserrinMes} / ${processedData.consumo[mes]} * 100 = ${factor.toFixed(2)}%`)
        }
      })

      return processedData
    }

    fetchData()
  }, [user, year])

  return (
    <div className="min-h-screen" style={{ background: 'var(--light-green)' }}>
      {/* Header con navbar */}
      <Navbar />

      <div className="p-6">
        <div className="treetracker-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <label className="mr-3 text-gray-700 font-medium">Año:</label>
              <select
                className="px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{
                  borderColor: 'var(--light-brown)',
                  backgroundColor: 'white'
                }}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExcelExporter data={data} year={year} />
              <div className="border-l border-gray-300 mx-2 h-8"></div>
              <button
                onClick={() => setStockInicialOpen(true)}
                className="treetracker-button-secondary px-3 py-2 rounded-lg font-medium text-sm"
              >
                Stock Inicial
              </button>
              <button
                onClick={() => setRecepcionOpen(true)}
                className="treetracker-button-primary px-3 py-2 rounded-lg font-medium text-sm"
              >
                Recepción
              </button>
              <button
                onClick={() => setConsumoOpen(true)}
                className="treetracker-button-primary px-3 py-2 rounded-lg font-medium text-sm"
              >
                Consumo
              </button>
              <button
                onClick={() => setProduccionOpen(true)}
                className="treetracker-button-primary px-3 py-2 rounded-lg font-medium text-sm"
              >
                Producción
              </button>
              <button
                onClick={() => setVentaOpen(true)}
                className="treetracker-button-secondary px-3 py-2 rounded-lg font-medium text-sm"
              >
                Venta
              </button>
              <div className="border-l border-gray-300 mx-2 h-8"></div>
              <button
                onClick={() => setFunctionsManagerOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium text-sm"
              >
                Gestionar Funciones
              </button>
              <button
                onClick={() => setDocumentProcessorOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium text-sm"
              >
                Procesar Documentos
              </button>
              <div className="border-l border-gray-300 mx-2 h-8"></div>
              <div className="text-sm text-gray-600 font-medium">Ver Detalles:</div>
              <a
                href="/recepciones"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium text-sm"
              >
                📋 Recepciones
              </a>
              <a
                href="/ventas"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium text-sm"
              >
                💰 Ventas
              </a>
              <a
                href="/produccion"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium text-sm"
              >
                🏭 Producción
              </a>
              <a
                href="/consumo"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium text-sm"
              >
                ⚡ Consumo
              </a>
            </div>
          </div>
        </div>

        <div className="treetracker-table rounded-lg overflow-hidden shadow-lg">
          <table className="w-full table-auto border-collapse bg-white">
            <thead>
              <tr>
                <th className="px-4 py-4 text-left font-bold text-white text-lg" style={{ backgroundColor: 'var(--dark-green)' }}>
                  Concepto
                </th>
                <th className="px-4 py-4 text-left font-bold text-white text-lg" style={{ backgroundColor: 'var(--dark-green)' }}>
                  Producto
                </th>
                <th className="px-4 py-4 text-left font-bold text-white text-lg" style={{ backgroundColor: 'var(--dark-green)' }}>
                  Certificación
                </th>
                {MESES.map(m => (
                  <th key={m} className="px-3 py-4 text-center font-bold text-white text-lg" style={{ backgroundColor: 'var(--dark-green)' }}>
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* === SECCIÓN MATERIA PRIMA (W1.1) === */}
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-white" style={{ backgroundColor: 'var(--dark-green)' }}>
                  MATERIA PRIMA (W1.1)
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3" style={{ backgroundColor: 'var(--dark-green)' }} />
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                  Stock Inicial
                </td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                  W1.1 Trozos de pinus radiata
                </td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                  —
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockInicial['W1.1']?.[m])}
                  </td>
                ))}
              </tr>

              {/* === INGRESOS === */}
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-white" style={{ backgroundColor: 'var(--medium-brown)' }}>
                  INGRESOS
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3" style={{ backgroundColor: 'var(--medium-brown)' }} />
                ))}
              </tr>
              {CERTS.map(cert => (
                <tr key={cert} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W1.1 Trozos de pinus radiata</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>{cert}</td>
                  {MESES.map(m => (
                    <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                      {formatNumber(data.ingresos[cert]?.[m])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* === STOCK FINAL === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Stock Final</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W1.1 Trozos de pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockFinal['W1.1']?.[m])}
                  </td>
                ))}
              </tr>

              {/* === CONSUMO === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Consumo</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.consumo[m])}
                  </td>
                ))}
              </tr>

              {/* === SECCIÓN MADERA (W5.2) === */}
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-white" style={{ backgroundColor: 'var(--dark-green)' }}>
                  MADERA DIMENSIONADA (W5.2)
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3" style={{ backgroundColor: 'var(--dark-green)' }} />
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Producción</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W5.2 Madera dimensionada</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.produccionMadera[m])}
                  </td>
                ))}
              </tr>

              {/* === FACTOR RENDIMIENTO === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Factor Rendimiento</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>%</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.rendimientoMadera[m])}
                  </td>
                ))}
              </tr>

              {/* === VENTAS MADERA === */}
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-white" style={{ backgroundColor: 'var(--medium-brown)' }}>
                  VENTAS MADERA
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3" style={{ backgroundColor: 'var(--medium-brown)' }} />
                ))}
              </tr>
              {CERTS.map(cert => (
                <tr key={cert + '-venta'} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W5.2 Madera dimensionada pinus radiata</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>{cert}</td>
                  {MESES.map(m => (
                    <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                      {formatNumber(data.ventasMadera[cert]?.[m])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* === STOCK INICIAL MADERA === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Stock Inicial Madera</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W5.2 Madera dimensionada pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockInicial['W5.2']?.[m])}
                  </td>
                ))}
              </tr>

              {/* === STOCK FINAL MADERA === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Stock Final Madera</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W5.2 Madera dimensionada pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockFinal['W5.2']?.[m])}
                  </td>
                ))}
              </tr>

              {/* === SEPARADOR ASTILLAS === */}
              <tr>
                <td colSpan={15} className="h-4" style={{ backgroundColor: 'var(--light-brown)' }} />
              </tr>

              {/* === SECCIÓN SUBPRODUCTOS === */}
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-white" style={{ backgroundColor: 'var(--dark-green)' }}>
                  SUBPRODUCTOS
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3" style={{ backgroundColor: 'var(--dark-green)' }} />
                ))}
              </tr>

              {/* Astillas W3.1 */}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 font-semibold" style={{ color: 'var(--dark-green)' }}>
                  Astillas (W3.1)
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-2" />
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Producción</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.1 Astillas pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.produccionAstillas[m])}
                  </td>
                ))}
              </tr>

              {/* === FACTOR RENDIMIENTO ASTILLAS === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Factor Rendimiento</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.1 Astillas pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>%</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.rendimientoAstillas[m])}
                  </td>
                ))}
              </tr>

              {/* === VENTAS ASTILLAS === */}
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-white" style={{ backgroundColor: 'var(--medium-brown)' }}>
                  VENTAS ASTILLAS
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3" style={{ backgroundColor: 'var(--medium-brown)' }} />
                ))}
              </tr>
              {CERTS.map(cert => (
                <tr key={cert + '-venta-astillas'} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.1 Astillas pinus radiata</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>{cert}</td>
                  {MESES.map(m => (
                    <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                      {formatNumber(data.ventasAstillas[cert]?.[m])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* === STOCK INICIAL ASTILLAS === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Stock Inicial Astillas</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.1 Astillas pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockInicial['W3.1']?.[m])}
                  </td>
                ))}
              </tr>

              {/* === STOCK FINAL ASTILLAS === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Stock Final Astillas</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.1 Astillas pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockFinal['W3.1']?.[m])}
                  </td>
                ))}
              </tr>

              {/* === SEPARADOR ASERRÍN === */}
              <tr>
                <td colSpan={15} className="h-4" style={{ backgroundColor: 'var(--light-brown)' }} />
              </tr>

              {/* === PRODUCCIÓN ASERRÍN === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Producción Aserrín</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.2 Aserrín pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.produccionAserrin[m])}
                  </td>
                ))}
              </tr>

              {/* === FACTOR RENDIMIENTO ASERRÍN === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Factor Rendimiento</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.2 Aserrín pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>%</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.rendimientoAserrin[m])}
                  </td>
                ))}
              </tr>

              {/* === VENTAS ASERRÍN === */}
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-white" style={{ backgroundColor: 'var(--medium-brown)' }}>
                  VENTAS ASERRÍN
                </td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3" style={{ backgroundColor: 'var(--medium-brown)' }} />
                ))}
              </tr>
              {CERTS.map(cert => (
                <tr key={cert + '-venta-aserrin'} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.2 Aserrín pinus radiata</td>
                  <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>{cert}</td>
                  {MESES.map(m => (
                    <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                      {formatNumber(data.ventasAserrin[cert]?.[m])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* === STOCK INICIAL ASERRÍN === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Stock Inicial Aserrín</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.2 Aserrín pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockInicial['W3.2']?.[m])}
                  </td>
                ))}
              </tr>

              {/* === STOCK FINAL ASERRÍN === */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800 border-b" style={{ borderColor: 'var(--light-brown)' }}>Stock Final Aserrín</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>W3.2 Aserrín pinus radiata</td>
                <td className="px-4 py-3 text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>—</td>
                {MESES.map(m => (
                  <td key={m} className="px-3 py-3 text-right text-gray-700 border-b" style={{ borderColor: 'var(--light-brown)' }}>
                    {formatNumber(data.stockFinal['W3.2']?.[m])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALES --- */}
      <StockInicialForm
        isOpen={isStockInicialOpen}
        onClose={() => setStockInicialOpen(false)}
      />
      <RecepcionForm
        isOpen={isRecepcionOpen}
        onClose={() => setRecepcionOpen(false)}
      />
      <ConsumoForm
        isOpen={isConsumoOpen}
        onClose={() => setConsumoOpen(false)}
      />
      <ProduccionForm
        isOpen={isProduccionOpen}
        onClose={() => setProduccionOpen(false)}
      />
      <VentaForm
        isOpen={isVentaOpen}
        onClose={() => setVentaOpen(false)}
      />
      <UserFunctionsManager
        isOpen={isFunctionsManagerOpen}
        onClose={() => setFunctionsManagerOpen(false)}
      />
      <DocumentProcessor
        isOpen={isDocumentProcessorOpen}
        onClose={() => setDocumentProcessorOpen(false)}
        onProcessingComplete={() => {
          // Recargar datos del dashboard después del procesamiento
          window.location.reload()
        }}
      />
    </div>
  )
}

export default withAuth(DashboardPage)