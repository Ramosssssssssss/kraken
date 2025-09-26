"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface CompanyData {
  id: number
  codigo: string
  nombre: string
  apiUrl: string
  branding?: any
}

interface CompanyContextType {
  companyData: CompanyData | null
  setCompanyData: (data: CompanyData | null) => void
  apiUrl: string | null
  isReady: boolean
}
export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  return (
    <CompanyContext.Provider
      value={{
        companyData,
        setCompanyData,
        apiUrl: companyData?.apiUrl || null,
        isReady,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}


