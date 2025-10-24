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
  {
    id: "etiquetador",
    href: "/etiquetador",
    title: "Generador de Etiquetas",
    desc: "Crear y gestionar etiquetas estándar con código de barras y QR.",
    icon: Tags,
  },
  {
    id: "etiquetador_precios",
    href: "/etiquetador_precios",
    title: "Etiquetador de Precios",
    desc: "Etiquetas enfocadas en punto de Venta.",
    icon: DollarSign,
  },
  {
    id: "etiquetador_gabetas",
    href: "/etiquetador_ubicaciones",
    title: "Etiquetador de Ubicaciones",
    desc: "Etiquetas enfocadas en Almácen.",
    icon: DollarSign,
  },
  {
    id: "etiquetador_paquetes",
    href: "/etiquetador_paquetes",
    title: "Etiquetador de Paquetes",
    desc: "Imprime una etiqueta por paquete con código de barras del folio.",
    icon: Package,
  },
] as const;

type TabId = (typeof tiles)[number]["id"];

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

  // Detecta host en cliente
  const [isGoumam, setIsGoumam] = useState(false);
  useEffect(() => {
    try {
      const host = window.location.hostname;
      setIsGoumam(host === "goumam.krkn.mx");
    } catch {
      setIsGoumam(false);
    }
  }, []);

  // Filtra tiles visibles según host
  const visibleTiles = useMemo(() => {
    return isGoumam
      ? tiles.filter((t) => t.id !== "etiquetador_precios")
      : tiles;
  }, [isGoumam]);

  // Pestaña inicial: respeta ?tab si existe y es válida, si no, primera visible
  const spTab = sp.get("tab") as TabId | null;
  const safeInitialTab: TabId = useMemo(() => {
    const exists = visibleTiles.some((t) => t.id === spTab);
    return exists ? (spTab as TabId) : (visibleTiles[0]?.id as TabId);
  }, [spTab, visibleTiles]);

  const [active, setActive] = useState<TabId>(safeInitialTab);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mantén ?tab sincronizado y corrige si se vuelve inválido al cambiar visibleTiles
  useEffect(() => {
    if (!visibleTiles.some((t) => t.id === active)) {
      const fallback = visibleTiles[0]?.id as TabId;
      setActive(fallback);
      const p = new URLSearchParams(window.location.search);
      p.set("tab", fallback);
      router.replace(`?${p.toString()}`);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== active) {
      params.set("tab", active);
      router.replace(`?${params.toString()}`);
    }
  }, [active, visibleTiles, router]);

  // Atajos 1..N según tiles visibles
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1;
      if (!Number.isNaN(idx) && idx >= 0 && idx < visibleTiles.length) {
        setActive(visibleTiles[idx].id as TabId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleTiles]);

  const activeTile = useMemo(
    () => visibleTiles.find((t) => t.id === active),
    [active, visibleTiles]
  );
  const src = useMemo(
    () => activeTile?.href ?? visibleTiles[0].href,
    [activeTile, visibleTiles]
  );

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white">
      {/* Header */}
      <section className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/[0.02]">
        <div className="w-full max-w-6xl mx-auto px-6 py-4">
          <header className="text-center">
            <motion.h1
              className="text-2xl md:text-3xl font-bold text-white"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {activeTile?.title ?? "Centro de Etiquetado"}
            </motion.h1>
            {activeTile?.desc && (
              <p className="text-gray-400 mt-1 text-sm">{activeTile.desc}</p>
            )}
          </header>
        </div>
      </section>

      {/* Contenido (Tabs + iframe) */}
      <section className="w-full max-w-[100%] mx-auto px-0 sm:px-[10px] pb-4 flex-1 flex min-h-0">
        <Tabs
          value={active}
          onValueChange={(v) => setActive(v as TabId)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Barra superior */}
          <TabsList className="w-full bg-transparent border-0 flex items-center justify-between px-3 py-2 gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 backdrop-blur-sm border-0 transition-all duration-200 text-white text-sm shadow-lg shadow-purple-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>

            {/* Accesos escritorio */}
            <div className="hidden md:flex space-x-1">
              {visibleTiles.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex-none w-auto px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white data-[state=active]:text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 data-[state=active]:backdrop-blur-sm hover:bg-white/5 transition-all duration-200 border-0"
                >
                  {t.title}
                </TabsTrigger>
              ))}
            </div>

            {/* Menú móvil */}
            <div className="md:hidden">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Abrir menú"
                    className="text-white hover:bg-white/10 rounded-xl"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white border-t border-white/10 rounded-t-2xl"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white">
                      Sistema de etiquetador
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-4 grid gap-2">
                    {visibleTiles.map((t) => {
                      const Icon = t.icon;
                      const isActive = t.id === active;
                      return (
                        <Button
                          key={t.id}
                          variant={isActive ? "default" : "secondary"}
                          className={
                            isActive
                              ? "bg-gradient-to-br from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 shadow-lg shadow-purple-500/20"
                              : "bg-white/5 hover:bg-white/10 border border-white/10"
                          }
                          onClick={() => {
                            setActive(t.id as TabId);
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

          {visibleTiles.map((t) => (
            <TabsContent
              key={t.id}
              value={t.id}
              className="mt-3 flex-1 min-h-0 flex flex-col"
            >
              <div className="flex-1 min-h-0 overflow-hidden md:rounded-2xl md:border-0 md:shadow-none">
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
