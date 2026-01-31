"use client";

interface QuinielaData {
  fecha: string;
  consultado: string;
  sorteos: {
    [provincia: string]: {
      [horario: string]: string | null;
    };
  };
}

interface QuinielaTableProps {
  data: QuinielaData | null;
  loading: boolean;
  nocturnasAyer: { [provincia: string]: string | null };
  visibleHorarios: string[];
}

const horarios = [
  { key: "Previa", label: "PREVIA", time: "10.15 HS" },
  { key: "Primera", label: "EL PRIMERO", time: "12 HS" },
  { key: "Matutina", label: "MATUTINA", time: "15 HS" },
  { key: "Vespertina", label: "VESPERTINA", time: "18 HS" },
  {
    key: "Nocturna",
    label: "NOCTURNA",
    time: "ANOCHE 21 HS",
    isNocturna: true,
  },
];

const provincias = [
  { key: "Provincia", label: "Provincia" },
  { key: "Ciudad", label: "Ciudad" },
  { key: "Cordoba", label: "Córdoba" },
  { key: "Santa Fe", label: "Santa Fé" },
  { key: "Entre Rios", label: "Entre Ríos" },
  { key: "Montevideo", label: "Montevideo" },
];

export function QuinielaTable({
  data,
  loading,
  nocturnasAyer,
  visibleHorarios,
}: QuinielaTableProps) {
  // Obtener numero para un horario y provincia
  const getNumero = (provincia: string, horario: string): string => {
    // La columna NOCTURNA siempre muestra los numeros de AYER
    // Para Montevideo se guarda su Vespertina de ayer en nocturnasAyer
    if (horario === "Nocturna") {
      if (nocturnasAyer[provincia]) {
        return nocturnasAyer[provincia] || "----";
      }
      return "----";
    }

    // Para otros horarios, verificar si ya deberia estar visible
    if (!visibleHorarios.includes(horario)) {
      return "----";
    }

    if (!data?.sorteos?.[provincia]?.[horario]) return "----";
    return data.sorteos[provincia][horario] || "----";
  };

  // Determinar si mostrar la celda
  // Montevideo: no tiene Previa, Primera ni Vespertina del dia (solo Matutina de hoy + Nocturna de ayer)
  const shouldShowCell = (provincia: string, horario: string): boolean => {
    if (provincia === "Montevideo") {
      // Montevideo solo muestra Matutina (de hoy) y Nocturna (vespertina de ayer)
      return horario === "Matutina" || horario === "Nocturna";
    }
    return true;
  };

  // Obtener color de fondo para cada provincia/horario
  const getCellColor = (
    provincia: string,
    horario: string,
    isEmpty: boolean
  ): string => {
    if (isEmpty) {
      // Celdas vacías oscuras
      return "bg-slate-700/40";
    }

    if (provincia === "Montevideo") {
      // Montevideo en verde oscuro acorde al grillo
      return "bg-emerald-700/90";
    }

    if (horario === "Nocturna") {
      // Nocturna en azul verdoso oscuro
      return "bg-cyan-700/80";
    }

    // Resto en verde lima oscuro acorde al grillo
    return "bg-[#7fb11a]/90";
  };

  return (
    <div className="w-full flex-1 grid grid-rows-[auto_1fr]">
      {/* Header row */}
      <div className="grid grid-cols-5">
        {horarios.map((horario, index) => (
          <div
            key={horario.key}
            className={`px-2 py-2 text-white font-black text-xs md:text-sm border-2 border-slate-600 text-center ${
              index === 4 ? "bg-blue-700" : "bg-emerald-600"
            } ${index === 0 ? "rounded-tl-2xl" : ""} ${
              index === 4 ? "rounded-tr-2xl" : ""
            }`}
          >
            <div className="font-black text-base md:text-2xl">
              {horario.label}
            </div>
            <div className="text-lg font-bold text-blue-100">
              {horario.time}
            </div>
          </div>
        ))}
      </div>

      {/* Data rows */}
      <div className="grid grid-rows-6">
        {provincias.map((provincia) => (
          <div key={provincia.key} className="grid grid-cols-5">
            {horarios.map((horario) => {
              const showCell = shouldShowCell(provincia.key, horario.key);

              if (!showCell) {
                return (
                  <div
                    key={horario.key}
                    className="border-2 border-slate-600 bg-slate-700/20"
                  />
                );
              }

              const numero = getNumero(provincia.key, horario.key);
              const isEmpty = numero === "----";
              const cellColor = getCellColor(
                provincia.key,
                horario.key,
                isEmpty
              );

              return (
                <div
                  key={horario.key}
                  className={`border-2 border-slate-600 px-2 py-2 ${cellColor} hover:opacity-90 transition-opacity flex flex-col items-center justify-center text-center`}
                >
                  <div className="text-base md:text-2xl font-bold text-white mb-1 drop-shadow">
                    {provincia.label}
                  </div>
                  <div
                    className={`text-5xl font-black drop-shadow-lg ${
                      loading ? "animate-pulse text-slate-400" : "text-white"
                    }`}
                  >
                    {loading ? "----" : numero}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
