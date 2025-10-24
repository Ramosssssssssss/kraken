"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { Input } from "@/components/ui/input";
import { fetchJsonWithRetry } from "@/lib/fetch-with-retry";
import {
  ArrowLeft,
  Plus,
  Scan,
  CheckCircle,
  AlertCircle,
  Package,
  Minus,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  Trash2,
  Copy,
  Menu,
  FileText,
  FileSpreadsheet,
  Edit,
} from "lucide-react";

type InventarioDetalle = {
  CLAVE: string;
  DESCRIPCION: string;
  UMED: string | null;
  CANTIDAD: number;
  _key: string;
  packed: number;
  scanned: number;
};

interface Toast {
  id: string;
  type: "error" | "success";
  message: string;
  autoClose?: boolean;
}

export default function InventarioFisicoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folioGenerado, setFolioGenerado] = useState<string | null>(null);
  const [doctoInvfisId, setDoctoInvfisId] = useState<number | null>(null);

  const router = useRouter();

  const [detalles, setDetalles] = useState<InventarioDetalle[]>([]);
  const [sucursalesAlmacenes, setSucursalesAlmacenes] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null);
  const [availableAlmacenes, setAvailableAlmacenes] = useState<any[]>([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState<number | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [requireScan, setRequireScan] = useState(true);
  const [autoFill, setAutoFill] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newClave, setNewClave] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [newCantidad, setNewCantidad] = useState("");
  const [searchingArticle, setSearchingArticle] = useState(false);

  const [searchResults, setSearchResults] = useState<
    Array<{ CLAVE_ARTICULO: string; NOMBRE: string }>
  >([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchingDescription, setSearchingDescription] = useState(false);

  const [scanValue, setScanValue] = useState("");
  const scannerRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const claveInputRef = useRef<HTMLInputElement>(null);
  const descripcionInputRef = useRef<HTMLInputElement>(null);
  const cantidadInputRef = useRef<HTMLInputElement>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [timerStarted, setTimerStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    product: InventarioDetalle;
    timestamp: Date;
  } | null>(null);
  const [successModal, setSuccessModal] = useState<null | {
    folio?: string;
    doctoInvfisId?: number | null;
    inserted?: number;
  }>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCantidad, setEditCantidad] = useState("");
  const [showSucursalesDropdown, setShowSucursalesDropdown] = useState(false);

  const { apiUrl, userData } = useCompany();
  const usuario = userData?.nombre ?? userData?.user ?? "desconocido";

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Folio copiado al portapapeles", "success");
    } catch (e) {
      showToast("No se pudo copiar el folio", "error");
    }
  };

  const fechaActual = new Date().toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City",
  });
  const descripcion = `CICLICO\nEnviado por: ${usuario}\nFecha: ${fechaActual}`;

  const baseURL = useMemo(
    () => (apiUrl || "").trim().replace(/\/+$/, ""),
    [apiUrl]
  );

  // Fetch sucursales+almacenes on mount
  useEffect(() => {
    if (!baseURL) return;

    let mounted = true;
    (async () => {
      try {
        const j = await fetchJsonWithRetry(`${baseURL}/sucursales-almacenes`);
        if (!mounted) return;

        if (j?.sucursalesAlmacenes && Array.isArray(j.sucursalesAlmacenes)) {
          setSucursalesAlmacenes(j.sucursalesAlmacenes);
          const sucursales = Array.from(
            new Map(
              j.sucursalesAlmacenes.map((r: any) => [
                r.SUCURSAL_ID,
                r.NOMBRE_SUCURSAL,
              ])
            )
          ).map(([id, name]) => ({ id, name }));
          if (sucursales.length === 1)
            setSelectedSucursal(Number(sucursales[0].id));
        }
      } catch (e: any) {
        if (!mounted) return;
        if (e?.message?.includes("404")) {
          console.warn(
            "⚠️ Endpoint /sucursales-almacenes no disponible. Usando valores por defecto."
          );
        } else {
          console.warn(
            "⚠️ Error fetching sucursales-almacenes:",
            e?.message || e
          );
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [baseURL]);

  // When selectedSucursal changes, compute available almacenes
  useEffect(() => {
    if (!selectedSucursal) {
      setAvailableAlmacenes([]);
      setSelectedAlmacen(null);
      return;
    }
    const filtered = sucursalesAlmacenes.filter(
      (r: any) => Number(r.SUCURSAL_ID) === Number(selectedSucursal)
    );
    const unique = Array.from(
      new Map(filtered.map((r: any) => [r.ALMACEN_ID, r.NOMBRE_ALMACEN]))
    ).map(([id, name]) => ({ id, name }));
    setAvailableAlmacenes(unique);
    if (unique.length === 1) setSelectedAlmacen(Number(unique[0].id));
  }, [selectedSucursal, sucursalesAlmacenes]);

  // ACTIVAR SCANNER AUTOMÁTICAMENTE cuando se selecciona el almacén
  useEffect(() => {
    if (selectedAlmacen && !scannerEnabled) {
      console.log("✅ Activando scanner automáticamente...");
      setScannerEnabled(true);
      // Forzar focus múltiples veces para asegurar que funcione
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.focus();
          console.log("🎯 Focus aplicado al scanner");
        }
      }, 100);
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.focus();
        }
      }, 300);
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.focus();
        }
      }, 500);
    }
  }, [selectedAlmacen, scannerEnabled]);

  // IMPLEMENTACIÓN EXACTA DEL FOCUS SCANNER COMO EN TU EJEMPLO
  const focusScanner = useCallback(() => {
    // Solo enfocar si el scanner está habilitado (después de seleccionar sucursal y almacén)
    if (!scannerEnabled) return;

    requestAnimationFrame(() => {
      if (
        scannerRef.current &&
        document.activeElement !== claveInputRef.current &&
        document.activeElement !== descripcionInputRef.current &&
        document.activeElement !== cantidadInputRef.current
      ) {
        scannerRef.current.focus();
      }
    });
  }, [scannerEnabled]);

  useEffect(() => {
    // Solo activar el modo agresivo si el scanner está habilitado
    if (!scannerEnabled) return;

    console.log("🔥 MODO AGRESIVO ACTIVADO - Scanner enabled");

    // Initial focus
    focusScanner();

    // Very aggressive focus check every 50ms
    const focusInterval = setInterval(() => {
      focusScanner();
    }, 50);

    // Event listeners for all possible interactions
    const handleInteraction = () => {
      setTimeout(focusScanner, 5);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target !== claveInputRef.current &&
        target !== descripcionInputRef.current &&
        target !== cantidadInputRef.current &&
        !target.closest('input[type="text"]') &&
        !target.closest('input[type="number"]')
      ) {
        handleInteraction();
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("mousedown", handleInteraction, true);
    document.addEventListener("touchstart", handleInteraction, true);
    document.addEventListener("scroll", handleInteraction, true);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        setTimeout(focusScanner, 10);
      }
    });
    document.addEventListener("focusout", handleInteraction, true);
    document.addEventListener("keydown", handleInteraction, true);
    document.addEventListener("mousemove", () => setTimeout(focusScanner, 50));
    window.addEventListener("focus", focusScanner);

    return () => {
      clearInterval(focusInterval);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mousedown", handleInteraction, true);
      document.removeEventListener("touchstart", handleInteraction, true);
      document.removeEventListener("scroll", handleInteraction, true);
      document.removeEventListener("visibilitychange", handleInteraction);
      document.removeEventListener("focusout", handleInteraction, true);
      document.removeEventListener("keydown", handleInteraction, true);
      document.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("focus", focusScanner);
    };
  }, [focusScanner, scannerEnabled]);

  useEffect(() => {
    if (!timerStarted || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, startTime]);

  useEffect(() => {
    const totalScanned = detalles.reduce((sum, d) => sum + d.scanned, 0);

    if (totalScanned > 0 && !timerStarted && detalles.length > 0) {
      setTimerStarted(true);
      setStartTime(Date.now());
    }
  }, [detalles, timerStarted]);

  const showToast = useCallback(
    (
      message: string,
      type: "error" | "success" = "error",
      autoClose = true
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message, autoClose }]);

      if (autoClose) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 1000);
      }
    },
    []
  );

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const flashLine = (idx: number) => {
    setFlashIndex(idx);
    setTimeout(() => setFlashIndex(null), 220);
  };

  const scrollToItem = useCallback(
    (index: number) => {
      if (listRef.current && index >= 0 && index < detalles.length) {
        const element = document.getElementById(`product-${index}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [detalles.length]
  );

  const totalLineas = detalles.length;
  const totalRequeridas = detalles.reduce((acc, d) => acc + d.CANTIDAD, 0);
  const lineasCompletas = detalles.filter((d) => {
    const req = d.CANTIDAD;
    const ok = requireScan ? d.scanned >= req : d.packed >= req;
    return req > 0 && ok;
  }).length;
  const totalHechas = detalles.reduce((acc, d) => {
    const val = requireScan ? d.scanned : d.packed;
    return acc + val;
  }, 0);
  const progreso =
    totalRequeridas > 0 ? Math.min(1, totalHechas / totalRequeridas) : 0;
  const listo = true;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper: normaliza códigos para comparación (sin caracteres especiales)
  const normalizeClave = (clave: string): string => {
    return String(clave || "")
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "") // Elimina guiones, apóstrofes, espacios, etc.
      .toUpperCase();
  };

  const searchAndAddArticle = async (clave: string) => {
    setSearchingArticle(true);
    try {
      const data = await fetchJsonWithRetry(
        `${baseURL}/buscar-articulo-recibo?clave=${encodeURIComponent(clave)}`
      );

      if (data.ok && data.articulo) {
        const normalizedClave = String(data.articulo.CLAVE_ARTICULO)
          .trim()
          .toUpperCase();

        const newItem: InventarioDetalle = {
          CLAVE: normalizedClave,
          DESCRIPCION: data.articulo.NOMBRE,
          UMED: data.articulo.UMED || null,
          CANTIDAD: 1,
          _key: `inv-${Date.now()}`,
          packed: 1,
          scanned: 1,
        };

        setDetalles((prev) => {
          // Comparar usando normalización SIN caracteres especiales
          const normalizedSearchClave = normalizeClave(normalizedClave);
          const idx = prev.findIndex(
            (d) => normalizeClave(d.CLAVE) === normalizedSearchClave
          );
          if (idx !== -1) {
            const updated = [...prev];
            const cur = updated[idx];
            updated[idx] = {
              ...cur,
              CANTIDAD: (cur.CANTIDAD ?? 0) + 1,
              packed: (cur.packed ?? 0) + 1,
              scanned: (cur.scanned ?? 0) + 1,
            };
            setTimeout(() => scrollToItem(idx), 100);
            return updated;
          } else {
            const updated = [...prev, newItem];
            setTimeout(() => scrollToItem(updated.length - 1), 100);
            return updated;
          }
        });

        showToast(`Artículo agregado: ${data.articulo.NOMBRE}`, "success");
      } else {
        const shouldAdd = confirm(
          `El código "${clave}" no existe en la base de datos. ¿Deseas agregarlo manualmente?`
        );
        if (shouldAdd) {
          setNewClave(clave);
          setNewDescripcion("");
          setNewCantidad("1");
          setShowAddForm(true);
        }
      }
    } catch {
      showToast("Error al buscar el artículo en la base de datos");
    } finally {
      setSearchingArticle(false);
    }
  };

  const addManualItem = () => {
    if (!selectedSucursal) {
      showToast(
        "⚠️ Selecciona una sucursal antes de agregar productos",
        "error"
      );
      return;
    }

    if (!newClave.trim() || !newDescripcion.trim() || !newCantidad.trim()) {
      showToast("Completa todos los campos");
      return;
    }

    const cantidad = Number(newCantidad);
    if (cantidad < 0) {
      showToast("La cantidad no puede ser negativa");
      return;
    }

    // Verificar si ya existe usando normalización
    const existingIndex = detalles.findIndex(
      (d) => normalizeClave(d.CLAVE) === normalizeClave(newClave)
    );
    if (existingIndex >= 0) {
      showToast("Ya existe un artículo con esa clave");
      return;
    }

    const newItem: InventarioDetalle = {
      CLAVE: newClave.toUpperCase(),
      DESCRIPCION: newDescripcion,
      UMED: null,
      CANTIDAD: cantidad,
      _key: `inv-${Date.now()}`,
      packed: cantidad,
      scanned: cantidad,
    };

    setDetalles((prev) => {
      const updated = [...prev, newItem];
      setTimeout(() => scrollToItem(updated.length - 1), 100);
      return updated;
    });
    setNewClave("");
    setNewDescripcion("");
    setNewCantidad("");
    setShowAddForm(false);

    showToast("Artículo agregado correctamente", "success");
    focusScanner();
  };

  const removeItem = (idx: number) => {
    const item = detalles[idx];
    const confirmDelete = confirm(
      `¿Eliminar artículo ${item?.CLAVE ?? ""} - ${
        item?.DESCRIPCION ?? ""
      }? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) {
      focusScanner();
      return;
    }

    setDetalles((prev) => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });

    showToast("Artículo eliminado", "success");
    focusScanner();
  };

  const startEditItem = (idx: number) => {
    const item = detalles[idx];
    setEditingIndex(idx);
    setEditCantidad(String(item.scanned));
  };

  const saveEditItem = (idx: number) => {
    const newCantidad = Number(editCantidad);
    if (isNaN(newCantidad) || newCantidad < 0) {
      showToast("Cantidad inválida");
      return;
    }

    setDetalles((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        CANTIDAD: newCantidad,
        scanned: newCantidad,
        packed: newCantidad,
      };
      return next;
    });

    setEditingIndex(null);
    setEditCantidad("");
    showToast("Cantidad actualizada", "success");
    focusScanner();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditCantidad("");
    focusScanner();
  };

  const inc = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev];
      const d = next[idx];
      const req = d.CANTIDAD;
      const pk = d.packed;
      if (pk < req) next[idx] = { ...d, packed: pk + 1 };
      return next;
    });
    setTimeout(focusScanner, 50);
  };

  const dec = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev];
      const d = next[idx];
      const pk = d.packed;
      const sc = d.scanned;
      if (pk > 0)
        next[idx] = { ...d, packed: pk - 1, scanned: Math.min(sc, pk - 1) };
      return next;
    });
    setTimeout(focusScanner, 50);
  };

  const fillToRequired = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev];
      const d = next[idx];
      const req = d.CANTIDAD;
      next[idx] = { ...d, packed: req, scanned: requireScan ? d.scanned : req };
      return next;
    });
    setTimeout(focusScanner, 50);
  };

  const processScan = (raw: string) => {
    if (!selectedSucursal) {
      showToast("⚠️ Selecciona una sucursal antes de escanear", "error");
      return;
    }

    // Eliminar TODOS los caracteres especiales (guiones, apóstrofes, etc.)
    // Solo mantener números y letras
    const sanitized = (raw || "")
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "") // ELIMINA todos los caracteres que NO sean letras o números
      .toUpperCase();
    const code = sanitized;

    if (!code) return;

    console.log(`[v0] Scanned code: "${raw}" -> Sanitized: "${code}"`);

    // Buscar usando normalización (sin caracteres especiales)
    const idx = detalles.findIndex((d) => normalizeClave(d.CLAVE) === code);

    if (idx >= 0) {
      setDetalles((prev) => {
        const next = [...prev];
        const item = next[idx];
        const req = item.CANTIDAD;
        const pk = item.packed;
        const sc = item.scanned;

        let newPacked = pk;
        let newScanned = sc;
        let newRequired = req;

        if (autoFill) {
          newPacked = Math.min(req, req);
          newScanned = Math.min(req, req);
        } else {
          if (pk >= req && sc >= req) {
            newRequired = req + 1;
            newPacked = pk + 1;
            newScanned = sc + 1;
          } else {
            if (pk < req) newPacked = pk + 1;
            if (sc < req) newScanned = sc + 1;
          }
        }

        next[idx] = {
          ...item,
          CANTIDAD: newRequired,
          packed: newPacked,
          scanned: newScanned,
        };

        setLastScannedProduct({
          product: next[idx],
          timestamp: new Date(),
        });

        return next;
      });

      flashLine(idx);
      setTimeout(() => scrollToItem(idx), 150);
      showToast(`Escaneado: ${code}`, "success");
    } else {
      console.log(
        `[v0] Code not found in detalles, searching in database: ${code}`
      );
      searchAndAddArticle(code);
    }
  };

  const resetInventario = useCallback(() => {
    setDetalles([]);
    setDoctoInvfisId(null);
    focusScanner();
  }, [focusScanner]);

  const aplicarInventario = useCallback(async () => {
    if (isSubmitting) return;

    if (!selectedSucursal) {
      showToast(
        "⚠️ Selecciona una sucursal antes de aplicar el inventario",
        "error"
      );
      return;
    }

    if (!baseURL) {
      showToast("No se encontró la URL de tu empresa");
      return;
    }

    if (detalles.length === 0) {
      showToast("No hay productos en el inventario");
      return;
    }

    setIsSubmitting(true);
    try {
      const detallesComp = detalles.map((d) => ({
        CLAVE: d.CLAVE,
        CANTIDAD: requireScan ? d.scanned : d.packed,
      }));

      const payload: any = {
        P_DESCRIPCION: descripcion,
        P_USUARIO: usuario,
        P_SUCURSAL_ID: selectedSucursal,
        P_ALMACEN_ID: selectedAlmacen,
        detalles: detallesComp,
      };

      const data = await fetchJsonWithRetry(`${baseURL}/inventario-fisico`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!data.ok) {
        showToast(data?.message || "Error al aplicar inventario físico");
        return;
      }

      setFolioGenerado(data.folio);
      setDoctoInvfisId(data.doctoInvfisId);

      setSuccessModal({
        folio: data.folio,
        doctoInvfisId: data.doctoInvfisId,
        inserted: data.inserted,
      });

      setDetalles([]);
    } catch (error) {
      console.error("❌ Error en aplicarInventario:", error);
      showToast("Error de conexión: No se pudo conectar al servidor");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    listo,
    requireScan,
    detalles,
    baseURL,
    showToast,
    focusScanner,
    resetInventario,
  ]);

  // ATAJOS DE TECLADO: Alt + A para agregar, Alt + C para completar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + A para abrir modal de agregar artículo
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (!selectedSucursal) {
          showToast("⚠️ Selecciona una sucursal primero", "error");
          return;
        }
        if (!showAddForm) {
          console.log("🎹 Atajo Alt+A activado - Abriendo modal");
          setShowAddForm(true);
        }
      }

      // Alt + C para completar inventario
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (detalles.length > 0 && !isSubmitting) {
          console.log("🎹 Atajo Alt+C activado - Completando inventario");
          aplicarInventario();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedSucursal,
    showAddForm,
    showToast,
    detalles.length,
    isSubmitting,
    aplicarInventario,
  ]);

  const searchArticleByClave = async (clave: string) => {
    if (!clave.trim()) return;

    setSearchingArticle(true);
    try {
      const data = await fetchJsonWithRetry(
        `${baseURL}/buscar-articulo-recibo?clave=${encodeURIComponent(clave)}`
      );

      if (data.ok && data.articulo) {
        setNewClave(data.articulo.CLAVE_ARTICULO);
        setNewDescripcion(data.articulo.NOMBRE);
        showToast(`Artículo encontrado: ${data.articulo.NOMBRE}`, "success");
      }
    } catch (error) {
      showToast("Error al buscar el artículo en la base de datos");
    } finally {
      setSearchingArticle(false);
    }
  };

  const searchArticlesByDescription = async (descripcion: string) => {
    if (!descripcion.trim() || descripcion.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchingDescription(true);
    try {
      const data = await fetchJsonWithRetry(
        `${baseURL}/buscar-por-descripcion?descripcion=${encodeURIComponent(
          descripcion
        )}`
      );

      if (data.success && data.data && data.data.length > 0) {
        setSearchResults(data.data);
        setShowSearchResults(true);

        if (data.count === 1) {
          const result = data.data[0];
          setNewClave(result.CLAVE_ARTICULO);
          setNewDescripcion(result.NOMBRE);
          setShowSearchResults(false);
          showToast(`Artículo encontrado: ${result.NOMBRE}`, "success");
        } else {
          showToast(
            `Se encontraron ${data.count} artículos. Selecciona uno de la lista.`,
            "success",
            false
          );
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearchingDescription(false);
    }
  };

  const selectSearchResult = (result: {
    CLAVE_ARTICULO: string;
    NOMBRE: string;
  }) => {
    setNewClave(result.CLAVE_ARTICULO);
    setNewDescripcion(result.NOMBRE);
    setSearchResults([]);
    setShowSearchResults(false);
    showToast(`Artículo seleccionado: ${result.NOMBRE}`, "success");
  };

  const handleClaveChange = (text: string) => {
    setNewClave(text);

    if (text.length >= 4) {
      const timeoutId = setTimeout(() => {
        searchArticleByClave(text.toUpperCase());
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  };

  const handleDescripcionChange = (text: string) => {
    setNewDescripcion(text);

    if (text.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchArticlesByDescription(text.toUpperCase());
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 font-sans overflow-x-hidden">
      {/* Selection modal: require sucursal + almacen before starting conteo */}
      {!selectedAlmacen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-2">
              Seleccione Sucursal y Almacén
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Antes de iniciar el conteo selecciona la sucursal y el almacén
              donde se realizará.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Sucursal
                </label>
                <select
                  className="w-full p-3 border border-white/10 rounded-lg bg-white/5 text-white focus:border-purple-500/50 focus:outline-none"
                  value={selectedSucursal ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedSucursal(v ? Number(v) : null);
                  }}
                >
                  <option value="" className="bg-gray-900">
                    -- Seleccione --
                  </option>
                  {Array.from(
                    new Map(
                      sucursalesAlmacenes.map((r: any) => [
                        r.SUCURSAL_ID,
                        r.NOMBRE_SUCURSAL,
                      ])
                    )
                  ).map(([id, name]) => (
                    <option key={id} value={id} className="bg-gray-900">
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Almacén
                </label>
                <select
                  className="w-full p-3 border border-white/10 rounded-lg bg-white/5 text-white focus:border-purple-500/50 focus:outline-none"
                  value={selectedAlmacen ?? ""}
                  onChange={(e) =>
                    setSelectedAlmacen(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="" className="bg-gray-900">
                    -- Seleccione --
                  </option>
                  {availableAlmacenes.map((a: any) => (
                    <option key={a.id} value={a.id} className="bg-gray-900">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    if (selectedAlmacen) {
                      setScannerEnabled(true);
                      setTimeout(() => focusScanner(), 50);
                    }
                  }}
                  disabled={!selectedAlmacen}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedAlmacen
                      ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white"
                      : "bg-white/5 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Iniciar conteo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INPUT INVISIBLE EXACTAMENTE COMO EN TU EJEMPLO */}
      <input
        ref={scannerRef}
        type="text"
        value={scanValue}
        onChange={(e) => setScanValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            processScan(scanValue);
            setScanValue("");
          }
        }}
        onBlur={() => {
          if (scannerEnabled) {
            setTimeout(focusScanner, 5);
          }
        }}
        autoComplete="off"
        autoFocus={scannerEnabled}
        tabIndex={scannerEnabled ? 0 : -1}
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
          zIndex: scannerEnabled ? -1 : -9999,
          left: "0px",
          top: "0px",
        }}
      />

      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl p-4 border shadow-lg animate-slide-in-right flex items-center gap-3 min-w-[320px] backdrop-blur-xl ${
              toast.type === "error"
                ? "border-red-500/20 bg-red-500/10"
                : "border-green-500/20 bg-green-500/10"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                toast.type === "error"
                  ? "bg-red-500/20 border border-red-500/30"
                  : "bg-green-500/20 border border-green-500/30"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
            </div>
            <p
              className={`flex-1 font-light text-sm tracking-wide whitespace-pre-line ${
                toast.type === "error" ? "text-red-400" : "text-green-400"
              }`}
            >
              {toast.message}
            </p>
            {!toast.autoClose && (
              <button
                onClick={() => closeToast(toast.id)}
                className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-full mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center hover:scale-105 transition-transform"
                onClick={() => {
                  router.replace("/dashboard");
                  setTimeout(focusScanner, 100);
                }}
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 p-3">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Inventario Físico
                  </h1>
                  <p className="text-gray-400">
                    Conteo de Inventario •{" "}
                    {scannerEnabled ? "Scanner Activo" : "Scanner Inactivo"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {timerStarted && (
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl px-6 py-3 flex items-center gap-3 animate-fade-in">
                  <Clock className="w-5 h-5 text-white" />
                  <div className="text-right">
                    <div className="font-light text-xs tracking-wide text-white/60 leading-none mb-1">
                      Tiempo
                    </div>
                    <div className="font-light text-xl tracking-wide text-white/90 leading-none tabular-nums">
                      {formatTime(elapsedSeconds)}
                    </div>
                  </div>
                </div>
              )}

              <button
                className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                  !selectedSucursal
                    ? "bg-white/5 border border-white/10 text-gray-400 opacity-50 cursor-not-allowed"
                    : requireScan
                    ? "bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-white shadow-lg"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
                onClick={() => {
                  if (!selectedSucursal) {
                    showToast("⚠️ Selecciona una sucursal primero", "error");
                    return;
                  }
                  setRequireScan(!requireScan);
                  setTimeout(focusScanner, 50);
                }}
                title={
                  selectedSucursal
                    ? "Toggle scanner"
                    : "Selecciona una sucursal primero"
                }
              >
                <Scan className="h-5 w-5" />
                {requireScan ? "ON" : "OFF"}
              </button>

              <button
                className={`w-10 h-10 rounded-xl text-white transition-all flex items-center justify-center ${
                  selectedSucursal
                    ? "bg-gradient-to-br from-purple-500/30 to-blue-500/30 hover:scale-105"
                    : "bg-white/5 border border-white/10 opacity-50 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!selectedSucursal) {
                    showToast("⚠️ Selecciona una sucursal primero", "error");
                    return;
                  }
                  setShowAddForm(true);
                }}
                title={
                  selectedSucursal
                    ? "Agregar producto (Alt + A)"
                    : "Selecciona una sucursal primero"
                }
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 max-w-lg w-full shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-light text-2xl tracking-wide text-white/90">
                Agregar Artículo
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewClave("");
                  setNewDescripcion("");
                  setNewCantidad("");
                  setSearchResults([]);
                  setShowSearchResults(false);
                  setTimeout(focusScanner, 100);
                }}
                className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addManualItem();
              }}
              className="space-y-4"
            >
              <div className="relative">
                <label className="block font-light text-sm tracking-wide text-white/70 mb-2">
                  Clave del artículo
                </label>
                <Input
                  ref={claveInputRef}
                  value={newClave}
                  onChange={(e) => handleClaveChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // Si hay descripción (encontró el artículo), saltar a cantidad
                      if (newDescripcion.trim()) {
                        cantidadInputRef.current?.focus();
                      } else {
                        // Si no hay descripción, ir a descripción para buscar manualmente
                        descripcionInputRef.current?.focus();
                      }
                    }
                  }}
                  placeholder="Escribe la clave..."
                  className={`bg-white/5 border-white/10 text-white/90 placeholder-white/40 ${
                    searchingArticle ? "border-teal-400/30 bg-teal-400/10" : ""
                  }`}
                />
                {searchingArticle && (
                  <div className="absolute right-3 top-9 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span className="font-light text-xs tracking-wide text-teal-400">
                      Buscando...
                    </span>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block font-light text-sm tracking-wide text-white/70 mb-2">
                  Descripción
                </label>
                <Input
                  ref={descripcionInputRef}
                  value={newDescripcion}
                  onChange={(e) => handleDescripcionChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // Saltar a cantidad al presionar Enter
                      cantidadInputRef.current?.focus();
                    }
                  }}
                  placeholder="Escribe para buscar..."
                  disabled={searchingArticle}
                  className={`bg-white/5 border-white/10 text-white/90 placeholder-white/40 ${
                    searchingDescription
                      ? "border-teal-400/30 bg-teal-400/10"
                      : ""
                  }`}
                />
                {searchingDescription && (
                  <div className="absolute right-3 top-9 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span className="font-light text-xs tracking-wide text-teal-400">
                      Buscando...
                    </span>
                  </div>
                )}
              </div>

              {showSearchResults && searchResults.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl max-h-48 overflow-y-auto">
                  <p className="font-light text-sm tracking-wide text-white/90 p-3 border-b border-white/10">
                    Resultados encontrados ({searchResults.length}):
                  </p>
                  {searchResults.map((item) => (
                    <button
                      key={item.CLAVE_ARTICULO}
                      onClick={() => selectSearchResult(item)}
                      className="w-full text-left p-3 hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors"
                    >
                      <p className="font-light text-sm tracking-wide text-white/90">
                        {item.CLAVE_ARTICULO}
                      </p>
                      <p className="font-light text-xs tracking-wide text-white/60">
                        {item.NOMBRE}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block font-light text-sm tracking-wide text-white/70 mb-2">
                  Cantidad
                </label>
                <Input
                  ref={cantidadInputRef}
                  value={newCantidad}
                  onChange={(e) => setNewCantidad(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // Agregar el artículo al presionar Enter
                      addManualItem();
                    }
                  }}
                  placeholder="Cantidad (puede ser 0)"
                  type="number"
                  className="bg-white/5 border-white/10 text-white/90 placeholder-white/40"
                />
                <p className="font-light text-xs tracking-wide text-white/50 mt-1">
                  Puedes agregar productos con cantidad 0
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  className="flex-1 py-3 rounded-xl font-light tracking-wide border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewClave("");
                    setNewDescripcion("");
                    setNewCantidad("");
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setTimeout(focusScanner, 100);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-light tracking-wide border border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 w-3/4 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-light text-xl tracking-wide text-white/90 mb-1">
                    Folio: {folioGenerado || "Pendiente"}
                  </h2>
                  <p className="font-light text-sm tracking-wide text-white/60">
                    Inventario Físico
                    {selectedSucursal && selectedAlmacen && (
                      <>
                        {" "}
                        • Almacén{" "}
                        {(() => {
                          const almacen = availableAlmacenes.find(
                            (a: any) => Number(a.id) === selectedAlmacen
                          );
                          return almacen ? almacen.name : selectedAlmacen;
                        })()}
                      </>
                    )}
                    {!selectedSucursal && (
                      <span className="text-orange-400">
                        {" "}
                        • Sin sucursal seleccionada
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {!selectedSucursal ? (
              <div className="text-center py-16">
                <div className="mx-auto w-fit rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-6 mb-4">
                  <AlertCircle className="w-12 h-12 text-orange-400 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Selecciona una sucursal
                </h3>
                <p className="text-gray-400 mb-4">
                  Debes seleccionar una sucursal antes de comenzar el conteo
                </p>
                <button
                  onClick={() => {
                    const sucursalesCard = document.querySelector(
                      '[class*="Sucursal"]'
                    );
                    sucursalesCard?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500/30 to-red-500/30 hover:from-orange-500/40 hover:to-red-500/40 text-white font-semibold transition-all"
                >
                  Ver sucursales disponibles →
                </button>
              </div>
            ) : detalles.length > 0 ? (
              <div ref={listRef} className="space-y-3">
                <h3 className="font-light text-lg tracking-wide text-white/90 mb-4">
                  Productos
                </h3>
                {detalles.map((item, index) => {
                  const req = item.CANTIDAD;
                  const pk = item.packed;
                  const sc = item.scanned;
                  const okLinea =
                    req === 0 || (requireScan ? sc >= req : pk >= req);
                  const isFlash = flashIndex === index;

                  return (
                    <div
                      key={item._key}
                      id={`product-${index}`}
                      className={`rounded-xl border p-4 backdrop-blur-xl transition-all duration-300 ${
                        okLinea
                          ? "border-white/30 bg-white/10"
                          : "border-white/10 bg-white/5"
                      } ${isFlash ? "ring-2 ring-white/50 bg-white/10" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4
                              className={`font-light text-sm tracking-wide ${
                                okLinea ? "text-white/90" : "text-white/70"
                              }`}
                            >
                              {item.CLAVE}
                            </h4>
                            {okLinea && (
                              <div className="flex items-center gap-1 border border-white/30 bg-black/60 text-white/90 font-light text-xs tracking-wide px-2 py-1 rounded-md">
                                <CheckCircle className="w-3 h-3" />
                                {req === 0 ? "Cantidad 0" : "Completo"}
                              </div>
                            )}
                          </div>

                          <p className="font-light text-sm tracking-wide text-white/70 mb-2 leading-relaxed">
                            {item.DESCRIPCION}
                          </p>

                          <div className="flex flex-wrap gap-4 font-light text-xs tracking-wide text-white/50 mb-3">
                            <span>UM: {item.UMED || "N/A"}</span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm">
                            <div>
                              <span className="font-light tracking-wide text-white/60">
                                Escaneado:
                              </span>
                              <span
                                className={`font-light tracking-wide ml-1 ${
                                  okLinea ? "text-white/90" : "text-white/70"
                                }`}
                              >
                                {sc}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 ml-6">
                          {editingIndex === index ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                type="number"
                                value={editCantidad}
                                onChange={(e) =>
                                  setEditCantidad(e.target.value)
                                }
                                className="w-20 bg-black/40 border-white/10 text-white/90 text-center"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  className="p-2 rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 hover:from-blue-500/30 hover:to-blue-600/30 transition-all"
                                  onClick={() => saveEditItem(index)}
                                  title="Guardar"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-2 rounded-lg border border-white/10 bg-black/40 text-white/60 hover:bg-black/60 transition-all"
                                  onClick={cancelEdit}
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-center">
                                <div className="font-light text-xl tracking-wide text-white/90">
                                  {sc}
                                </div>
                                <div className="font-light text-xs tracking-wide text-white/50">
                                  Escaneado
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  className="p-2 rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 hover:from-blue-500/30 hover:to-blue-600/30 transition-all"
                                  onClick={() => startEditItem(index)}
                                  title="Editar cantidad"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-2 rounded-lg border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-400 hover:from-red-500/30 hover:to-red-600/30 transition-all"
                                  onClick={() => removeItem(index)}
                                  title="Eliminar artículo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-fit rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-6 mb-4">
                  <Scan className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Escanea para comenzar
                </h3>
                <p className="text-gray-400">
                  {scannerEnabled
                    ? "El scanner está activo. Escanea cualquier código para agregarlo"
                    : "Selecciona una sucursal para activar el scanner"}
                </p>
              </div>
            )}

            {detalles.length > 0 && (
              <div className="fixed bottom-6 left-0 right-80 bg-gradient-to-t from-gray-950 via-black/80 to-transparent pt-4 pb-6 px-6">
                <div className="flex justify-center">
                  <button
                    className={`max-w-[420px] w-full sm:w-auto flex items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl ${
                      !isSubmitting
                        ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white"
                        : "bg-white/5 border border-white/10 text-gray-400 cursor-not-allowed opacity-50"
                    }`}
                    onClick={() => {
                      if (!isSubmitting) aplicarInventario();
                    }}
                    disabled={isSubmitting}
                    title={
                      isSubmitting
                        ? "Aplicando..."
                        : "Completar inventario (Alt + C)"
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Aplicando Inventario...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Completar Inventario
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="w-80 border-l border-white/10 bg-gradient-to-b from-black/40 to-black/60 backdrop-blur-xl shadow-inner">
          <div className="p-5 h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-light text-xs tracking-wide text-white/50">
                  Usuario
                </p>
                <p className="font-light tracking-wide text-white/90">
                  {usuario}
                </p>
              </div>
              <div className="text-right">
                <p className="font-light text-xs tracking-wide text-white/50">
                  Tiempo
                </p>
                <p className="font-light tracking-wide text-white/90">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center font-semibold text-white">
                  {Math.round(progreso * 100)}%
                </div>
                <div>
                  <p className="font-light text-sm tracking-wide text-white/90">
                    Progreso Total
                  </p>
                  <p className="font-light text-xs tracking-wide text-white/60">
                    {totalHechas} de {totalRequeridas}
                  </p>
                </div>
              </div>

              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progreso * 100}%` }}
                />
              </div>
            </div>

            {/* Dropdown de Sucursales */}
            {sucursalesAlmacenes.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-4 shadow-sm relative">
                <h5 className="text-sm font-semibold text-white mb-3">
                  Sucursal
                </h5>

                {/* Botón principal del dropdown */}
                <button
                  onClick={() =>
                    setShowSucursalesDropdown(!showSucursalesDropdown)
                  }
                  className="w-full rounded-xl p-3 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 flex items-center justify-between transition-all duration-200"
                >
                  {selectedSucursal ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs font-bold text-white">
                        {(() => {
                          const sucursal = Array.from(
                            new Map(
                              sucursalesAlmacenes.map((r: any) => [
                                r.SUCURSAL_ID,
                                r.NOMBRE_SUCURSAL,
                              ])
                            )
                          ).find(([id]) => Number(id) === selectedSucursal);
                          const name = sucursal ? sucursal[1] : "";
                          return String(name)
                            .split(" ")
                            .map((word: string) => word[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase();
                        })()}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">
                          {(() => {
                            const sucursal = Array.from(
                              new Map(
                                sucursalesAlmacenes.map((r: any) => [
                                  r.SUCURSAL_ID,
                                  r.NOMBRE_SUCURSAL,
                                ])
                              )
                            ).find(([id]) => Number(id) === selectedSucursal);
                            return sucursal ? sucursal[1] : "Seleccionar";
                          })()}
                        </div>
                        <div className="text-xs text-purple-400">
                          Seleccionada
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400">
                        ?
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-gray-400">
                          Selecciona una sucursal
                        </div>
                        <div className="text-xs text-gray-500">
                          Click para ver opciones
                        </div>
                      </div>
                    </div>
                  )}
                  <div
                    className={`text-sm transition-transform ${
                      showSucursalesDropdown ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </div>
                </button>

                {/* Dropdown desplegable */}
                {showSucursalesDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSucursalesDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/10 bg-gradient-to-br from-black/95 to-black/90 backdrop-blur-xl shadow-2xl max-h-80 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {Array.from(
                          new Map(
                            sucursalesAlmacenes.map((r: any) => [
                              r.SUCURSAL_ID,
                              r.NOMBRE_SUCURSAL,
                            ])
                          )
                        ).map(([id, name]) => {
                          const isSelected = selectedSucursal === Number(id);
                          const initials = String(name)
                            .split(" ")
                            .map((word: string) => word[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase();

                          return (
                            <button
                              key={id}
                              onClick={() => {
                                setSelectedSucursal(Number(id));
                                setShowSucursalesDropdown(false);
                              }}
                              className={`group w-full rounded-lg p-3 flex items-center justify-between transition-all duration-200 ${
                                isSelected
                                  ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30"
                                  : "hover:bg-white/5 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                                    isSelected
                                      ? "bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-white"
                                      : "bg-white/5 text-gray-400 group-hover:bg-white/10"
                                  }`}
                                >
                                  {initials}
                                </div>
                                <div className="text-left">
                                  <div
                                    className={`font-semibold text-sm ${
                                      isSelected
                                        ? "text-white"
                                        : "text-gray-300"
                                    }`}
                                  >
                                    {name}
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`text-xs ${
                                  isSelected
                                    ? "text-purple-400"
                                    : "text-gray-400 group-hover:text-gray-300"
                                }`}
                              >
                                {isSelected ? "✓" : "→"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {lastScannedProduct && (
              <div className="rounded-xl border border-teal-400/20 bg-teal-400/10 backdrop-blur-xl p-3">
                <h5 className="font-light text-xs tracking-wide text-teal-400 mb-2">
                  Último escaneado
                </h5>
                <p className="font-light tracking-wide text-white/90 text-sm">
                  {lastScannedProduct.product.CLAVE}
                </p>
                <p className="font-light text-xs tracking-wide text-white/60 mb-2 truncate">
                  {lastScannedProduct.product.DESCRIPCION}
                </p>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="font-light text-xs tracking-wide text-teal-400">
                      Escaneado
                    </p>
                    <p className="font-light tracking-wide text-teal-300">
                      {lastScannedProduct.product.scanned}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-light text-xs tracking-wide text-teal-400">
                      Completado
                    </p>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full"
                        style={{
                          width: `${
                            lastScannedProduct.product.CANTIDAD === 0
                              ? 100
                              : Math.min(
                                  100,
                                  ((lastScannedProduct.product.scanned || 0) /
                                    (lastScannedProduct.product.CANTIDAD ||
                                      1)) *
                                    100
                                )
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto font-light text-xs tracking-wide text-white/50">
              <p>
                Consejo: Usa el scanner o el botón + para agregar artículos.
              </p>
            </div>
          </div>
        </aside>
      </div>
      {successModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-teal-800/95 to-cyan-900/95 backdrop-blur-xl shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-light text-xl tracking-wide text-white/90">
                  Inventario aplicado
                </h3>
                <p className="font-light text-sm tracking-wide text-white/70 mt-1">
                  Se registró correctamente en el sistema.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    title="Exportar"
                  >
                    <Menu className="w-4 h-4 text-white/60" />
                  </button>

                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-50"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-white/10 bg-gradient-to-br from-teal-800/95 to-cyan-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/10 text-white/90 transition-all"
                          onClick={() => {
                            showToast(
                              "Exportar a PDF (próximamente)",
                              "success"
                            );
                            setShowExportMenu(false);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="font-light text-sm tracking-wide">
                            PDF
                          </span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-white/90 transition-all"
                          onClick={() => {
                            showToast(
                              "Exportar a Excel (próximamente)",
                              "success"
                            );
                            setShowExportMenu(false);
                          }}
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span className="font-light text-sm tracking-wide">
                            Excel
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                  onClick={() => {
                    setSuccessModal(null);
                    setShowExportMenu(false);
                  }}
                  title="Cerrar"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-light text-xs tracking-wide text-white/60">
                    Folio
                  </p>
                  <p className="font-mono font-light tracking-wide text-white/95">
                    {successModal.folio ?? "N/A"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(String(successModal.folio ?? ""))
                  }
                  className="p-2 rounded-lg border border-teal-500/20 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 hover:border-teal-500/30 transition-all"
                  title="Copiar folio"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-light text-xs tracking-wide text-white/60">
                    Líneas insertadas
                  </p>
                  <p className="font-light tracking-wide text-white/95">
                    {successModal.inserted ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setSuccessModal(null);
                }}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-light text-sm tracking-wide text-white/90"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  // Redirigir a aplicar-inv con el folio como query param
                  const folio = successModal.folio || "";
                  console.log("🚀 Redirigiendo con folio:", folio);
                  // Usar window.location para forzar recarga completa
                  window.location.href = `/aplicar-inv?highlight=${encodeURIComponent(
                    folio
                  )}`;
                }}
                className="px-4 py-2 rounded-lg border border-teal-500/20 bg-teal-500/10 hover:bg-teal-500/20 font-light text-sm tracking-wide text-teal-400 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Ir a aplicar
              </button>
              <button
                onClick={() => {
                  const continuar = confirm(
                    "¿Deseas continuar con la misma sucursal y almacén?\n\n" +
                      "✅ Aceptar = Continuar con la misma ubicación\n" +
                      "❌ Cancelar = Seleccionar otra sucursal/almacén"
                  );

                  setSuccessModal(null);

                  if (continuar) {
                    setTimeout(() => focusScanner(), 50);
                  } else {
                    setSelectedSucursal(null);
                    setSelectedAlmacen(null);
                    setScannerEnabled(false);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 font-light text-sm tracking-wide text-purple-400"
              >
                Nuevo conteo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
