// app/etiquetador_hub/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Package, Tags, DollarSign, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const tiles = [
  { id: "etiquetador", href: "/etiquetador", title: "Generador de Etiquetas", desc: "Crear y gestionar etiquetas estándar con código de barras y QR.", icon: Tags },
  { id: "etiquetador_precios", href: "/etiquetador_precios", title: "Etiquetador de Precios", desc: "Etiquetas enfocadas en punto de Venta.", icon: DollarSign },
  { id: "etiquetador_paquetes", href: "/etiquetador_paquetes", title: "Etiquetador de Paquetes", desc: "Imprime una etiqueta por paquete con código de barras del folio.", icon: Package },
] as const;

type TabId = typeof tiles[number]["id"];

/**
 * Envoltura de página: agrega Suspense required por Next para useSearchParams
 */
export default function EtiquetadorHubPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white/80">Cargando…</div>}>
      <EtiquetadorHubInner />
    </Suspense>
  );
}

/**
 * Componente interno: aquí sí usamos useSearchParams
 */
function EtiquetadorHubInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // Lee ?tab=; por defecto el primero
  const initialTab = (sp.get("tab") as TabId) || tiles[0].id;
  const [active, setActive] = useState<TabId>(initialTab);

  // Mantén la URL sincronizada (sin recargar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== active) {
      params.set("tab", active);
      router.replace(`?${params.toString()}`);
    }
  }, [active, router]);

  // Atajos 1/2/3
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") setActive(tiles[0].id);
      if (e.key === "2") setActive(tiles[1].id);
      if (e.key === "3") setActive(tiles[2].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeTile = useMemo(() => tiles.find((t) => t.id === active), [active]);
  const src = useMemo(() => activeTile?.href ?? tiles[0].href, [activeTile]);

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-white">
      {/* Header */}
      <section className="w-full max-w-6xl mx-auto px-6 pt-6">
        <header className="mb-4 text-center">
          <motion.h1
            className="text-3xl md:text-4xl font-bold"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {activeTile?.title ?? "Centro de Etiquetado"}
          </motion.h1>
          {activeTile?.desc && (
            <p className="text-gray-300 mt-1">{activeTile.desc}</p>
          )}
        </header>
      </section>

      {/* Contenido (Tabs + iframe) */}
      <section className="w-full max-w-[100%] mx-auto px-6 pb-4 flex-1 flex min-h-0">
        <Tabs
          value={active}
          onValueChange={(v) => setActive(v as TabId)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <TabsList className="w-full bg-transparent flex items-center justify-between">
            {/* Botón Volver a la izquierda */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-purple-300 hover:text-purple-200 px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>

            {/* Accesos (tabs) a la derecha */}
            <div className="flex space-x-2">
              {tiles.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex-none w-auto px-4 text-white data-[state=active]:bg-purple-600"
                >
                  {t.title}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          {tiles.map((t) => (
            <TabsContent
              key={t.id}
              value={t.id}
              className="mt-3 flex-1 min-h-0 flex flex-col"
            >
              <div className="flex-1 min-h-0 rounded-xl border border-gray-700 overflow-hidden">
                <iframe
                  // Para evitar mounts innecesarios en tabs inactivos
                  src={t.id === active ? src : "about:blank"}
                  title={t.title}
                  className="w-full h-full block"
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </main>
  );
}
