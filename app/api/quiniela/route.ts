import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

/* =========================
   TYPES
========================= */

type ProvinciaKey =
  | "provincia"
  | "ciudad"
  | "cordoba"
  | "santa_fe"
  | "entre_rios"
  | "montevideo"

type SorteoNombre =
  | "previa"
  | "primero"
  | "matutina"
  | "vespertina"
  | "nocturna"

type SorteoData = {
  [K in ProvinciaKey]?: string
}

type QuinielaResponse = {
  [K in SorteoNombre]: SorteoData
}

/* =========================
   URLS NUEVAS
========================= */

const URLS = {
  provincia: "http://quinielabuenosaires.ruta1000.com.ar/",
  ciudad: "https://quinieladelaciudad.ruta1000.com.ar/",
  cordoba: "https://quinielacordoba.ruta1000.com.ar/",
  santa_fe: "https://quinielasantafe.ruta1000.com.ar/",
  entre_rios: "https://quinielaentrerios.ruta1000.com.ar/",
  montevideo: "https://www.jugandoonline.com.ar/rHome.aspx",
}

/* =========================
   CREAR OBJ VACIO
========================= */

function emptyResponse(): QuinielaResponse {
  return {
    previa: {},
    primero: {},
    matutina: {},
    vespertina: {},
    nocturna: {},
  }
}

/* =========================
   FETCH HTML
========================= */

async function fetchHTML(url: string) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    return await res.text()
  } catch (e) {
    console.error("Fetch error:", url, e)
    return null
  }
}

/* =========================
   PARSER RUTA1000
========================= */

function parseRuta1000(html: string | null) {

  const resultado = {
    previa: "",
    primero: "",
    matutina: "",
    vespertina: "",
    nocturna: "",
  }

  if (!html) return resultado

  const $ = cheerio.load(html)
  const texto = $("body").text().toLowerCase()

  // Regex ultra tolerante
  const getNumero = (label: string) => {
    const r = new RegExp(label + ".*?(\\d{4})", "i")
    const m = texto.match(r)
    return m ? m[1] : ""
  }

  resultado.previa = getNumero("previa")
  resultado.primero = getNumero("primera") // IMPORTANTE → Primera
  resultado.matutina = getNumero("matutina")
  resultado.vespertina = getNumero("vespertina")
  resultado.nocturna = getNumero("nocturna")

  return resultado
}

/* =========================
   PARSER MONTEVIDEO
========================= */

function parseMontevideo(html: string | null) {

  const resultado = {
    matutina: "",
    nocturna: "",
  }

  if (!html) return resultado

  const $ = cheerio.load(html)
  const texto = $("body").text().toLowerCase()

  const getNumero = (label: string) => {
    const r = new RegExp(label + ".*?(\\d{4})", "i")
    const m = texto.match(r)
    return m ? m[1] : ""
  }

  resultado.matutina = getNumero("matutina")
  resultado.nocturna = getNumero("nocturna")

  return resultado
}

/* =========================
   GET ROUTE
========================= */

export async function GET() {
  try {

    const data = emptyResponse()

    const [
      htmlBA,
      htmlCiudad,
      htmlCordoba,
      htmlSantaFe,
      htmlER,
      htmlMontevideo,
    ] = await Promise.all([
      fetchHTML(URLS.provincia),
      fetchHTML(URLS.ciudad),
      fetchHTML(URLS.cordoba),
      fetchHTML(URLS.santa_fe),
      fetchHTML(URLS.entre_rios),
      fetchHTML(URLS.montevideo),
    ])

    /* ===== RUTA1000 ===== */

    const ba = parseRuta1000(htmlBA)
    const ciudad = parseRuta1000(htmlCiudad)
    const cordoba = parseRuta1000(htmlCordoba)
    const santaFe = parseRuta1000(htmlSantaFe)
    const er = parseRuta1000(htmlER)

    ;(["previa","primero","matutina","vespertina","nocturna"] as SorteoNombre[])
      .forEach((sorteo) => {

        data[sorteo].provincia = ba[sorteo]
        data[sorteo].ciudad = ciudad[sorteo]
        data[sorteo].cordoba = cordoba[sorteo]
        data[sorteo].santa_fe = santaFe[sorteo]
        data[sorteo].entre_rios = er[sorteo]

      })

    /* ===== MONTEVIDEO ===== */

    const monte = parseMontevideo(htmlMontevideo)

    data.matutina.montevideo = monte.matutina
    data.nocturna.montevideo = monte.nocturna

    return NextResponse.json(data)

  } catch (e) {

    console.error(e)

    return NextResponse.json(
      { error: "Error quiniela" },
      { status: 500 }
    )
  }
}
