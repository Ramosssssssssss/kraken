"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { useCompany } from "@/lib/company-context"
import { useRouter } from "next/navigation"
import {
  Scan,
  Zap,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
  Package,
  Search,
  BarChart3,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface Detalle {
  CLAVE_ARTICULO?: string
  NOMBRE?: string
  UNIDADES?: number
  UMED?: string
  CODIGO_BARRAS?: string
  _key?: string
  packed?: number
  scanned?: number
  CANTIDAD_REQUERIDA?: number
  CANTIDAD_ESCANEADA?: number
  NOTAS?: string
  ARTICULO_ID?: number
  articulo_id?: number
  id?: number
  ID?: number
  ArticuloId?: number
  ARTICULO_ID_ORIGINAL?: number
  ART_ID?: number
  R_CODIGO_BARRAS?: string
  R_CLAVE_ARTICULO?: string
  R_ARTICULO_ID?: number
}

type IncidentType = "extra" | "changed" | "missing"

interface Incident {
  id: string
  type: IncidentType
  productKey: string
  productName: string
  quantity: number
  expectedProductKey?: string
  expectedProductName?: string
  notes?: string
  timestamp: Date
  articuloId?: number
}

function normalizeFolio(folio: string): string {
  if (!folio) return folio
  const match = folio.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) return folio
  const letters = match[1]
  const numbers = match[2]
  const totalLength = 9
  const lettersLength = letters.length
  const numbersNeeded = totalLength - lettersLength
  if (numbersNeeded <= 0) return folio
  const paddedNumbers = numbers.padStart(numbersNeeded, "0")
  return letters + paddedNumbers
}

