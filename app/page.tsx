"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { QuinielaTable } from "@/components/quiniela-table";
import { SidebarPanel } from "@/components/sidebar-panel";
import { CierresSection } from "@/components/cierres-section";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuinielaData {
  fecha: string;
  fechaAyer?: string;
  consultado: string;
  sorteos: {
    [provincia: string]: {
      [horario: string]: string | null;
    };
  };
  nocturnasAyer?: {
    [provincia: string]: string | null;
  };
}

// URL de la API local de Next.js
const API_URL = "/api/quiniela";

// Horarios de sorteo (hora Argentina)
const HORARIOS_SORTEO = {
  Previa: 10.25,
  Primera: 12.17,
  Matutina: 15.17,
  Vespertina: 18.17,
  Nocturna: 21.17,
};

// Intervalo de actualizacion automatica (5 minutos)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

function getArgentinaTime(): Date {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
}

function getCurrentHourDecimal(): number {
  const now = getArgentinaTime();
  return now.getHours() + now.getMinutes() / 60;
}

function getFechaHoy(): string {
  const now = getArgentinaTime();
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const diaSemana = dias[now.getDay()];
  const dia = now.getDate();
  const mes = meses[now.getMonth()];

  return `${diaSemana} ${dia} de ${mes}`;
}

export default function QuinielaPage() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get("debug") !== null;

  const [data, setData] = useState<QuinielaData | null>(null);
  const [fechaActual, setFechaActual] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determinar que horarios mostrar segun la hora actual
  const getVisibleHorarios = useCallback((): string[] => {
    const currentHour = getCurrentHourDecimal();
    const visible: string[] = [];

    // Siempre mostrar Nocturna (siempre muestra datos de ayer)
    visible.push("Nocturna");

    if (currentHour >= 8) {
      if (currentHour >= HORARIOS_SORTEO.Previa) visible.push("Previa");
      if (currentHour >= HORARIOS_SORTEO.Primera) visible.push("Primera");
      if (currentHour >= HORARIOS_SORTEO.Matutina) visible.push("Matutina");
      if (currentHour >= HORARIOS_SORTEO.Vespertina) visible.push("Vespertina");
    }

    return visible;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Error al conectar con la API");
      }

      const jsonData: QuinielaData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError("Error al conectar con la API");
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial y actualizar fecha
  useEffect(() => {
    setFechaActual(getFechaHoy());
    fetchData();

    // Actualizar fecha cada minuto
    const checkDateChange = setInterval(() => {
      setFechaActual(getFechaHoy());
    }, 60 * 1000);

    return () => clearInterval(checkDateChange);
  }, [fetchData]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Obtener nocturnas de ayer desde la API
  const nocturnasAyer = data?.nocturnasAyer || {};

  return (
    <main className="h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-2 overflow-hidden">
      <div className="w-full px-4 h-full flex flex-col">
        {/* Header */}
        {isDebug && (
          <div className="flex justify-end mb-2">
            <Button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl transition-all duration-200 shadow-lg"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border-2 border-red-500 text-red-200 rounded-xl text-sm font-semibold backdrop-blur">
            {error}
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Tabla de quiniela */}
          <div className="flex-1 bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-emerald-500/30 flex flex-col">
            <QuinielaTable
              data={data}
              loading={loading}
              nocturnasAyer={nocturnasAyer}
              visibleHorarios={getVisibleHorarios()}
            />
            <CierresSection />
          </div>

          {/* Panel lateral */}
          <div className="w-full lg:w-72 xl:w-80">
            <SidebarPanel fecha={data?.fecha || ""} />
          </div>
        </div>
      </div>
    </main>
  );
}
