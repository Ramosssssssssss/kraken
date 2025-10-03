// app/etiquetador_hub/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Package, Tags, DollarSign, ArrowLeft, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const tiles = [
  { id: "etiquetador", href: "/etiquetador", title: "Generador de Etiquetas", desc: "Crear y gestionar etiquetas estándar con código de barras y QR.", icon: Tags },
  { id: "etiquetador_precios", href: "/etiquetador_precios", title: "Etiquetador de Precios", desc: "Etiquetas enfocadas en punto de Venta.", icon: DollarSign },
  { id: "etiquetador_paquetes", href: "/etiquetador_paquetes", title: "Etiquetador de Paquetes", desc: "Imprime una etiqueta por paquete con código de barras del folio.", icon: Package },
] as const;

type TabId = typeof tiles[number]["id"];

export default function EtiquetadorHubPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white/80">Cargando…</div>}>
      <EtiquetadorHubInner />
    </Suspense>
  );
}

function EtiquetadorHubInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialTab = (sp.get("tab") as TabId) || tiles[0].id;
  const [active, setActive] = useState<TabId>(initialTab);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== active) {
      params.set("tab", active);
      router.replace(`?${params.toString()}`);
    }
  }, [active, router]);

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
      <section className="w-full max-w-[100%] mx-auto px-6 pb-4 flex-1 flex min-h-0 sm:px-[10px]">
        <Tabs
          value={active}
          onValueChange={(v) => setActive(v as TabId)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Barra superior: back + tabs (desktop) / back + hamburguesa (mobile) */}
          <TabsList className="w-full bg-transparent flex items-center justify-between">
            {/* Volver */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-purple-300 hover:text-purple-200 px-2 md:px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>

            {/* Accesos (versión escritorio) */}
            <div className="hidden md:flex space-x-2">
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

            {/* Hamburguesa (versión móvil/tablet) */}
            <div className="md:hidden">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Abrir menú"
                    className="text-white"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="bg-gray-900 text-white border-t border-gray-700 rounded-t-2xl"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white">Atajos</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-4 grid gap-2">
                    {tiles.map((t) => {
                      const Icon = t.icon;
                      const isActive = t.id === active;
                      return (
                        <Button
                          key={t.id}
                          variant={isActive ? "default" : "secondary"}
                          className={
                            isActive
                              ? "bg-purple-600 hover:bg-purple-600"
                              : "bg-gray-800 hover:bg-gray-700"
                          }
                          onClick={() => {
                            setActive(t.id);
                            setMenuOpen(false);
                          }}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {t.title}
                        </Button>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>

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