function normalizeText(text: string): string {
  if (!text) return text
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getField<T = any>(row: any, candidates: string[], fallback?: T): T | undefined {
  if (!row) return fallback
  const lowerMap: Record<string, any> = {}
  Object.keys(row).forEach((k) => (lowerMap[k.toLowerCase()] = row[k]))
  for (const name of candidates) {
    const val = lowerMap[name.toLowerCase()]
    if (val !== undefined && val !== null && val !== "") return val as T
  }
  return fallback
}

export default function ReciboScreenPremium() {
  const { apiUrl } = useCompany()
  const baseURL = useMemo(() => (apiUrl?.trim() ? apiUrl.trim() : "https://picking-backend.onrender.com"), [apiUrl])

  const [folio, setFolio] = useState("")
  const [caratula, setCaratula] = useState<any | null>(null)
  const [detalles, setDetalles] = useState<Detalle[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [receptionComplete, setReceptionComplete] = useState(false)

  const [requireScan, setRequireScan] = useState(true)
  const [autoFill, setAutoFill] = useState(false)
  const router = useRouter()

  const [scanValue, setScanValue] = useState("")
  const [scannerActive, setScannerActive] = useState(true)
  const scannerRef = useRef<HTMLInputElement>(null)
  const folioRef = useRef<HTMLInputElement>(null)

  const [codigosInnerMap, setCodigosInnerMap] = useState<{
    [key: string]: {
      contenidoEmpaque: number
      articuloId: number
      claveArticuloId: number
    }
  }>({})

  const focusScanner = useCallback(() => {
    requestAnimationFrame(() => {
      if (scannerRef.current && !receptionComplete) {
        scannerRef.current.focus()
      }
    })
  }, [receptionComplete])

  useEffect(() => {
    focusScanner()
  }, [focusScanner])

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [scannedProducts, setScannedProducts] = useState<{ [key: string]: number }>({})
  const flashIndex = useRef<number | null>(null)

  const flashLine = (idx: number) => {
    flashIndex.current = idx
    setTimeout(() => {
      flashIndex.current = null
    }, 220)
  }

  const fetchText = async (url: string, options?: RequestInit) => {
    const resp = await fetch(url, options)
    const text = await resp.text()
    if (!resp.ok) throw new Error(`${resp.status}: ${text?.slice(0, 160)}`)
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`Respuesta no JSON: ${text?.slice(0, 160)}`)
    }
  }

  const normalizeCaratula = (row: any): any => ({
    FECHA: getField(row, ["FECHA"]),
    FOLIO: getField(row, ["FOLIO"]),
    ALMACEN: getField(row, ["ALMACEN"]),
    PROVEEDOR: getField(row, ["PROVEEDOR"]),
    CLAVE_PROV: getField(row, ["CLAVE_PROV"]),
    DOCTO_CM_ID: Number(getField(row, ["DOCTO_CM_ID"], 0)) || null,
  })

  const normalizeDetalle = (rows: any[]): Detalle[] =>
    (rows || []).map((r, idx) => {
      const clave = getField<string>(
        r,
        ["CLAVE_ARTICULO", "R_CLAVE_ARTICULO", "CLAVE", "CODIGO", "R_CODIGO"],
        undefined,
      )
      const nombre = getField<string>(r, ["NOMBRE", "DESCRIPCION", "R_DESCRIPCION", "ARTICULO", "R_NOMBRE"], undefined)
      const nombreNormalizado = nombre ? normalizeText(nombre) : ""

      const umed = getField<string>(r, ["UMED", "UNIDAD", "UNIDAD_VENTA", "R_UMED", "UM"], undefined)
      const unidadesRaw =
        getField<any>(r, ["UNIDADES", "CANTIDAD", "R_UNIDADES", "CANT_RECIBIR", "UNIDADES_SOL", "SOLICITADO"], 0) ?? 0
      const unidades = Number(unidadesRaw) || 0
      const codbar = getField<string>(
        r,
        ["R_CODIGO_BARRAS", "CODIGO_BARRAS", "CODIGOB", "R_CODBAR", "CODBAR"],
        undefined,
      )
      const articuloId = getField<number>(
        r,
        [
          "ARTICULO_ID",
          "R_ARTICULO_ID",
          "ARTICULOID",
          "ID_ARTICULO",
          "IDARTICULO",
          "ARTICULO",
          "ART_ID",
          "ID",
          "ARTID",
        ],
        undefined,
      )

      return {
        CLAVE_ARTICULO: clave,
        NOMBRE: nombreNormalizado,
        UNIDADES: unidades,
        UMED: umed,
        CODIGO_BARRAS: codbar,
        _key: `det-${idx}`,
        packed: 0,
        scanned: 0,
        CANTIDAD_REQUERIDA: unidades,
        NOTAS: "",
        ARTICULO_ID: articuloId,
        articulo_id: articuloId,
        id: articuloId,
        ID: articuloId,
        ArticuloId: articuloId,
        ARTICULO_ID_ORIGINAL: articuloId,
        ART_ID: articuloId,
        R_CODIGO_BARRAS: codbar,
        R_CLAVE_ARTICULO: clave,
        R_ARTICULO_ID: articuloId,
      }
    })

  const fetchOrdenCombinada = useCallback(
    async (fol: string) => {
      const url = `${baseURL}/recibo/orden?folio=${encodeURIComponent(fol)}`
      const json = await fetchText(url)
      if (!json?.ok) throw new Error(json?.error || "Error al obtener orden")

      const car = normalizeCaratula((json.caratula || [])[0] || {})
      const det = normalizeDetalle(json.detalles || [])

      setCaratula(car)
      setDetalles(det)
    },
    [baseURL],
  )

  const fetchOrdenPorPartes = useCallback(
    async (fol: string) => {
      const MAX_RETRIES = 3
      let intentos = 0

      while (intentos < MAX_RETRIES) {
        try {
          const urlCar = `${baseURL}/recibo/caratula?folio=${encodeURIComponent(fol)}`
          const jCar = await fetchText(urlCar)
          if (!jCar?.ok) throw new Error(jCar?.error || "Error de carátula")
          const car = normalizeCaratula((jCar.caratula || [])[0] || {})
          setCaratula(car)

          const urlDet = `${baseURL}/recibo/oc-detalle-completo?folioOC=${encodeURIComponent(fol)}&folioOriginal=${encodeURIComponent(fol)}`
          const jDet = await fetchText(urlDet)
          if (!jDet?.ok) throw new Error(jDet?.error || "Error de detalle")

          const det = normalizeDetalle(jDet.detalles || [])
          setDetalles(det)

          const innerMap: {
            [key: string]: {
              contenidoEmpaque: number
              articuloId: number
              claveArticuloId: number
            }
          } = {}

          if (jDet.codigosInner && Array.isArray(jDet.codigosInner)) {
            jDet.codigosInner.forEach((inner: any) => {
              innerMap[inner.CODIGO_INNER] = {
                contenidoEmpaque: inner.CONTENIDO_EMPAQUE || 1,
                articuloId: inner.ARTICULO_ID,
                claveArticuloId: inner.CLAVE_ARTICULO_ID,
              }
            })
          }

          setCodigosInnerMap(innerMap)
          return
        } catch (error) {
          intentos++
          if (intentos >= MAX_RETRIES) {
            throw error
          }
          await new Promise((res) => setTimeout(res, 1000 * intentos))
        }
      }
    },
    [baseURL],
  )

  const buscar = useCallback(async () => {
    const fol = folio.trim()
    if (!fol) {
      alert("Ingresa un folio (ej. A-1234)")
      return
    }

    const normalizedFolio = normalizeFolio(fol)
    setLoading(true)
    setCaratula(null)
    setDetalles([])
    setReceptionComplete(false)

    try {
      try {
        await fetchOrdenCombinada(normalizedFolio)
      } catch {
        await fetchOrdenPorPartes(normalizedFolio)
      }
      setScannerActive(true)
      focusScanner()
    } catch (err: any) {
      console.error("buscar:", err)
      alert(err?.message || "No se pudo cargar la orden")
    } finally {
      setLoading(false)
    }
  }, [folio, fetchOrdenCombinada, fetchOrdenPorPartes, focusScanner])

  const onRefresh = useCallback(async () => {
    if (!folio.trim()) return
    setRefreshing(true)
    try {
      await buscar()
    } finally {
      setRefreshing(false)
    }
  }, [folio, buscar])

  const totalLineas = detalles.length
  const totalRequeridas = detalles.reduce((acc, d) => acc + (d.UNIDADES ?? 0), 0)
  const lineasCompletas = detalles.filter((d) => {
    const req = d.UNIDADES ?? 0
    const ok = requireScan ? (d.scanned ?? 0) >= req : (d.packed ?? 0) >= req
    return req > 0 && ok
  }).length
  const totalHechas = detalles.reduce((acc, d) => {
    const val = requireScan ? (d.scanned ?? 0) : (d.packed ?? 0)
    return acc + val
  }, 0)
  const progreso = totalRequeridas > 0 ? Math.min(1, totalHechas / totalRequeridas) : 0

  const listo =
    totalLineas > 0 &&
    detalles.every((d) => {
      const required = d.UNIDADES ?? 0
      const scanned = requireScan ? (d.scanned ?? 0) : (d.packed ?? 0)
      const missingIncident = incidents.find((inc) => inc.type === "missing" && inc.productKey === d.CLAVE_ARTICULO)
      if (missingIncident) {
        return scanned >= missingIncident.quantity
      }
      return scanned >= required
    })

  const inc = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.UNIDADES ?? 0
      const pk = d.packed ?? 0
      if (pk < req) next[idx] = { ...d, packed: pk + 1 }
      return next
    })
    focusScanner()
  }

  const dec = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const pk = d.packed ?? 0
      const sc = d.scanned ?? 0
      if (pk > 0) next[idx] = { ...d, packed: pk - 1, scanned: Math.min(sc, pk - 1) }
      return next
    })
    focusScanner()
  }

  const fillToRequired = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.UNIDADES ?? 0
      next[idx] = { ...d, packed: req, scanned: requireScan ? (d.scanned ?? 0) : req }
      return next
    })
    focusScanner()
  }

  const playSound = useCallback(async (type: "success" | "error") => {
    console.log(`[v0] Playing sound: ${type}`)
  }, [])

  const processScan = useCallback(
    async (scannedCode: string) => {
      if (!scannedCode.trim() || !detalles.length || receptionComplete) return

      let foundIndex = -1
      let foundProduct = detalles.find((product, index) => {
        const barcodeMatch = product.CODIGO_BARRAS === scannedCode
        const articleMatch = product.CLAVE_ARTICULO === scannedCode
        if (barcodeMatch || articleMatch) {
          foundIndex = index
          return true
        }
        return false
      })

      let multiplier = 1

      if (!foundProduct) {
        const innerInfo = codigosInnerMap[scannedCode]
        if (innerInfo) {
          multiplier = innerInfo.contenidoEmpaque
          foundProduct = detalles.find((product, index) => {
            if (product.ARTICULO_ID === innerInfo.articuloId) {
              foundIndex = index
              return true
            }
            return false
          })
        }
      }

      if (foundProduct && foundIndex !== -1) {
        const element = document.getElementById(`product-${foundIndex}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }

        flashLine(foundIndex)

        const currentScanned = scannedProducts[foundProduct._key || `r-${foundIndex}`] || 0
        const required = foundProduct.UNIDADES || 0
        const newScannedAmount = currentScanned + multiplier

        if (newScannedAmount <= required) {
          setScannedProducts((prev) => ({
            ...prev,
            [foundProduct._key || `r-${foundIndex}`]: newScannedAmount,
          }))

          const newDetalles = [...detalles]
          newDetalles[foundIndex] = {
            ...newDetalles[foundIndex],
            scanned: newScannedAmount,
            packed: requireScan ? newScannedAmount : newDetalles[foundIndex].packed || 0,
          }
          setDetalles(newDetalles)

          playSound("success")
        } else {
          alert(
            `Este escaneo agregaría ${multiplier} unidades, pero solo se necesitan ${required - currentScanned} más`,
          )
          playSound("error")
        }
      } else {
        alert(`El código "${scannedCode}" no se encontró en este recibo`)
        playSound("error")
      }

      setScanValue("")
    },
    [detalles, scannedProducts, requireScan, codigosInnerMap, playSound, receptionComplete],
  )

  const updateQuantitiesForIncidents = async () => {
    if (!caratula?.DOCTO_CM_ID || incidents.length === 0) {
      return
    }

    const ajustes = []

    for (const incident of incidents) {
      if (incident.type === "missing" && incident.quantity) {
        try {
          const articuloResponse = await fetch(`${baseURL}/recibo/obtener-articulo-id`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ claveArticulo: incident.productKey }),
          })

          const articuloData = await articuloResponse.json()

          if (articuloData.ok && articuloData.articuloId) {
            ajustes.push({
              articuloId: articuloData.articuloId,
              nuevaCantidad: incident.quantity,
            })
          }
        } catch (error) {
          console.error(`Error getting ARTICULO_ID for ${incident.productKey}:`, error)
        }
      }
    }

    if (ajustes.length === 0) {
      return
    }

    try {
      const url = `${baseURL}/recibo/actualizar-cantidades`
      const payload = {
        doctoId: caratula.DOCTO_CM_ID,
        ajustes,
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error || "Error al actualizar cantidades")
      }
    } catch (error) {
      console.error("Error updating quantities:", error)
      throw error
    }
  }

  const handleRecepcionar = async () => {
    if (!caratula?.DOCTO_CM_ID) {
      alert("No hay documento para recepcionar")
      return
    }

    const MAX_RETRIES = 3
    let intentos = 0

    try {
      setLoading(true)
      await updateQuantitiesForIncidents()

      while (intentos < MAX_RETRIES) {
        try {
          const url = `${baseURL}/recibo/recepcion?doctoId=${caratula.DOCTO_CM_ID}`
          const response = await fetch(url)
          const data = await response.json()

          if (data.ok) {
            setReceptionComplete(true)

            if (incidents.length > 0) {
              const incidentSummary = incidents
                .map(
                  (inc) =>
                    `${
                      inc.type === "missing" ? "De menos" : inc.type === "extra" ? "De más" : "Dañado"
                    }: ${inc.notes || inc.productName}${inc.quantity ? ` (${inc.quantity})` : ""}`,
                )
                .join("\n")

              alert(`Se completó la recepción con las siguientes incidencias:\n\n${incidentSummary}`)
            } else {
              alert("Recepción completada correctamente")
            }
            return
          } else {
            throw new Error(data.error || "Error en la recepción")
          }
        } catch (err) {
          intentos++
          if (intentos >= MAX_RETRIES) {
            alert("No se pudo completar la recepción después de varios intentos.")
            return
          }
          await new Promise((res) => setTimeout(res, 1000 * intentos))
        }
      }
    } catch (error) {
      console.error("Reception error:", error)
      alert("Error al procesar la recepción: " + String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleNewReceipt = () => {
    setFolio("")
    setCaratula(null)
    setDetalles([])
    setIncidents([])
    setScannedProducts({})
    setReceptionComplete(false)
    setScannerActive(true)
    setTimeout(() => {
      if (folioRef.current) {
        folioRef.current.focus()
      }
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans">
      <div className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm hover:bg-white/90 transition-all duration-200"
                onClick={() => router.replace("/RECIBO/home")}
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Recepción de Mercancía</h1>
                  <p className="text-sm text-slate-500">Recibo Ordenes de Compra</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className={`w-10 h-10 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                  requireScan
                    ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                    : "bg-white/80 border-white/20 text-slate-600 hover:bg-white/90"
                }`}
                onClick={() => setRequireScan(!requireScan)}
              >
                <Scan className="w-4 h-4" />
              </button>

              <button
                className={`w-10 h-10 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                  autoFill
                    ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                    : "bg-white/80 border-white/20 text-slate-600 hover:bg-white/90"
                }`}
                onClick={() => setAutoFill(!autoFill)}
              >
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <div className="glass rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={folioRef}
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                placeholder="Buscar por folio (ej. A-1234)..."
                className="w-full pl-12 pr-4 py-3 bg-white/60 border border-white/30 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900/30 transition-all duration-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    buscar()
                  }
                }}
                disabled={receptionComplete}
              />
            </div>
            <button
              className="btn-premium px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              onClick={buscar}
              disabled={loading || receptionComplete}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </div>
              ) : (
                "Buscar"
              )}
            </button>
          </div>
        </div>

        {/* Hidden Scanner Input */}
        <input
          ref={scannerRef}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              processScan(scanValue)
              setScanValue("")
              focusScanner()
            }
          }}
          placeholder="Escanea código de artículo o código de barras..."
          className="absolute w-px h-px opacity-0 -z-10"
          autoComplete="off"
          disabled={receptionComplete}
        />

        {/* Reception Complete State */}
        {receptionComplete && (
          <div className="glass rounded-2xl p-8 mb-8 border border-green-200/50 bg-gradient-to-r from-green-50/80 to-emerald-50/80 animate-fade-in-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-success">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-green-900 mb-2">¡Recepción Completada!</h3>
              <p className="text-green-700 mb-6">El folio {caratula?.FOLIO} ha sido procesado exitosamente</p>
              <button
                className="btn-premium px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all duration-200"
                onClick={handleNewReceipt}
              >
                Procesar Nuevo Recibo
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !receptionComplete && (
          <div className="glass rounded-2xl p-12 mb-8 border border-white/20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Cargando información del recibo...</p>
            </div>
          </div>
        )}

        {/* Caratula */}
        {caratula && !receptionComplete && (
          <div className="glass rounded-2xl p-6 mb-8 border border-white/20 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Información del Recibo</h3>
                <p className="text-sm text-slate-500">Detalles de la orden de compra</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Folio</p>
                <p className="text-lg font-bold text-slate-900">{caratula.FOLIO || "—"}</p>
              </div>
              <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Proveedor</p>
                <p className="text-lg font-bold text-slate-900">{caratula.PROVEEDOR || "—"}</p>
              </div>
              <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Fecha</p>
                <p className="text-lg font-bold text-slate-900">{caratula.FECHA || "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Incidents Indicator */}
        {incidents.length > 0 && !receptionComplete && (
          <div className="glass rounded-2xl p-4 mb-6 border border-orange-200/50 bg-gradient-to-r from-orange-50/80 to-amber-50/80 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-orange-900">
                  {incidents.length} incidencia{incidents.length !== 1 ? "s" : ""} reportada
                  {incidents.length !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-orange-700">Se procesarán automáticamente al completar la recepción</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Section */}
        {detalles.length > 0 && !receptionComplete && (
          <div className="glass rounded-2xl p-6 mb-8 border border-white/20 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-3xl">Progreso de Recepción</h3>
                  <p className="text-2xl text-slate-500 ">
                    {lineasCompletas}/{totalLineas} líneas • {totalHechas}/{totalRequeridas} piezas
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-5xl font-bold text-slate-900">{Math.round(progreso * 100)}%</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Completado</p>
              </div>
            </div>

            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                  listo
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : "bg-gradient-to-r from-slate-600 to-slate-800"
                }`}
                style={{ width: `${progreso * 100}%` }}
              />
              {progreso > 0 && <div className="absolute top-0 left-0 h-full w-full shimmer rounded-full" />}
            </div>
          </div>
        )}

        {detalles.length > 0 && !receptionComplete && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Detalle de Productos</h3>
                <p className="text-sm text-slate-500">{detalles.length} artículos para recepcionar</p>
              </div>
            </div>

            <div className="space-y-3 custom-scrollbar max-h-96 overflow-y-auto">
              {detalles.map((item, index) => {
                const req = item.UNIDADES ?? 0
                const pk = item.packed ?? 0
                const sc = item.scanned ?? 0
                const okLinea = requireScan ? sc >= req : pk >= req
                const isFlash = flashIndex.current === index

                return (
                  <div
                    key={item._key || `r-${index}`}
                    id={`product-${index}`}
                    className={`glass rounded-2xl p-6 border transition-all duration-300 animate-fade-in-up ${
                      okLinea
                        ? "border-green-200/50 bg-gradient-to-r from-green-50/80 to-emerald-50/80"
                        : "border-white/20"
                    } ${isFlash ? "ring-2 ring-slate-900/20 scale-[1.02]" : ""}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`status-dot w-3 h-3 rounded-full ${
                              okLinea ? "bg-green-500 status-success" : "bg-slate-300"
                            }`}
                          />
                          <h4 className="text-lg font-bold text-slate-900 truncate">{item.CLAVE_ARTICULO || "—"}</h4>
                        </div>

                        {item.NOMBRE && <p className="text-slate-600 mb-3 leading-relaxed">{item.NOMBRE}</p>}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-white/60 rounded-lg p-3 border border-white/30">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Requerido</p>
                            <p className="text-xl font-bold text-slate-900">{req}</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3 border border-white/30">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Escaneado</p>
                            <p className="text-xl font-bold text-green-600">{sc}</p>
                          </div>
                        </div>

                        {(item.UMED || item.CODIGO_BARRAS) && (
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            {item.UMED && <span className="bg-slate-100 px-2 py-1 rounded-md">UM: {item.UMED}</span>}
                            {item.CODIGO_BARRAS && (
                              <span className="bg-slate-100 px-2 py-1 rounded-md">CB: {item.CODIGO_BARRAS}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-3 ml-6">
                        <div className="flex items-center gap-2">
                          <button
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                              requireScan
                                ? "bg-slate-200 cursor-not-allowed"
                                : "bg-slate-900 hover:bg-slate-800 shadow-lg"
                            }`}
                            onClick={() => !requireScan && dec(index)}
                            disabled={requireScan}
                          >
                            <Minus className="w-4 h-4 text-white" />
                          </button>

                          <div className="w-12 text-center">
                            <span className="text-xl font-bold text-slate-900">{pk}</span>
                          </div>

                          <button
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                              requireScan
                                ? "bg-slate-200 cursor-not-allowed"
                                : "bg-slate-900 hover:bg-slate-800 shadow-lg"
                            }`}
                            onClick={() => !requireScan && inc(index)}
                            onMouseDown={(e) => {
                              if (!requireScan) {
                                const timer = setTimeout(() => fillToRequired(index), 250)
                                const handleMouseUp = () => {
                                  clearTimeout(timer)
                                  document.removeEventListener("mouseup", handleMouseUp)
                                }
                                document.addEventListener("mouseup", handleMouseUp)
                              }
                            }}
                            disabled={requireScan}
                          >
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        <p className="text-xs text-center text-slate-500 leading-tight max-w-24">
                          {requireScan ? "Escanea para avanzar" : "Mantén + para llenar"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && caratula && detalles.length === 0 && !receptionComplete && (
          <div className="glass rounded-2xl p-12 border border-white/20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sin productos</h3>
            <p className="text-slate-500">No se encontraron detalles para este folio.</p>
          </div>
        )}

        {/* Incident FAB */}
        {caratula && !receptionComplete && (
          <button
            className="fixed bottom-24 right-8 w-14 h-14 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 z-40"
            onClick={() => {
              if (!caratula) {
                alert("Primero debes cargar un folio de recepción")
                return
              }
              // Open incident modal logic would go here
            }}
          >
            <AlertTriangle className="w-6 h-6 text-white" />
            {incidents.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
                <span className="text-white text-xs font-bold">{incidents.length}</span>
              </div>
            )}
          </button>
        )}

        {caratula && !receptionComplete && (
          <div className="sticky bottom-8 mt-8">
            <button
              className={`w-full btn-premium py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-2xl ${
                listo
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
              onClick={handleRecepcionar}
              disabled={!caratula?.DOCTO_CM_ID || !listo || loading}
            >
              <div className="flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando recepción...
                  </>
                ) : listo ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Aplicar Recepción
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Complete todos los productos
                  </>
                )}
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
