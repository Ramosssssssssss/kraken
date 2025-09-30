// app/detalle-orden/page.tsx
import { Suspense } from "react"
import DetalleOrdenClient from "./DetalleOrdenClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <DetalleOrdenClient />
    </Suspense>
  )
}

