import * as cheerio from "cheerio"

export async function GET() {
  try {
    const datos = await ultraScraper()
    return Response.json(datos)
  } catch (error) {
    return Response.json(
      { error: true, mensaje: String(error) },
      { status: 500 }
    )
  }
}

async function ultraScraper() {

  const fuentes = [
    scrapJugandoOnline,
    scrapNotitimba
  ]

  const resultados = await Promise.allSettled(
    fuentes.map(f => f())
  )

  const validos = resultados
    .filter(r => r.status === "fulfilled")
    .map((r: any) => r.value)

  if (!validos.length) throw new Error("Todas las fuentes fallaron")

  // Elegir el que tenga más números cargados
  validos.sort((a, b) =>
    contarDatos(b.sorteos) - contarDatos(a.sorteos)
  )

  const elegido = validos[0]

  return {
    fuente: elegido.fuente,
    consultado: fechaAR(),
    sorteos: normalizarOrden(elegido.sorteos)
  }
}

//////////////////////////////
// SCRAPER 1 — JUGANDOONLINE
//////////////////////////////

async function scrapJugandoOnline() {

  const url = "https://www.jugandoonline.com.ar/rHome.aspx?_=" + Date.now()

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" }
  })

  const html = await res.text()
  const $ = cheerio.load(html)

  return {
    fuente: "JugandoOnline",
    sorteos: scrapTablasGenerico($)
  }
}

//////////////////////////////
// SCRAPER 2 — NOTITIMBA
//////////////////////////////

async function scrapNotitimba() {

  const url = "https://www.notitimba.com/loterias/index.php"

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" }
  })

  const html = await res.text()
  const $ = cheerio.load(html)

  return {
    fuente: "Notitimba",
    sorteos: scrapTablasGenerico($)
  }
}

//////////////////////////////
// SCRAPER GENERICO DOM
//////////////////////////////

function scrapTablasGenerico($: cheerio.CheerioAPI) {

  const provincias = [
    "Ciudad",
    "Provincia",
    "Santa Fe",
    "Cordoba",
    "Entre Rios",
    "Montevideo"
  ]

  const horarios = [
    "Previa",
    "Primera",
    "Matutina",
    "Vespertina",
    "Nocturna"
  ]

  const sorteos: any = {}

  provincias.forEach(p => {
    sorteos[p] = {}
    horarios.forEach(h => sorteos[p][h] = null)
  })

  $("table").each((_, tabla) => {

    const texto = $(tabla).text().toLowerCase()

    provincias.forEach(prov => {

      if (texto.includes(prov.toLowerCase())) {

        const nums: (string | null)[] = []

        $(tabla).find("a, td").each((_, el) => {

          const t = $(el).text().trim()

          if (/^\d{4}$/.test(t)) nums.push(t)
          if (t === "----") nums.push(null)

        })

        if (nums.length >= 5) {
          horarios.forEach((h, i) => {
            sorteos[prov][h] = nums[i] ?? null
          })
        }

      }

    })

  })

  return sorteos
}

//////////////////////////////
// NORMALIZAR ORDEN FINAL
//////////////////////////////

function normalizarOrden(s: any) {

  const orden = [
    "Ciudad",
    "Provincia",
    "Santa Fe",
    "Cordoba",
    "Entre Rios",
    "Montevideo"
  ]

  const out: any = {}
  orden.forEach(p => out[p] = s[p] || {})

  return out
}

//////////////////////////////
// UTILS
//////////////////////////////

function contarDatos(sorteos: any) {
  let total = 0
  Object.values(sorteos).forEach((prov: any) => {
    Object.values(prov).forEach(v => {
      if (v) total++
    })
  })
  return total
}

function fechaAR() {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date())
}
