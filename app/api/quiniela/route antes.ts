export async function GET() {
  try {
    const datos = await extraerQuiniela()
    
    return Response.json(datos)
  } catch (error) {
    return Response.json(
      {
        error: true,
        mensaje: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}

async function extraerQuiniela() {
  const urlHoy = "https://www.jugandoonline.com.ar/"
  const urlAyer = "https://www.jugandoonline.com.ar/rHome2-Ayer.aspx"
  
  // Extraer datos de HOY
  const respuestaHoy = await fetch(urlHoy, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  })
  const htmlHoy = await respuestaHoy.text()
  
  // Extraer datos de AYER
  const respuestaAyer = await fetch(urlAyer, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  })
  const htmlAyer = await respuestaAyer.text()
  
  // Extraer fecha del sorteo de hoy
  const regexFecha = /Sorteos del ([^<]+)/i
  const matchFecha = htmlHoy.match(regexFecha)
  const fechaSorteo = matchFecha ? matchFecha[1].trim() : "Fecha no encontrada"
  
  // Extraer fecha del sorteo de ayer
  const matchFechaAyer = htmlAyer.match(regexFecha)
  const fechaAyer = matchFechaAyer ? matchFechaAyer[1].trim() : "Fecha no encontrada"
  
  const resultado = {
    fecha: fechaSorteo,
    fechaAyer: fechaAyer,
    consultado: obtenerFechaActual(),
    sorteos: {} as { [key: string]: { [key: string]: string | null } },
    nocturnasAyer: {} as { [key: string]: string | null }
  }
  
  // Provincias argentinas (5 horarios cada una)
  const provinciasArgentinas = [
    "Ciudad",
    "Provincia",
    "Cordoba",
    "Santa Fe",
    "Entre Rios"
  ]
  
  const horariosCompletos = ["Previa", "Primera", "Matutina", "Vespertina", "Nocturna"]
  
  // ========== EXTRAER SORTEOS DE HOY ==========
  const regexNumerosHoy = /<a\s+class="enlaces-numeros"[^>]*>(\d{4}|----)<\/a>/gi
  const numerosHoy: (string | null)[] = []
  let match
  
  const regexNumerosHoyClone = /<a\s+class="enlaces-numeros"[^>]*>(\d{4}|----)<\/a>/gi
  while ((match = regexNumerosHoyClone.exec(htmlHoy)) !== null) {
    const numero = match[1]
    numerosHoy.push(numero === "----" ? null : numero)
  }
  
  console.log("Total de números encontrados HOY:", numerosHoy.length)
  console.log("Números HOY:", numerosHoy)
  
  let indiceHoy = 0
  
  // Provincias argentinas de hoy
  provinciasArgentinas.forEach(provincia => {
    resultado.sorteos[provincia] = {}
    horariosCompletos.forEach(horario => {
      if (indiceHoy < numerosHoy.length) {
        resultado.sorteos[provincia][horario] = numerosHoy[indiceHoy]
        indiceHoy++
      } else {
        resultado.sorteos[provincia][horario] = null
      }
    })
  })
  
  // Montevideo de hoy (tiene todos los 5 horarios como las otras provincias)
  resultado.sorteos["Montevideo"] = {}
  horariosCompletos.forEach(horario => {
    if (indiceHoy < numerosHoy.length) {
      resultado.sorteos["Montevideo"][horario] = numerosHoy[indiceHoy]
      indiceHoy++
    } else {
      resultado.sorteos["Montevideo"][horario] = null
    }
  })
  
  // ========== EXTRAER NOCTURNAS DE AYER ==========
  const numerosAyer: (string | null)[] = []
  
  const regexNumerosAyerClone = /<a\s+class="enlaces-numeros"[^>]*>(\d{4}|----)<\/a>/gi
  while ((match = regexNumerosAyerClone.exec(htmlAyer)) !== null) {
    const numero = match[1]
    numerosAyer.push(numero === "----" ? null : numero)
  }
  
  console.log("Total de números encontrados AYER:", numerosAyer.length)
  console.log("Números AYER:", numerosAyer)
  
  let indiceAyer = 0
  
  // Extraer todas las provincias (incluido Montevideo) del día anterior
  // Todas tienen 5 horarios
  const todasLasProvincias = [...provinciasArgentinas, "Montevideo"]
  
  todasLasProvincias.forEach(provincia => {
    resultado.nocturnasAyer[provincia] = null
    // Saltar Previa, Primera, Matutina, Vespertina (4 posiciones) para llegar a Nocturna
    const indiceNocturna = indiceAyer + 4
    if (indiceNocturna < numerosAyer.length) {
      resultado.nocturnasAyer[provincia] = numerosAyer[indiceNocturna]
    }
    indiceAyer += 5 // Avanzar 5 posiciones (todos los horarios de esta provincia)
  })
  
  return resultado
}

function obtenerFechaActual(): string {
  const ahora = new Date()
  const opciones: Intl.DateTimeFormatOptions = {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }
  return ahora.toLocaleString("es-AR", opciones)
}
