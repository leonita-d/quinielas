import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

/* =========================
   TYPES
========================= */

// Internal keys used during parsing
type ProvinciaKeyInternal =
  | "provincia"
  | "ciudad"
  | "cordoba"
  | "santa_fe"
  | "entre_rios"
  | "montevideo";

type SorteoKeyInternal =
  | "previa"
  | "primero"
  | "matutina"
  | "vespertina"
  | "nocturna";

// Keys expected by the table component
type ProvinciaKeyTable =
  | "Provincia"
  | "Ciudad"
  | "Cordoba"
  | "Santa Fe"
  | "Entre Rios"
  | "Montevideo";

type SorteoKeyTable =
  | "Previa"
  | "Primera"
  | "Matutina"
  | "Vespertina"
  | "Nocturna";

// Response format expected by the table
interface QuinielaResponse {
  fecha: string;
  fechaAyer: string;
  consultado: string;
  sorteos: {
    [provincia in ProvinciaKeyTable]?: {
      [sorteo in SorteoKeyTable]?: string | null;
    };
  };
  nocturnasAyer: {
    [provincia in ProvinciaKeyTable]?: string | null;
  };
}

/* =========================
   URLS
========================= */

const URL_HOY = "https://www.jugandoonline.com.ar/rHome.aspx";
const URL_AYER = "https://www.jugandoonline.com.ar/rHome2-Ayer.aspx";

/* =========================
   MAPPINGS
========================= */

// Maps CSS class in HTML to internal key (for today's page)
const PROVINCIA_CLASS_MAP: Record<string, ProvinciaKeyInternal> = {
  Ciudad: "ciudad",
  ProvBsAs: "provincia",
  SantaFe: "santa_fe",
  Cordoba: "cordoba",
  EntreRios: "entre_rios",
  Montevideo: "montevideo",
};

// Maps div ID suffix to internal key (for yesterday's page which uses different structure)
const PROVINCIA_ID_MAP: Record<string, ProvinciaKeyInternal> = {
  Ciudad: "ciudad",
  ProvBsAs: "provincia",
  SantaFe: "santa_fe",
  Cordoba: "cordoba",
  EntreRios: "entre_rios",
  Montevideo: "montevideo",
};

// Maps internal key to table key (for provincia)
const PROVINCIA_TO_TABLE: Record<ProvinciaKeyInternal, ProvinciaKeyTable> = {
  provincia: "Provincia",
  ciudad: "Ciudad",
  cordoba: "Cordoba",
  santa_fe: "Santa Fe",
  entre_rios: "Entre Rios",
  montevideo: "Montevideo",
};

// Maps internal key to table key (for sorteo)
const SORTEO_TO_TABLE: Record<SorteoKeyInternal, SorteoKeyTable> = {
  previa: "Previa",
  primero: "Primera",
  matutina: "Matutina",
  vespertina: "Vespertina",
  nocturna: "Nocturna",
};

// Order of sorteos as they appear in HTML
const SORTEO_ORDER: SorteoKeyInternal[] = [
  "previa",
  "primero",
  "matutina",
  "vespertina",
  "nocturna",
];

/* =========================
   HELPER FUNCTIONS
========================= */

function getArgentinaTime(): Date {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
}

function getFechaString(date: Date): string {
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

  const diaSemana = dias[date.getDay()];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];

  return `${diaSemana} ${dia} de ${mes}`;
}

