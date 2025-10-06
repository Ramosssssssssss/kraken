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

export type LabelTemplate = {
  id: string
  name: string
  width: number
  height: number
  css: (w: number, h: number, pad: number) => string
  renderHTML: (a: ArticleItem) => string
  preview: (a: ArticleItem) => React.ReactNode
}
