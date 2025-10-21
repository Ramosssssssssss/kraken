"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import XmlReciboPremium from "@/components/xml-recibo-premium"

export default function XmlReciboPage() {
  const router = useRouter()
  const [xmlData, setXmlData] = useState<any[]>([])
  const [folio, setFolio] = useState("")
  const [meta, setMeta] = useState<{ serie?: string; folio?: string; emisor?: string; receptor?: string; total?: number } | null>(null)
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
      const parsed = JSON.parse(storedData)

      // support new shape { products, meta } or old array
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.products)) {
        setXmlData(parsed.products)
        setMeta(parsed.meta || null)
        if (parsed.meta?.folio) setFolio(parsed.meta.folio)
        else if (storedFolio) setFolio(storedFolio)
      } else if (Array.isArray(parsed)) {
        setXmlData(parsed)
        setFolio(storedFolio)
      } else {
        throw new Error("Formato de datos inesperado")
      }
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #ccc', borderTop: '4px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px' }}>Cargando datos del XML...</p>
        </div>
      </div>
    )
  }

  return (
    <div>


      <XmlReciboPremium xmlData={xmlData} folio={meta?.folio ?? folio} />
    </div>
  )
}