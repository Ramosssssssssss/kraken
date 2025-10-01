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
    // En Next 15/React 19, useSearchParams suspende hasta que hay params (por eso lo envolvemos con <Suspense> en page.tsx)
    try {
      const folioParam = searchParams.get("folio")
      const dataParam = searchParams.get("data")

      if (!folioParam || !dataParam) {
        router.replace("/recibo/seleccion-tipo")
        return
      }

      try {
        const decoded = decodeURIComponent(dataParam)
        const parsed = JSON.parse(decoded)
        setXmlData(Array.isArray(parsed) ? parsed : [parsed])
        setFolio(folioParam)
      } catch (err) {
        console.error("[/xml] Error parsing `data`:", err)
        router.replace("/recibo/seleccion-tipo")
        return
      }
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
