// lib/company-context.tsx
"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

interface Branding {
  logo: string | null
  background: string | null
  fechaModificacion?: string
}

interface CompanyData {
  id: number
  codigo: string
  nombre: string
  apiUrl: string
  branding?: Branding | null
}

interface CompanyContextType {
  companyData: CompanyData | null
  setCompanyData: (d: CompanyData | null) => void
  apiUrl: string | null
  isReady: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error("useCompany must be used within a CompanyProvider")
  return ctx
}

/* ---------------- utils LS/Cookies seguras ---------------- */
function safeGetLS(key: string) {
  try {
    if (typeof window === "undefined") return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetLS(key: string, value: string | null) {
  try {
    if (typeof window === "undefined") return
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null
  const raw = document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="))
    ?.split("=")[1]
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/* ---------------- Provider ---------------- */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyData, setCompanyDataState] = useState<CompanyData | null>(null)
  const [isReady, setIsReady] = useState(false)

  // evita fetchs duplicados de branding (StrictMode/dev)
  const brandingInFlight = useRef<boolean>(false)

  // Helper: guarda en estado + LS
  const setCompanyData = (d: CompanyData | null) => {
    setCompanyDataState(d)
    safeSetLS("companyData", d ? JSON.stringify(d) : null)
  }

  // Carga inicial: LS -> subdominio (/check-cliente) -> cookies
  useEffect(() => {
    let done = false
    ;(async () => {
      // 1) localStorage
      const ls = safeGetLS("companyData")
      if (ls) {
        try {
          const parsed = JSON.parse(ls) as CompanyData
          if (parsed && parsed.apiUrl && parsed.codigo) {
            setCompanyDataState(parsed) // incluye branding si ya estaba en LS
            done = true
          }
        } catch {}
      }

      // 2) subdominio → check-cliente (SOLO si no teníamos nada)
      if (!done && typeof window !== "undefined") {
        const host = window.location.hostname
        const parts = host.split(".")
        const sub = parts.length >= 3 ? (parts[0] || "").toLowerCase() : null

        if (sub && !["www", "app"].includes(sub)) {
          try {
            const res = await fetch("https://picking-backend.onrender.com/check-cliente", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ empresa: sub }),
              cache: "no-store",
            })
            const data = await res.json()
            if (data?.ok && data?.cliente) {
              // OJO: el backend ya devuelve { id, codigo, nombre, apiUrl }
              const c: CompanyData = { ...data.cliente, branding: null }
              setCompanyDataState(c)
              safeSetLS("companyData", JSON.stringify(c))
              done = true
            }
          } catch {}
        }
      }

      // 3) cookie de respaldo
      if (!done) {
        const codigo = readCookie("tenant")
        const apiUrl = readCookie("apiUrl")
        if (codigo && apiUrl) {
          const fallback: CompanyData = { id: 0, codigo, nombre: codigo, apiUrl, branding: null }
          setCompanyDataState(fallback)
          safeSetLS("companyData", JSON.stringify(fallback))
        }
      }

      setIsReady(true)
    })()
  }, [])

  // Efecto: cuando tengamos apiUrl+codigo y NO haya branding cargado, tráelo con tu endpoint existente:
  useEffect(() => {
    // requisitos mínimos
    if (!isReady) return
    if (!companyData?.apiUrl || !companyData?.codigo) return
    // si ya hay branding, no vuelvas a pedir
    if (companyData.branding && (companyData.branding.logo !== undefined || companyData.branding.background !== undefined)) {
      return
    }
    // evita requests duplicados
    if (brandingInFlight.current) return

    const controller = new AbortController()
    const loadBranding = async () => {
      try {
        brandingInFlight.current = true
        const url = `${companyData.apiUrl}/get-branding/${companyData.codigo}?_=${Date.now()}`
        const res = await fetch(url, { cache: "no-store", signal: controller.signal })
        const json = await res.json().catch(() => ({} as any))
        const branding: Branding | null = json?.branding || null

        // actualiza companyData con el branding
        const updated: CompanyData = { ...companyData, branding }
        setCompanyData(updated) // esto persiste en LS
      } catch (e) {
        if (!controller.signal.aborted) {
          // si falla, al menos deja branding en null para no entrar en bucle
          const updated: CompanyData = { ...companyData, branding: null }
          setCompanyData(updated)
          // opcional: console.warn("[company-context] branding fetch failed:", e)
        }
      } finally {
        brandingInFlight.current = false
      }
    }

    loadBranding()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, companyData?.apiUrl, companyData?.codigo]) // dependemos de apiUrl/codigo

  return (
    <CompanyContext.Provider
      value={{
        companyData,
        setCompanyData,
        apiUrl: companyData?.apiUrl ?? null,
        isReady,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
