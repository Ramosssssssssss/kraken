// app/xml/XmlClient.tsx
"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import XmlReciboPremium from "@/components/xml-recibo-premium"

export default function XmlClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [xmlData, setXmlData] = useState<any[]>([])
  const [folio, setFolio] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // En React 19/Next 15, useSearchParams suspende hasta que existan los params
    // Este efecto corre en el cliente, nunca en build.
    try {
      const folioParam = searchParams.get("folio")
      const dataParam = searchParams.get("data")

      if (!folioParam || !dataParam) {
        // Redirige sin alerts para evitar problemas de SSR/Build
        router.replace("/recibo/seleccion-tipo")
        return
      }

      // data viene URL-encoded; decodeURIComponent + parse
      let parsed: any
      try {
        const decoded = decodeURIComponent(dataParam)
        parsed = JSON.parse(decoded)
        if (!Array.isArray(parsed)) {
          // Normaliza a array si te llega un objeto
          parsed = [parsed]
        }
      } catch (err) {
        console.error("[/xml] Error parsing `data` param:", err)
        router.replace("/recibo/seleccion-tipo")
        return
      }

      setXmlData(parsed)
      setFolio(folioParam)
    } finally {
      setIsLoading(false)
    }
  }, [searchParams, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-cyan-900 font-medium">Cargando datos del XML...</p>
        </div>
      </div>
    )
  }

  return <XmlReciboPremium xmlData={xmlData} folio={folio} />
}
