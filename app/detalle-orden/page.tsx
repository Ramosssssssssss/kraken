import { Suspense } from "react"
import DetalleOrdenClient from "./DetalleOrdenClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando orden...</div>}>
      <DetalleOrdenClient />
    </Suspense>
  )
}
