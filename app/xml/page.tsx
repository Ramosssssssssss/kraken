"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import XmlReciboPremium from "@/components/xml-recibo-premium"

export default function XmlReciboPage() {
  const router = useRouter()
  const [xmlData, setXmlData] = useState<any[]>([])
  const [folio, setFolio] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedData = sessionStorage.getItem("xmlReciboData")
    const storedFolio = sessionStorage.getItem("xmlReciboFolio")

    if (!storedData || !storedFolio) {
      alert("No se encontraron datos del XML. Por favor selecciona un archivo primero.")
      router.push("/recibo/seleccion-tipo")
      return
    }

    try {
      const parsedData = JSON.parse(storedData)
      setXmlData(parsedData)
      setFolio(storedFolio)
    } catch (error) {
      console.error("[v0] Error parsing XML data from sessionStorage:", error)
      alert("Error al procesar los datos del XML")
      router.push("/recibo/seleccion-tipo")
      return
    } finally {
      setIsLoading(false)
    }
  }, [router])

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
