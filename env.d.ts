/// <reference types="vite/client" />

declare module 'cal-heatmap' {
  const CalHeatmap: { new (...args: unknown[]): unknown }
  export default CalHeatmap
}

declare module 'cal-heatmap/plugins/Tooltip' {
  const Tooltip: unknown
  export default Tooltip
}

declare module 'cal-heatmap/plugins/LegendLite' {
  const LegendLite: unknown
  export default LegendLite
}
