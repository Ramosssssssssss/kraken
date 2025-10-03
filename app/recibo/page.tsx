"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { useCompany } from "@/lib/company-context"
import { useRouter } from "next/navigation"
import {
  Scan,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
  Package,
  Search,
  BarChart3,
  CheckCircle2,
  Loader2,
  Target,
  List,
  Clock,
  CloudLightning as Lightning,
  Trophy,
  X,
  XCircle,
} from "lucide-react"
import IncidentManager from "./incidentManager"
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

type IncidentType = "extra" | "changed" | "missing" | "return"

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

interface Toast {
  id: string
  type: "error" | "success"
  message: string
  autoClose?: boolean
}

interface CompletionModal {
  show: boolean
  title: string
  message: string
  icon: any
  color: string
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

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [scannedProducts, setScannedProducts] = useState<{ [key: string]: number }>({})
  const flashIndex = useRef<number | null>(null)
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    product: Detalle
    timestamp: Date
  } | null>(null)
  const [receptionComplete, setReceptionComplete] = useState(false)
  const [showMissingModal, setShowMissingModal] = useState(false)

  const [showIncidentManager, setShowIncidentManager] = useState(false)

  const [timerStarted, setTimerStarted] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finalTime, setFinalTime] = useState<number | null>(null)

  const [toasts, setToasts] = useState<Toast[]>([])
  const [completionModal, setCompletionModal] = useState<CompletionModal>({
    show: false,
    title: "",
    message: "",
    icon: CheckCircle,
    color: "",
  })

  const showToast = useCallback((message: string, type: "error" | "success" = "error", autoClose = true) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message, autoClose }])

    if (autoClose) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 1000)
    }
  }, [])

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const focusScanner = useCallback(() => {
    requestAnimationFrame(() => {
      if (scannerRef.current && document.activeElement !== folioRef.current) {
        scannerRef.current.focus()
      }
    })
  }, [])

  useEffect(() => {
    focusScanner()

    // Global event listeners for aggressive focus management
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target !== folioRef.current && !target.closest('input[type="text"]')) {
        setTimeout(focusScanner, 50)
      }
    }

    const handleScroll = () => {
      setTimeout(focusScanner, 100)
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(focusScanner, 100)
      }
    }

    const handleFocusOut = () => {
      if (document.activeElement !== folioRef.current) {
        setTimeout(focusScanner, 50)
      }
    }

    document.addEventListener("click", handleClick)
    document.addEventListener("scroll", handleScroll, true)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    document.addEventListener("focusout", handleFocusOut)

    return () => {
      document.removeEventListener("click", handleClick)
      document.removeEventListener("scroll", handleScroll, true)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("focusout", handleFocusOut)
    }
  }, [focusScanner])

  useEffect(() => {
    if (!timerStarted || !startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [timerStarted, startTime])

  useEffect(() => {
    const totalScanned = Object.values(scannedProducts).reduce((sum, val) => sum + val, 0)

    if (totalScanned > 0 && !timerStarted && detalles.length > 0) {
      setTimerStarted(true)
      setStartTime(Date.now())
    }
  }, [scannedProducts, timerStarted, detalles.length])

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

  const normalizeDetalle = (rows: any[]): Detalle[] => {
    const normalized = (rows || []).map((r, idx) => {
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

    const grouped: Detalle[] = []
    normalized.forEach((product) => {
      const existing = grouped.find((p) => p.CLAVE_ARTICULO === product.CLAVE_ARTICULO)
      if (existing) {
        // Sum quantities for duplicate products
        existing.UNIDADES = (existing.UNIDADES || 0) + (product.UNIDADES || 0)
        existing.CANTIDAD_REQUERIDA = (existing.CANTIDAD_REQUERIDA || 0) + (product.CANTIDAD_REQUERIDA || 0)
      } else {
        grouped.push({ ...product })
      }
    })

    return grouped.map((item, idx) => ({
      ...item,
      _key: `det-${idx}`,
    }))
  }

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
      showToast("Ingresa un folio (ej. A-1234)")
      return
    }

    const normalizedFolio = normalizeFolio(fol)
    setLoading(true)
    setCaratula(null)
    setDetalles([])
    setReceptionComplete(false)
    setTimerStarted(false)
    setStartTime(null)
    setElapsedSeconds(0)
    setFinalTime(null)
    setScannedProducts({})
    try {
      try {
        await fetchOrdenCombinada(normalizedFolio)
      } catch {
        await fetchOrdenPorPartes(normalizedFolio)
      }
      setScannerActive(true)
      focusScanner()
    } catch (err: any) {
      showToast(err?.message || "No se pudo cargar la orden")
    } finally {
      setLoading(false)
    }
  }, [folio, fetchOrdenCombinada, fetchOrdenPorPartes, focusScanner, showToast])

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
    setTimeout(focusScanner, 50)
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
    setTimeout(focusScanner, 50)
  }

  const fillToRequired = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.UNIDADES ?? 0
      next[idx] = { ...d, packed: req, scanned: requireScan ? (d.scanned ?? 0) : req }
      return next
    })
    setTimeout(focusScanner, 50)
  }

  const playSound = useCallback(async (type: "success" | "ERROR" | "LISTO") => {
    try {
      const audio = new Audio(`/sounds/${type}.wav`)
      audio.volume = 0.5
      await audio.play()
    } catch (error) {
      console.log(`[v0] Could not play sound: ${type}`, error)
    }
  }, [])

  const processScan = useCallback(
    async (scannedCode: string) => {
      if (!scannedCode.trim() || !detalles.length) return

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
          setLastScannedProduct({
            product: newDetalles[foundIndex],
            timestamp: new Date(),
          })

          playSound("LISTO")

          // Check if everything is complete and play success sound
          const allComplete = newDetalles.every((d) => {
            const required = d.UNIDADES ?? 0
            const scanned = requireScan ? (d.scanned ?? 0) : (d.packed ?? 0)
            return scanned >= required
          })

          if (allComplete && newDetalles.length > 0) {
            setTimeout(() => playSound("success"), 500)
          }
        } else {
          showToast(
            `Este escaneo agregaría ${multiplier} unidades, pero solo se necesitan ${required - currentScanned} más`,
            "error",
            true,
          )
          playSound("ERROR")
        }
      } else {
        showToast(`El código "${scannedCode}" no se encontró en este recibo`, "error", true)
        playSound("ERROR")
      }

      setScanValue("")
    },
    [detalles, scannedProducts, requireScan, codigosInnerMap, playSound, showToast],
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getPerformanceMessage = (seconds: number, itemCount: number) => {
    const secondsPerItem = itemCount > 0 ? seconds / itemCount : Number.POSITIVE_INFINITY

    if (secondsPerItem < 3) {
      return {
        title: "¡Velocidad Increíble!",
        message: `Completaste ${itemCount} productos en ${formatTime(seconds)}. ¡Eres un profesional!`,
        icon: Lightning,
        color: "from-yellow-500 to-orange-500",
      }
    } else if (secondsPerItem < 6) {
      return {
        title: "¡Excelente Trabajo!",
        message: `Tiempo total: ${formatTime(seconds)} para ${itemCount} productos. ¡Muy eficiente!`,
        icon: Trophy,
        color: "from-green-500 to-emerald-500",
      }
    } else if (secondsPerItem < 10) {
      return {
        title: "¡Buen Ritmo!",
        message: `Completaste la recepción en ${formatTime(seconds)}. ¡Sigue así!`,
        icon: CheckCircle2,
        color: "from-blue-500 to-indigo-500",
      }
    } else {
      return {
        title: "¡Recepción Completada!",
        message: `Tiempo total: ${formatTime(seconds)}. La precisión es más importante que la velocidad.`,
        icon: CheckCircle,
        color: "from-slate-500 to-slate-600",
      }
    }
  }

  const handleRecepcionar = async () => {
    if (!caratula?.DOCTO_CM_ID) {
      showToast("No hay documento para recepcionar")
      return
    }

    const MAX_RETRIES = 3
    let intentos = 0

    try {
      setLoading(true)

      await updateQuantitiesForIncidents()

      const returnIncidents = incidents.filter((inc) => inc.type === "return")

      if (returnIncidents.length > 0) {
        console.log("[v0] Processing return incidents:", returnIncidents)

        for (const incident of returnIncidents) {
          try {
            // Get ARTICULO_ID for the product
            const articuloResponse = await fetch(`${baseURL}/recibo/obtener-articulo-id`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ claveArticulo: incident.productKey }),
            })

            const articuloData = await articuloResponse.json()

            if (!articuloData.ok || !articuloData.articuloId) {
              throw new Error(`No se pudo obtener ARTICULO_ID para ${incident.productKey}`)
            }

            console.log("[v0] Got ARTICULO_ID:", articuloData.articuloId, "for", incident.productKey)

            // Insert into ART_ADEV_TEMP
            const insertResponse = await fetch(`${baseURL}/recibo/dev/add-temp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                doctoCmId: caratula.DOCTO_CM_ID,
                articuloId: articuloData.articuloId,
                claveArticulo: incident.productKey,
                unidadesDev: incident.quantity,
              }),
            })

            const insertData = await insertResponse.json()

            if (!insertData.ok) {
              throw new Error(`Error al insertar artículo a devolver: ${incident.productKey}`)
            }

            console.log("[v0] Inserted return item into temp table:", incident.productKey, incident.quantity)
          } catch (error) {
            console.error("[v0] Error processing return incident:", error)
            // Rollback temp table on error
            await fetch(`${baseURL}/recibo/dev/rollback?doctoCmId=${caratula.DOCTO_CM_ID}`, {
              method: "DELETE",
            })
            throw error
          }
        }

        showToast(`Preparando devolución de ${returnIncidents.length} artículo(s)...`, "success", false)
      }

      while (intentos < MAX_RETRIES) {
        try {
          const url = `${baseURL}/recibo/recepcion?doctoId=${caratula.DOCTO_CM_ID}`
          const response = await fetch(url)
          const data = await response.json()

          if (data.ok) {
            console.log("[v0] Reception completed successfully")

            if (returnIncidents.length > 0) {
              console.log("[v0] Executing automatic return...")

              try {
                const devolucionUrl = `${baseURL}/recibo/devolucion?doctoCmId=${caratula.DOCTO_CM_ID}`
                const devolucionResponse = await fetch(devolucionUrl)
                const devolucionData = await devolucionResponse.json()

                if (!devolucionData.ok) {
                  throw new Error(devolucionData.error || "Error en la devolución automática")
                }

                console.log("[v0] Automatic return completed:", devolucionData.respuesta)
                showToast(`Devolución completada: ${returnIncidents.length} artículo(s) devuelto(s)`, "success", false)
              } catch (devError) {
                console.error("[v0] Error in automatic return:", devError)
                showToast("La recepción se completó pero hubo un error en la devolución automática", "error", false)
              }
            }

            setTimerStarted(false)
            setFinalTime(elapsedSeconds)

            setReceptionComplete(true)
            playSound("success")

            const performance = getPerformanceMessage(elapsedSeconds, totalLineas)

            let modalMessage = performance.message
            if (incidents.length > 0) {
              const incidentSummary = incidents
                .map(
                  (inc) =>
                    `${
                      inc.type === "missing"
                        ? "De menos"
                        : inc.type === "extra"
                          ? "De más"
                          : inc.type === "return"
                            ? "Devolución"
                            : "Cambiado"
                    }: ${inc.notes || inc.productName}${inc.quantity ? ` (${inc.quantity})` : ""}`,
                )
                .join("\n")
              modalMessage += `\n\nIncidencias:\n${incidentSummary}`
            }

            setCompletionModal({
              show: true,
              title: performance.title,
              message: modalMessage,
              icon: performance.icon,
              color: performance.color,
            })
            return
          } else {
            throw new Error(data.error || "Error en la recepción")
          }
        } catch (err) {
          intentos++
          if (intentos >= MAX_RETRIES) {
            if (returnIncidents.length > 0) {
              await fetch(`${baseURL}/recibo/dev/rollback?doctoCmId=${caratula.DOCTO_CM_ID}`, {
                method: "DELETE",
              })
            }
            showToast("No se pudo completar la recepción después de varios intentos.")
            return
          }
          await new Promise((res) => setTimeout(res, 1000 * intentos))
        }
      }
    } catch (error) {
      console.error("[v0] Error in handleRecepcionar:", error)
      showToast("Error al procesar la recepción: " + String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleFolioFocus = () => {
    // Folio input is focused, scanner focus will be managed by global handlers
  }

  const handleFolioBlur = () => {
    setTimeout(focusScanner, 100)
  }

  const missingItems = detalles.filter((item) => {
    const required = item.UNIDADES ?? 0
    const scanned = requireScan ? (item.scanned ?? 0) : (item.packed ?? 0)
    const missingIncident = incidents.find((inc) => inc.type === "missing" && inc.productKey === item.CLAVE_ARTICULO)

    if (missingIncident) {
      return scanned < missingIncident.quantity
    }

    return scanned < required
  })

  const handleNewReceipt = () => {
    setFolio("")
    setCaratula(null)
    setDetalles([])
    setIncidents([])
    setScannedProducts({})
    setLastScannedProduct(null)
    setReceptionComplete(false)
    setTimerStarted(false)
    setStartTime(null)
    setElapsedSeconds(0)
    setFinalTime(null)
    setTimeout(focusScanner, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans overflow-x-hidden">
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass rounded-xl p-4 border shadow-lg animate-slide-in-right flex items-center gap-3 min-w-[320px] ${
              toast.type === "error" ? "border-red-200/50 bg-red-50/90" : "border-green-200/50 bg-green-50/90"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                toast.type === "error" ? "bg-red-500" : "bg-green-500"
              }`}
            >
              {toast.type === "error" ? (
                <XCircle className="w-5 h-5 text-white" />
              ) : (
                <CheckCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <p className={`flex-1 text-sm font-medium ${toast.type === "error" ? "text-red-900" : "text-green-900"}`}>
              {toast.message}
            </p>
            {!toast.autoClose && (
              <button
                onClick={() => closeToast(toast.id)}
                className="w-6 h-6 rounded-lg hover:bg-white/50 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
        ))}
      </div>
      {/* TIEMPO Modal  */}
      {completionModal.show && (
        <div className="fixed  inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-3xl bg-white/80 p-8 max-w-lg w-full border border-white/20 shadow-2xl animate-scale-in">
            <div className="text-center">
              <div
                className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${completionModal.color} flex items-center justify-center shadow-lg`}
              >
                <completionModal.icon className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-4">{completionModal.title}</h2>

              <p className="text-slate-700 text-lg leading-relaxed mb-8 whitespace-pre-line">
                {completionModal.message}
              </p>

              <button
                onClick={() => {
                  setCompletionModal({ ...completionModal, show: false })
                  setTimeout(focusScanner, 100)
                }}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r ${completionModal.color} hover:shadow-xl transition-all duration-200 shadow-lg`}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <div className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm hover:bg-white/90 transition-all duration-200"
                onClick={() => {
                  router.replace("/RECIBO/home")
                  setTimeout(focusScanner, 100)
                }}
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Recepción de Mercancía</h1>
                  <p className="text-md text-slate-500">Gestión de Entradas y Salidas</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 ">
              {missingItems.length > 0 && (
                <button
                  onClick={() => setShowMissingModal(true)}
                  className="text-md bg-orange-100 text-orange-700 px-2 py-1 rounded-md hover:bg-orange-200 transition-colors"
                >
                  Ver Faltantes ({missingItems.length})
                </button>
              )}
              {timerStarted && !receptionComplete && (
                <div className="glass rounded-xl px-8 py-4 border border-white/20 flex items-center gap-2 animate-fade-in ">
                  <Clock className="w-8 h-8 text-slate-600" />
                  <div className="text-right">
                    <div className="text-md text-slate-500 leading-none mb-0.5">Tiempo</div>
                    <div className="text-xl font-bold text-slate-900 leading-none tabular-nums">
                      {formatTime(elapsedSeconds)}
                    </div>
                  </div>
                </div>
              )}

              <button
                className={`w-10 h-10 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                  requireScan
                    ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                    : "bg-white/80 border-white/20 text-slate-600 hover:bg-white/90"
                }`}
                onClick={() => {
                  setRequireScan(!requireScan)
                  setTimeout(focusScanner, 50)
                }}
              >
                <Scan className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content - 75% */}
        <div className="flex-1 w-3/4 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Search Section */}
            <div className="glass rounded-2xl p-6 mb-8 border border-white/20">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={folioRef}
                    value={folio}
                    onChange={(e) => setFolio(e.target.value)}
                    onFocus={handleFolioFocus}
                    onBlur={handleFolioBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        buscar()
                      }
                    }}
                    placeholder="Buscar por folio (ej. A-1234)..."
                    className="w-full pl-12 pr-4 py-3 bg-white/60 border border-white/30 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 transition-all duration-200"
                    disabled={loading}
                  />
                </div>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-700 hover:to-slate-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    buscar()
                    setTimeout(focusScanner, 100)
                  }}
                  disabled={loading}
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

            {/* Hidden Scanner Input - positioned off-screen but accessible */}
            <input
              ref={scannerRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  processScan(scanValue)
                  setScanValue("")
                }
              }}
              onBlur={() => {
                // Aggressive refocus unless folio is focused
                if (document.activeElement !== folioRef.current) {
                  setTimeout(focusScanner, 10)
                }
              }}
              placeholder="Scanner input - always focused"
              className="fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none"
              autoComplete="off"
              tabIndex={-1}
            />

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin border-t-slate-600"></div>
                  <Package className="w-6 h-6 text-slate-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-slate-600 font-medium">Cargando orden de compra...</p>
                <p className="text-sm text-slate-500">Esto puede tomar unos segundos</p>
              </div>
            )}

            {/* Reception Complete State */}
            {receptionComplete && (
              <div className="glass rounded-2xl p-8 mb-8 border border-green-200/50 bg-gradient-to-br from-green-50/80 to-emerald-50/80">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-900 mb-2">¡Recepción Completada!</h2>
                  <p className="text-green-700 mb-6">La orden {caratula?.FOLIO} ha sido procesada exitosamente</p>
                  <button
                    onClick={handleNewReceipt}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 shadow-lg"
                  >
                    Procesar Nuevo Recibo
                  </button>
                </div>
              </div>
            )}

            {/* Order Header */}

            {/* Incidents Indicator */}
            {incidents.length > 0 && !receptionComplete && (
              <div className="flex items-center bg-orange-50/80 backdrop-blur-sm mx-0 mb-6 px-4 py-3 rounded-xl border border-orange-200/50 gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <p className="text-sm font-semibold text-orange-700">
                  {incidents.length} incidencia{incidents.length !== 1 ? "s" : ""} reportada
                  {incidents.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Progress Bar */}

            {/* Products List */}
            {detalles.length > 0 && !receptionComplete && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Productos</h3>
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
                      className={`glass rounded-xl p-4 border transition-all duration-300 ${
                        okLinea
                          ? "border-green-200/50 bg-gradient-to-r from-green-50/80 to-emerald-50/80"
                          : "border-white/20 bg-white/40"
                      } ${isFlash ? "ring-2 ring-blue-400 bg-blue-50/80" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={`font-bold text-sm ${okLinea ? "text-green-900" : "text-slate-900"}`}>
                              {item.CLAVE_ARTICULO || "—"}
                            </h4>
                            {okLinea && (
                              <div className="flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-md">
                                <CheckCircle className="w-3 h-3" />
                                Completo
                              </div>
                            )}
                          </div>

                          {item.NOMBRE && <p className="text-slate-700 text-sm mb-2 leading-relaxed">{item.NOMBRE}</p>}

                          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
                            {item.UMED && <span>UM: {item.UMED}</span>}
                            {item.CODIGO_BARRAS && <span>CB: {item.CODIGO_BARRAS}</span>}
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500">Requerido:</span>
                              <span className="font-bold text-slate-900 ml-1">{req}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Empacado:</span>
                              <span className="font-bold text-slate-900 ml-1">{pk}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Escaneado:</span>
                              <span className={`font-bold ml-1 ${okLinea ? "text-green-700" : "text-slate-900"}`}>
                                {sc}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 ml-6">
                          <div className="flex items-center gap-2">
                            <button
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                requireScan
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
                              }`}
                              onClick={() => {
                                if (!requireScan) {
                                  dec(index)
                                }
                              }}
                              disabled={requireScan}
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="font-bold text-lg text-slate-900 min-w-8 text-center">{pk}</span>

                            <button
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                requireScan
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
                              }`}
                              onClick={() => {
                                if (!requireScan) {
                                  inc(index)
                                }
                              }}
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
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <p
                            className={`text-xs text-center leading-tight ${
                              requireScan ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {requireScan ? "Escanea para avanzar" : "Mantén + para llenar"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && caratula && detalles.length === 0 && !receptionComplete && (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Sin productos</h3>
                <p className="text-slate-500">No se encontraron detalles para este folio.</p>
              </div>
            )}

            {/* Action Button */}
            {caratula && !receptionComplete && (
              <div className="sticky bottom-6 mt-8">
                <button
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                    listo
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      : "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (listo) {
                      handleRecepcionar()
                    }
                  }}
                  disabled={!listo || loading}
                >
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
                      Completa el escaneo para continuar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - 25% */}
        {!receptionComplete && (
          <div className="w-1/4 border-l border-white/20 bg-gradient-to-b from-slate-50/80 to-white/80 backdrop-blur-sm">
            <div className="p-6 h-full flex flex-col">
              {/* Sidebar Header */}

              {/* Overall Progress */}
              {detalles.length > 0 && (
                <div className="glass rounded-xl p-4 mb-6 border border-white/20">
                  <div className="text-center mb-4">
                    <div className="text-6xl font-bold text-slate-900 mb-2">{Math.round(progreso * 100)}%</div>
                    <p className="text-sm font-medium text-slate-600">Progreso Total</p>
                  </div>

                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                        listo
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : "bg-gradient-to-r from-blue-500 to-indigo-600"
                      }`}
                      style={{ width: `${progreso * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{totalHechas} completadas</span>
                    <span>{totalRequeridas} total</span>
                  </div>
                </div>
              )}

              {/* Last Scanned Product */}
              {lastScannedProduct && (
                <div className="glass rounded-xl p-4 mb-6 border border-green-200/50 bg-gradient-to-br from-green-50/80 to-emerald-50/80 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                      <Target className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-green-900 text-sm">Último Escaneado</h4>
                  </div>

                  {/* Product Image - Cinta de Aislar */}
                  <div className="relative mb-4">
                    <img
                      src="/cinta-de-aislar-negra-industrial.jpg"
                      alt="Cinta de aislar"
                      className="w-full h-24 object-cover rounded-lg border border-green-200"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-md font-bold">
                      ✓ ESCANEADO
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Clave</p>
                      <p className="font-bold text-green-900 text-sm">{lastScannedProduct.product.CLAVE_ARTICULO}</p>
                    </div>

                    {lastScannedProduct.product.NOMBRE && (
                      <div>
                        <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Producto</p>
                        <p className="text-green-800 text-xs leading-tight">{lastScannedProduct.product.NOMBRE}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-white/60 rounded-lg p-2 border border-green-200/50">
                        <p className="text-xs font-medium text-green-700">Escaneado</p>
                        <p className="text-lg font-bold text-green-900">{lastScannedProduct.product.scanned}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 border border-green-200/50">
                        <p className="text-xs font-medium text-green-700">Requerido</p>
                        <p className="text-lg font-bold text-green-900">{lastScannedProduct.product.UNIDADES}</p>
                      </div>
                    </div>

                    {/* Individual Progress */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-green-700">Completado</span>
                        <span className="text-sm font-bold text-green-900">
                          {Math.round(
                            ((lastScannedProduct.product.scanned || 0) / (lastScannedProduct.product.UNIDADES || 1)) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, ((lastScannedProduct.product.scanned || 0) / (lastScannedProduct.product.UNIDADES || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-green-200/50">
                      <p className="text-xs text-green-600">
                        Escaneado hace {Math.floor((Date.now() - lastScannedProduct.timestamp.getTime()) / 1000)}s
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {caratula && !receptionComplete && (
                <div className="glass rounded-2xl p-6 mb-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-1">Orden: {caratula.FOLIO || "—"}</h2>
                      <p className="text-slate-600">
                        {caratula.PROVEEDOR && `Proveedor: ${caratula.PROVEEDOR}`}
                        {caratula.ALMACEN && ` • Almacén: ${caratula.ALMACEN}`}
                      </p>
                    </div>
                    <button
                      onClick={onRefresh}
                      disabled={refreshing}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-all duration-200"
                    >
                      <BarChart3 className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Missing Items Modal */}
      {showMissingModal && (
        <div className="fixed inset-0  z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <List className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 text-white">Artículos Faltantes</h3>
                  <p className="text-sm text-slate-600 text-white">{missingItems.length} productos pendientes</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMissingModal(false)
                  setTimeout(focusScanner, 100)
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="space-y-3">
              {missingItems.map((item, index) => {
                const required = item.UNIDADES ?? 0
                const scanned = requireScan ? (item.scanned ?? 0) : (item.packed ?? 0)
                const missing = required - scanned

                return (
                  <div
                    key={item._key || `missing-${index}`}
                    className="glass rounded-lg p-4 border border-orange-200/50 bg-orange-50/50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{item.CLAVE_ARTICULO}</h4>
                        {item.NOMBRE && <p className="text-sm text-slate-600 mb-2">{item.NOMBRE}</p>}
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>Requerido: {required}</span>
                          <span>Escaneado: {scanned}</span>
                          <span className="text-orange-600 font-medium">Faltan: {missing}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-600">{missing}</div>
                        <div className="text-xs text-slate-500">faltantes</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowMissingModal(false)
                  setTimeout(focusScanner, 100)
                }}
                className="w-full py-3 bg-slate-600 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident FAB */}
      {caratula && !receptionComplete && (
        <button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-700 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 z-40"
          onClick={() => {
            if (!caratula) {
              showToast("Primero debes cargar un folio de recepción")
              return
            }
            setShowIncidentManager(true)
          }}
        >
          <AlertTriangle className="w-7 h-7 text-white" />
          {incidents.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-600 rounded-full min-w-6 h-6 flex items-center justify-center border-2 border-white">
              <span className="text-white text-xs font-bold">{incidents.length}</span>
            </div>
          )}
        </button>
      )}

      {showIncidentManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <button
            onClick={() => {
              setShowIncidentManager(false)
              setTimeout(focusScanner, 100)
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all z-10"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>

          <IncidentManager
            incidents={incidents}
            setIncidents={setIncidents}
            detalles={detalles}
            setDetalles={setDetalles}
            setScannedProducts={setScannedProducts}
            caratula={caratula}
            autoOpen={true}
            onClose={() => {
              setShowIncidentManager(false)
              setTimeout(focusScanner, 100)
            }}
          />
        </div>
      )}
    </div>
  )
}
