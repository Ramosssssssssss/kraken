"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import XmlReciboPremium from "@/components/xml-recibo-premium"
import { useCompany } from "@/lib/company-context"

export default function XmlReciboPage() {
  const router = useRouter()
  const { companyData } = useCompany()
  const [xmlData, setXmlData] = useState<any[]>([])
  const [folio, setFolio] = useState("")
  const [meta, setMeta] = useState<{ serie?: string; folio?: string; emisor?: string; receptor?: string; total?: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [resolveFailures, setResolveFailures] = useState<string[]>([])

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

        // If provider is Panam, resolve NO_IDENTIFICACION -> CLAVE_ARTICULO via backend
        const provider = (parsed.meta?.provider || sessionStorage.getItem("snmicro_selected_provider") || "").toString().toLowerCase()
        if (provider.includes("panam")) {
          (async () => {
            try {
              const items = parsed.products || []
              const unique: string[] = Array.from(new Set(items.map((p: any) => (p.NO_IDENTIFICACION || p.NO_IDENTIFICA || p.NOIDENTIFICACION || "").toString().trim()).filter(Boolean)))
              if (unique.length === 0) return

              const base = companyData?.apiUrl ? companyData.apiUrl.replace(/\/+$/, "") : ""
              const endpoint = base ? `${base}/resolve-role` : `/api/snmicro/resolve-role`

              const resolves: Array<{ key: string; ok: boolean; data?: any }> = await Promise.all(unique.map(async (key: string) => {
                try {
                  const url = `${endpoint}?noid=${encodeURIComponent(String(key))}&provider=panam`
                  const resp = await fetch(url, { method: "GET", headers: { Accept: "application/json" } })
                  const text = await resp.text()
                  let j: any = null
                  try { j = JSON.parse(text) } catch { j = { ok: resp.ok, raw: text } }
                  console.debug("resolve-role response for", key, { status: resp.status, body: j })
                  if (!resp.ok) return { key, ok: false, data: j }
                  if (j?.ok && j?.data) return { key, ok: true, data: j.data }
                  return { key, ok: false, data: j }
                } catch (e) {
                  return { key, ok: false }
                }
              }))

              const map = new Map<string, { claveArticulo?: string; role?: number }>()
              const failed: string[] = []
              resolves.forEach((r) => {
                if (r.ok && r.data) {
                  // support multiple possible shapes from different backends
                  const data = r.data || {}
                  const claveArticulo = (data.claveArticulo || data.CLAVE_ARTICULO || data.clave || data.CLAVE || data.clave_articulo) ? String(data.claveArticulo || data.CLAVE_ARTICULO || data.clave || data.CLAVE || data.clave_articulo) : undefined
                  const role = data.role !== undefined ? Number(data.role) : (data.rol !== undefined ? Number(data.rol) : undefined)
                  map.set(String(r.key), { claveArticulo, role })
                } else {
                  failed.push(String(r.key))
                }
              })
              if (failed.length > 0) {
                console.warn("Failed to resolve the following NoIdentificacion keys:", failed)
                setResolveFailures(failed)
              }

              const updated = items.map((p: any) => {
                const noid = (p.NO_IDENTIFICACION || p.NO_IDENTIFICA || p.NOIDENTIFICACION || "").toString().trim()
                const found = map.get(noid)
                if (found) {
                  // write both a canonical CLAVE (uppercase) and a resolvedClave
                  // camelCase so other parts of the app (snMicro) can also read it.
                  return {
                    ...p,
                    CLAVE: found.claveArticulo || p.CLAVE,
                    resolvedClave: found.claveArticulo || undefined,
                    RESOLVED_ROLE: found.role ?? null,
                  }
                }
                return p
              })

              console.debug("Resolved mapping applied for NoIdentificacion keys", { map: Array.from(map.entries()) })
              setXmlData(updated)
              // persist back to sessionStorage so downstream sees resolved claves
              const newPayload = { products: updated, meta: parsed.meta }
              try { sessionStorage.setItem("xmlReciboData", JSON.stringify(newPayload)) } catch {}
            } catch (e) {
              console.warn("Error resolving NoIdentificacion in xml page:", e)
            }
          })()
        }
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
  }, [router, companyData])

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


      <XmlReciboPremium xmlData={xmlData} folio={meta?.folio ?? folio} />
  )
}