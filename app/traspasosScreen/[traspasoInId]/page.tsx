import { Suspense } from "react"
import TraspasoDetailPage from "./TraspasoDetailClient"

export default function Page({
  params,
}: {
  params: { traspasoInId: string }
}) {
  return (
    <Suspense fallback={<div>Cargando traspaso...</div>}>
      <TraspasoDetailPage params={params} />
    </Suspense>
  )
}
