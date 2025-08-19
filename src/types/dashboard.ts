export interface DashboardData {
  stockInicial: Record<string, Record<string, number>> // producto -> mes -> valor
  ingresos: Record<string, Record<string, number>>
  stockFinal: Record<string, Record<string, number>>
  consumo: Record<string, number>
  produccionMadera: Record<string, number>
  rendimientoMadera: Record<string, number>
  ventasMadera: Record<string, Record<string, number>>
  stockInicialMadera: Record<string, number>
  stockFinalMadera: Record<string, number>
  produccionAstillas: Record<string, number>
  rendimientoAstillas: Record<string, number>
  ventasAstillas: Record<string, Record<string, number>>
  stockInicialAstillas: Record<string, number>
  stockFinalAstillas: Record<string, number>
  produccionAserrin: Record<string, number>
  rendimientoAserrin: Record<string, number>
  ventasAserrin: Record<string, Record<string, number>>
  stockInicialAserrin: Record<string, number>
  stockFinalAserrin: Record<string, number>
}
