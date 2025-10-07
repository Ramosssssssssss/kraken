// lib/labels/types.ts
export type ArticleItem = {
  id: string
  codigo: string
  nombre: string
  precio: number
  distribuidor: number
  unidad: string
  fecha: string
  estatus: string | null
  inventarioMaximo: number
  quantity: number
}

// añade esto a tu interfaz LabelTemplate
export type Dpi = 203 | 300 | 600

export interface LabelTemplate {
  id: string
  name: string
  width: number // mm
  height: number // mm
  css: (w: number, h: number, pad?: number) => string
  renderHTML: (a: ArticleItem) => string
  preview: (a: ArticleItem) => React.ReactNode

  // NUEVO: opcional. Si existe, la app lo usará para móvil/Zebra.
  renderZPL?: (a: ArticleItem, dpi: Dpi) => string
}
