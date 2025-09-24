"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ActualizacionesPage() {
    const updates = [
        {
            version: "1.2.0",
            app: "Generador de Etiquetas",
            date: "2025-09-20",
            notes: [
                "🆕 Se agregó soporte para códigos QR.",
                "⚡ Mejoras en impresión de etiquetas pequeñas.",
                "🐞 Correcciones de errores menores.",
            ],
        },
        {
            version: "1.1.3",
            app: "Generador de Etiquetas",
            date: "2025-09-22",
            notes: [
                "🖨️ Opción para elegir alto de barras.",
                "💾 Guardado de plantillas de etiquetas.",
                "🐞 Correcciones de errores menores.",
            ],
        },
        {
            version: "1.1.0",
            app: "Generador de Etiquetas",
            date: "2025-09-19",
            notes: ["🚀 Versión inicial del generador de etiquetas."],
        },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between text-white">
                    <h1 className="text-3xl font-bold">Historial de actualizaciones</h1>
                    <Link href="/" className="flex items-center gap-2 text-purple-300 hover:text-purple-200">
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Link>
                </div>

                {/* Lista de versiones */}
                {updates.map((u, idx) => (
                    <Card key={idx} className="bg-gray-800/80 border-gray-600 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-white">
                                <span>Versión {u.version} - {u.app}</span>
                                <span className="text-sm text-gray-400">{u.date}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-gray-200">
                            {u.notes.map((note, i) => (
                                <p key={i}>{note}</p>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
