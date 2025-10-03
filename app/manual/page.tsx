import { Suspense } from "react"
import ManualReciboContent from "./manual-recibo-content"

export default function ManualReciboPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Cargando recepción manual...</p>
          </div>
        </div>
      }
    >
      <ManualReciboContent />
    </Suspense>
  )
}
