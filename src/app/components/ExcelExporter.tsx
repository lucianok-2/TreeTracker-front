'use client'

import * as XLSX from 'xlsx'
import { DashboardData } from '@/types/dashboard'

// Array de meses para usar en la exportación
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Certificaciones disponibles
const CERTS = [
  'FSC 100%',
  'FSC Mixto',
  'FSC Controlled Wood',
  'Material Controlado'
]

interface ExcelExporterProps {
  data: DashboardData
  year: number
  className?: string
  isVisionUser?: boolean
}

export const ExcelExporter: React.FC<ExcelExporterProps> = ({ data, year, className, isVisionUser = false }) => {
  const exportToExcel = () => {
    try {
      // Preparar los datos para Excel
      // Preparar los datos para Excel
      const excelData: any[][] = [
        // Headers
        ['Concepto', 'Producto', 'Certificación', ...MESES],

        // MATERIA PRIMA
        ['MATERIA PRIMA (W1.1)', '', ''],
        ['Stock Inicial', 'W1.1 Trozos de pinus radiata', '-', ...MESES.map(m => data.stockInicial['W1.1']?.[m] || 0)],

        // INGRESOS
        ['INGRESOS', '', ''],
        ...CERTS.map(cert => ['', 'W1.1 Trozos de pinus radiata', cert, ...MESES.map(m => data.ingresos[cert]?.[m] || 0)]),

        // Stock Final y Consumo
        ['Stock Final', 'W1.1 Trozos de pinus radiata', '-', ...MESES.map(m => data.stockFinal['W1.1']?.[m] || 0)],
        ['Consumo', '-', '-', ...MESES.map(m => data.consumo[m] || 0)]
      ]

      if (isVisionUser) {
        excelData.push(
          // PALLETS
          ['PALLETS (W10.3)', '', ''],
          ['Producción', 'W10.3 Pallets de madera', '-', ...MESES.map(m => data.produccionPallets[m] || 0)],
          ['Factor Rendimiento', '-', '%', ...MESES.map(m => data.rendimientoPallets[m] || 0)],
          ['VENTAS PALLETS', '', ''],
          ...CERTS.map(cert => ['', 'W10.3 Pallets de madera', cert, ...MESES.map(m => data.ventasPallets[cert]?.[m] || 0)]),
          ['Stock Inicial Pallets', 'W10.3 Pallets de madera', '-', ...MESES.map(m => data.stockInicial['W10.3']?.[m] || 0)],
          ['Stock Final Pallets', 'W10.3 Pallets de madera', '-', ...MESES.map(m => data.stockFinal['W10.3']?.[m] || 0)]
        )
      } else {
        excelData.push(
          // MADERA
          ['MADERA DIMENSIONADA (W5.2)', '', ''],
          ['Producción', 'W5.2 Madera dimensionada', '-', ...MESES.map(m => data.produccionMadera[m] || 0)],
          ['Factor Rendimiento', '-', '%', ...MESES.map(m => data.rendimientoMadera[m] || 0)],
          
          // Ventas Madera
          ['VENTAS MADERA', '', ''],
          ...CERTS.map(cert => ['', 'W5.2 Madera dimensionada', cert, ...MESES.map(m => data.ventasMadera[cert]?.[m] || 0)]),
          
          // Stock Madera
          ['Stock Inicial Madera', 'W5.2 Madera dimensionada', '-', ...MESES.map(m => data.stockInicial['W5.2']?.[m] || 0)],
          ['Stock Final Madera', 'W5.2 Madera dimensionada', '-', ...MESES.map(m => data.stockFinal['W5.2']?.[m] || 0)],
          
          // SUBPRODUCTOS
          ['SUBPRODUCTOS', '', ''],
          
          // Astillas
          ['Astillas (W3.1)', '', ''],
          ['Producción', 'W3.1 Astillas', '-', ...MESES.map(m => data.produccionAstillas[m] || 0)],
          ['Factor Rendimiento', 'W3.1 Astillas', '%', ...MESES.map(m => data.rendimientoAstillas[m] || 0)],
          ['VENTAS ASTILLAS', '', ''],
          ...CERTS.map(cert => ['', 'W3.1 Astillas', cert, ...MESES.map(m => data.ventasAstillas[cert]?.[m] || 0)]),
          
          // Aserrín
          ['Aserrín (W3.2)', '', ''],
          ['Producción', 'W3.2 Aserrín', '-', ...MESES.map(m => data.produccionAserrin[m] || 0)],
          ['Factor Rendimiento', 'W3.2 Aserrín', '%', ...MESES.map(m => data.rendimientoAserrin[m] || 0)],
          ['VENTAS ASERRÍN', '', ''],
          ...CERTS.map(cert => ['', 'W3.2 Aserrín', cert, ...MESES.map(m => data.ventasAserrin[cert]?.[m] || 0)])
        )
      }

      // Crear libro de Excel
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Balance Anual')

      // Guardar archivo
      XLSX.writeFile(wb, `Balance_TreeTracker_${year}.xlsx`)

    } catch (error) {
      console.error('Error exportando a Excel:', error)
      alert('Error al exportar a Excel. Por favor, intente nuevamente.')
    }
  }

  return (
    <button
      onClick={exportToExcel}
      className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${className || ''}`}
    >
      <span>📊</span> Exportar Excel
    </button>
  )
}

export default ExcelExporter
