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

interface UserData {
  id?: number
  user: string
  password: string
  nombre?: string
  email?: string
  MODULOS_KRKN?: string | number[] | null
  modulosKrknArr?: number[]
  [key: string]: any
}

interface CompanyContextType {
  companyData: CompanyData | null
  setCompanyData: (d: CompanyData | null) => void
  userData: UserData | null
  setUserData: (u: UserData | null) => void
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
  const [userData, setUserDataState] = useState<UserData | null>(null)
  const [isReady, setIsReady] = useState(false)

  const brandingInFlight = useRef<boolean>(false)

  const setCompanyData = (d: CompanyData | null) => {
    setCompanyDataState(d)
    safeSetLS("companyData", d ? JSON.stringify(d) : null)
  }

  const setUserData = (u: UserData | null) => {
    setUserDataState(u)
    safeSetLS("userData", u ? JSON.stringify(u) : null)
  }

  useEffect(() => {
    let done = false
    ;(async () => {
      const userLS = safeGetLS("userData")
      if (userLS) {
        try {
          const parsedUser = JSON.parse(userLS) as UserData
          if (parsedUser && parsedUser.user) {
            setUserDataState(parsedUser)
          }
        } catch {}
      }

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
              const c: CompanyData = { ...data.cliente, branding: null }
              setCompanyDataState(c)
              safeSetLS("companyData", JSON.stringify(c))
              done = true
            }
          } catch {}
        }
      }

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

  useEffect(() => {
    if (!isReady) return
    if (!companyData?.apiUrl || !companyData?.codigo) return
    if (
      companyData.branding &&
      (companyData.branding.logo !== undefined || companyData.branding.background !== undefined)
    ) {
      return
    }
    if (brandingInFlight.current) return

    const controller = new AbortController()
    const loadBranding = async () => {
      try {
        brandingInFlight.current = true
        const url = `${companyData.apiUrl}/get-branding/${companyData.codigo}?_=${Date.now()}`
        const res = await fetch(url, { cache: "no-store", signal: controller.signal })
        const json = await res.json().catch(() => ({}) as any)

        if (json.ok && json.branding) {
          const updated: CompanyData = {
            ...companyData,
            branding: {
              logo: json.branding.logo || null,
              background: json.branding.background || null,
              fechaModificacion: json.branding.fechaModificacion,
            },
          }
          setCompanyData(updated)
        } else {
          const updated: CompanyData = { ...companyData, branding: null }
          setCompanyData(updated)
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          const updated: CompanyData = { ...companyData, branding: null }
          setCompanyData(updated)
        }
      } finally {
        brandingInFlight.current = false
      }
    }

    loadBranding()
    return () => controller.abort()
  }, [isReady, companyData])

  return (
    <CompanyContext.Provider
      value={{
        companyData,
        setCompanyData,
        userData,
        setUserData,
        apiUrl: companyData?.apiUrl ?? null,
        isReady,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
