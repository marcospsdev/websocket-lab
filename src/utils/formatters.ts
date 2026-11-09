export const formatPrice = (value: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 6 : 2 })

export const formatPercent = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

export const formatQuantity = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 5 })

export const formatTime = (epochMs: number): string =>
  new Date(epochMs).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
