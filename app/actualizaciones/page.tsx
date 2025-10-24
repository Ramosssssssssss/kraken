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
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between text-white mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Historial de actualizaciones
                        </h1>
                        <p className="text-gray-400 text-sm mt-2">Registro de cambios y mejoras del sistema</p>
                    </div>
                    <Link 
                        href="/etiquetador" 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white transition-all duration-200 shadow-lg shadow-purple-500/20"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Link>
                </div>

                {/* Lista de versiones */}
                {updates.map((u, idx) => (
                    <Card 
                        key={idx} 
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl hover:border-purple-500/30 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                        <CardHeader className="relative border-b border-white/5">
                            <CardTitle className="flex items-center justify-between text-white">
                                <span className="text-lg">
                                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-bold">
                                        Versión {u.version}
                                    </span>
                                    {" - "}
                                    <span className="text-gray-300">{u.app}</span>
                                </span>
                                <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                                    {u.date}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative space-y-3 text-gray-200 pt-6">
                            {u.notes.map((note, i) => (
                                <div 
                                    key={i} 
                                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <span className="text-2xl leading-none">{note.split(" ")[0]}</span>
                                    <p className="flex-1 pt-1">{note.substring(note.indexOf(" ") + 1)}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
