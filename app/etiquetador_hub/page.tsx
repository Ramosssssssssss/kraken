// app/etiquetador_hub/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Tags, DollarSign, ArrowRight } from "lucide-react";

// Si usas shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tiles = [
  {
    href: "/etiquetador",
    title: "Generador de Etiquetas",
    desc: "Crear y gestionar etiquetas estándar con código de barras y QR.",
    icon: Tags,
  },
  {
    href: "/etiquetador_precios",
    title: "Etiquetador de Precios",
    desc: "Etiquetas enfocadas en precio, promos y códigos.",
    icon: DollarSign,
  },
  {
    href: "/etiquetador_paquetes",
    title: "Etiquetador de Paquetes",
    desc: "Arma etiquetas para tus envíos.",
    icon: Package,
  },
] as const;

export default function EtiquetadorHub() {
  const router = useRouter();

  // Atajos de teclado: 1,2,3 para entrar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") router.push(tiles[0].href);
      if (e.key === "2") router.push(tiles[1].href);
      if (e.key === "3") router.push(tiles[2].href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-white">
      <section className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-10 text-center">
          <motion.h1
            className="text-3xl md:text-4xl font-bold"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            Centro de Etiquetado
          </motion.h1>
          
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <Card className="bg-gray-800/70 border-gray-700 h-full hover:bg-gray-800 hover:border-purple-500/60 transition-colors">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/20">
                      <Icon className="w-5 h-5 text-purple-300" />
                    </div>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-between h-full">
                    <p className="text-gray-300 mb-4">{t.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        Ir a <code className="text-gray-300">{t.href}</code>
                      </span>
                      <Button asChild className="bg-purple-600 hover:bg-purple-700">
                        <Link href={t.href} className="flex items-center gap-2">
                          Entrar <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
