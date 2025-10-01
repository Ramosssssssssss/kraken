// Import Suspense
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import XmlReciboPremium from "@/components/xml-recibo-premium";

export default function XmlReciboPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [xmlData, setXmlData] = useState<any[]>([]);
  const [folio, setFolio] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const folioParam = searchParams.get("folio");
    const dataParam = searchParams.get("data");

    if (!folioParam || !dataParam) {
      alert("Faltan parámetros requeridos");
      router.push("/recibo/seleccion-tipo");
      return;
    }

    try {
      const parsedData = JSON.parse(decodeURIComponent(dataParam));
      setXmlData(parsedData);
      setFolio(folioParam);
    } catch (error) {
      console.error("[v0] Error parsing XML data:", error);
      alert("Error al procesar los datos del XML");
      router.push("/recibo/seleccion-tipo");
      return;
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-cyan-900 font-medium">Cargando datos del XML...</p>
        </div>
      </div>
    );
  }

  return <XmlReciboPremium xmlData={xmlData} folio={folio} />;
}

// Wrap with Suspense in the parent or page component
function SuspendedXmlReciboPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <XmlReciboPage />
    </Suspense>
  );
}

