"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface CompanyData {
  id: number
  codigo: string
  nombre: string
  apiUrl: string
  branding?: any
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

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyData, setCompanyDataState] = useState<CompanyData | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let done = false
    ;(async () => {
      // 1) localStorage
      const ls = safeGetLS("companyData")
      if (ls) {
        try {
          const parsed = JSON.parse(ls) as CompanyData
          if (parsed && parsed.apiUrl && parsed.codigo) {
            setCompanyDataState(parsed)
            done = true
          }
        } catch {}
      }

      // 2) subdominio → check-cliente
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
              setCompanyDataState(data.cliente)
              safeSetLS("companyData", JSON.stringify(data.cliente))
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
          const fallback: CompanyData = { id: 0, codigo, nombre: codigo, apiUrl }
          setCompanyDataState(fallback)
          safeSetLS("companyData", JSON.stringify(fallback))
        }
      }

      setIsReady(true)
    })()
  }, [])

  const setCompanyData = (d: CompanyData | null) => {
    setCompanyDataState(d)
    safeSetLS("companyData", d ? JSON.stringify(d) : null)
  }

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
