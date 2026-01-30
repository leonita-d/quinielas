"use client"

interface QuinielaData {
  fecha: string
  consultado: string
  sorteos: {
    [provincia: string]: {
      [horario: string]: string | null
    }
  }
}

interface QuinielaTableProps {
  data: QuinielaData | null
  loading: boolean
  nocturnasAyer: { [provincia: string]: string | null }
  visibleHorarios: string[]
}

const horarios = [
  { key: "Previa", label: "PREVIA", time: "10.15 HS" },
  { key: "Primera", label: "EL PRIMERO", time: "12 HS" },
  { key: "Matutina", label: "MATUTINA", time: "15 HS" },
  { key: "Vespertina", label: "VESPERTINA", time: "18 HS" },
  { key: "Nocturna", label: "NOCTURNA", time: "ANOCHE 21 HS", isNocturna: true },
]

const provincias = [
  { key: "Provincia", label: "Provincia" },
  { key: "Ciudad", label: "Ciudad" },
  { key: "Cordoba", label: "Córdoba" },
  { key: "Santa Fe", label: "Santa Fé" },
  { key: "Entre Rios", label: "Entre Ríos" },
  { key: "Montevideo", label: "Montevideo" },
]

export function QuinielaTable({ data, loading, nocturnasAyer, visibleHorarios }: QuinielaTableProps) {
  // Obtener numero para un horario y provincia
  const getNumero = (provincia: string, horario: string): string => {
    // La columna NOCTURNA siempre muestra los numeros de AYER
    // Para Montevideo se guarda su Vespertina de ayer en nocturnasAyer
    if (horario === "Nocturna") {
      if (nocturnasAyer[provincia]) {
        return nocturnasAyer[provincia] || "----"
      }
      return "----"
    }
    
    // Para otros horarios, verificar si ya deberia estar visible
    if (!visibleHorarios.includes(horario)) {
      return "----"
    }
    
    if (!data?.sorteos?.[provincia]?.[horario]) return "----"
    return data.sorteos[provincia][horario] || "----"
  }

  // Determinar si mostrar la celda
  // Montevideo: no tiene Previa, Primera ni Vespertina del dia (solo Matutina de hoy + Nocturna de ayer)
  const shouldShowCell = (provincia: string, horario: string): boolean => {
    if (provincia === "Montevideo") {
      // Montevideo solo muestra Matutina (de hoy) y Nocturna (vespertina de ayer)
      return horario === "Matutina" || horario === "Nocturna"
    }
    return true
  }

  // Obtener color de fondo para cada provincia/horario
  const getCellColor = (provincia: string, horario: string, isEmpty: boolean): string => {
    if (isEmpty) {
      // Celdas vacías oscuras
      return "bg-slate-700/40"
    }
    
    if (provincia === "Montevideo") {
      // Montevideo en verde oscuro acorde al grillo
      return "bg-emerald-700/90"
    }
    
    if (horario === "Nocturna") {
      // Nocturna en azul verdoso oscuro
      return "bg-cyan-700/80"
    }
    
    // Resto en verde lima oscuro acorde al grillo
    return "bg-[#7CB342]/80"
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr>
            {horarios.map((horario, index) => (
              <th
                key={horario.key}
                className={`px-3 py-4 text-white font-black text-xs md:text-sm border-2 border-slate-600 ${
                  index === 4 ? "bg-blue-700" : "bg-emerald-600"
                }`}
              >
                <div className="font-black text-xl md:text-2xl">{horario.label}</div>
                <div className="text-base md:text-lg font-bold mt-1 text-blue-100">
                  {horario.time}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {provincias.map((provincia) => (
            <tr key={provincia.key}>
              {horarios.map((horario) => {
                const showCell = shouldShowCell(provincia.key, horario.key)

                if (!showCell) {
                  return (
                    <td
                      key={horario.key}
                      className="border-2 border-slate-600 bg-slate-700/20"
                    />
                  )
                }

                const numero = getNumero(provincia.key, horario.key)
                const isEmpty = numero === "----"
                const cellColor = getCellColor(provincia.key, horario.key, isEmpty)
                
                return (
                  <td
                    key={horario.key}
                    className={`border-2 border-slate-600 px-3 py-5 ${cellColor} hover:opacity-90 transition-opacity`}
                  >
                    <div className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow">
                      {provincia.label}
                    </div>
                    <div
                      className={`text-4xl md:text-5xl font-black drop-shadow-lg ${
                        loading ? "animate-pulse text-slate-400" : "text-white"
                      }`}
                    >
                      {loading ? "----" : numero}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
