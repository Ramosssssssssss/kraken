import { Suspense } from "react"
import ManualReciboContent from "./manual-recibo-content"

export default function ManualReciboPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 font-medium">Cargando recepción manual...</p>
          </div>
        </div>
      }
    >
      <ManualReciboContent />
    </Suspense>
  )
}
