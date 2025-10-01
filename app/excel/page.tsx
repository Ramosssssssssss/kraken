"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import ExcelReciboPremium from "@/components/excel-recibo-premium"

function ExcelReciboContent() {
  const searchParams = useSearchParams()
  const excelDataParam = searchParams.get("excelData")

  let excelData: any[] = []
  try {
    if (excelDataParam) {
      excelData = JSON.parse(decodeURIComponent(excelDataParam))
    }
  } catch (error) {
    console.error("[v0] Error parsing Excel data:", error)
  }

  return <ExcelReciboPremium excelData={excelData} />
}

export default function ExcelReciboPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-cyan-900 font-medium">Cargando datos del Excel...</p>
          </div>
        </div>
      }
    >
      <ExcelReciboContent />
    </Suspense>
  )
}