function getConsultadoString(): string {
  const now = getArgentinaTime();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes} hs`;
}

/* =========================
   FETCH HTML
========================= */

async function fetchHTML(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
    });

    return await res.text();
  } catch (e) {
    console.error("Fetch error:", url, e);
    return null;
  }
}

/* =========================
   PARSER - Internal format
========================= */

type ParsedData = {
  [sorteo in SorteoKeyInternal]: {
    [provincia in ProvinciaKeyInternal]?: string;
  };
};

function emptyParsedData(): ParsedData {
  return {
    previa: {},
    primero: {},
    matutina: {},
    vespertina: {},
    nocturna: {},
  };
}

// Extract numbers from a container element
function extractNumbersFromContainer(
  $: cheerio.CheerioAPI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  container: any,
  data: ParsedData,
  provinciaKey: ProvinciaKeyInternal
): void {
  // Find the desktop section which has class "quinielas2021-desktop"
  const desktopSection = container.find(".quinielas2021-desktop");

  if (desktopSection.length === 0) return;

  // Get all numbers from spans with class "no-enlaces-numeros"
  const numberSpans = desktopSection.find(".no-enlaces-numeros");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  numberSpans.each(function (index: number, elem: any) {
    const text = $(elem).text().trim();

    // Only process valid 4-digit numbers, skip "----" or other placeholders
    if (/^\d{4}$/.test(text) && index < SORTEO_ORDER.length) {
      const sorteo = SORTEO_ORDER[index];
      data[sorteo][provinciaKey] = text;
    }
  });
}

// Parse today's page (uses class-based selectors)
function parseHoyPage(html: string | null): ParsedData {
  const data = emptyParsedData();

  if (!html) return data;

  const $ = cheerio.load(html);

  // For each provincia, find its container by class and extract numbers
  for (const [className, provinciaKey] of Object.entries(PROVINCIA_CLASS_MAP)) {
    const container = $(`.container.${className}`);
    if (container.length > 0) {
      extractNumbersFromContainer($, container, data, provinciaKey);
    }
  }

  return data;
}

// Parse yesterday's page (uses ID-based selectors because all containers have class "Ciudad")
function parseAyerPage(html: string | null): ParsedData {
  const data = emptyParsedData();

  if (!html) return data;

  const $ = cheerio.load(html);

  // For each provincia, find its container by ID and extract numbers
  // IDs are like: MainContent_CabezasAyerCiudadDiv, MainContent_CabezasAyerProvBsAsDiv, etc.
  for (const [idSuffix, provinciaKey] of Object.entries(PROVINCIA_ID_MAP)) {
    const containerId = `MainContent_CabezasAyer${idSuffix}Div`;
    const container = $(`#${containerId}`);

    if (container.length > 0) {
      extractNumbersFromContainer($, container, data, provinciaKey);
    }
  }

  return data;
}

/* =========================
   TRANSFORM TO TABLE FORMAT
========================= */

function transformToTableFormat(
  dataHoy: ParsedData,
  dataAyer: ParsedData
): QuinielaResponse {
  const now = getArgentinaTime();
  const ayer = new Date(now);
  ayer.setDate(ayer.getDate() - 1);

  const result: QuinielaResponse = {
    fecha: getFechaString(now),
    fechaAyer: getFechaString(ayer),
    consultado: getConsultadoString(),
    sorteos: {},
    nocturnasAyer: {},
  };

  // Initialize sorteos structure (provincia -> sorteo)
  const provincias = Object.values(PROVINCIA_TO_TABLE);
  for (const provinciaTable of provincias) {
    result.sorteos[provinciaTable] = {};
  }

  // Fill sorteos with today's data
  for (const sorteoInternal of SORTEO_ORDER) {
    const sorteoTable = SORTEO_TO_TABLE[sorteoInternal];

    for (const [provinciaInternal, provinciaTable] of Object.entries(
      PROVINCIA_TO_TABLE
    )) {
      const value =
        dataHoy[sorteoInternal][provinciaInternal as ProvinciaKeyInternal];
      if (value) {
        result.sorteos[provinciaTable]![sorteoTable] = value;
      }
    }
  }

  // Fill nocturnasAyer with yesterday's nocturna data
  for (const [provinciaInternal, provinciaTable] of Object.entries(
    PROVINCIA_TO_TABLE
  )) {
    const value = dataAyer.nocturna[provinciaInternal as ProvinciaKeyInternal];
    if (value) {
      result.nocturnasAyer[provinciaTable] = value;
    }
  }

  return result;
}

/* =========================
   GET ROUTE
========================= */

export async function GET() {
  try {
    // Fetch HTML from both pages
    const [htmlHoy, htmlAyer] = await Promise.all([
      fetchHTML(URL_HOY),
      fetchHTML(URL_AYER),
    ]);

    // Parse pages with their specific parsers
    const dataHoy = parseHoyPage(htmlHoy);
    const dataAyer = parseAyerPage(htmlAyer);

    // Transform to the format expected by the table
    const response = transformToTableFormat(dataHoy, dataAyer);

    return NextResponse.json(response);
  } catch (e) {
    console.error(e);

    return NextResponse.json({ error: "Error quiniela" }, { status: 500 });
  }
}
