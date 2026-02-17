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
const URL_NOTITIMBA = "https://notitimba.com/lots/";

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

// Expected sorteo completion times (Argentina time) + 15-min grace period
// Previa ~10:15, Primero ~12:00, Matutina ~15:00, Vespertina ~18:00
const SORTEO_DEADLINE: Partial<
  Record<SorteoKeyInternal, { hours: number; minutes: number }>
> = {
  previa: { hours: 10, minutes: 30 },
  primero: { hours: 12, minutes: 15 },
  matutina: { hours: 15, minutes: 15 },
  vespertina: { hours: 18, minutes: 15 },
};

// AJAX endpoint for notitimba (v=1 forces the traditional results view)
const URL_NOTITIMBA_AJAX = `${URL_NOTITIMBA}cfms/aQsEq.php?v=1`;

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

// Two-step fetch for notitimba: first visit /lots/ to get session cookies,
// then call the AJAX endpoint which returns today's results HTML.
// The AJAX endpoint requires a valid session (returns error without cookies).
async function fetchNotitimbaData(): Promise<string | null> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
  };

  try {
    // Step 1: Visit the page to establish a session and get cookies
    const pageRes = await fetch(URL_NOTITIMBA, {
      cache: "no-store",
      headers,
    });

    const cookies = pageRes.headers.getSetCookie?.() ?? [];
    const cookieString = cookies.map((c) => c.split(";")[0]).join("; ");

    if (!cookieString) {
      console.warn("[Quiniela] No session cookies received from notitimba.");
    }

    // Step 2: Fetch the AJAX endpoint with session cookies
    // v=1 forces the traditional results view (instead of live "sorteo virtual")
    const ajaxRes = await fetch(URL_NOTITIMBA_AJAX, {
      cache: "no-store",
      headers: {
        ...headers,
        Accept: "*/*",
        Referer: URL_NOTITIMBA,
        Cookie: cookieString,
      },
    });

    const buffer = await ajaxRes.arrayBuffer();
    return new TextDecoder("iso-8859-1").decode(buffer);
  } catch (e) {
    console.error("[Quiniela] Fetch error (notitimba):", e);
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
   NOTITIMBA FALLBACK PARSER
========================= */

// Match province name from notitimba HTML to internal key (handles encoding edge cases)
function matchNotitimbaProvince(text: string): ProvinciaKeyInternal | null {
  const t = text.trim().toLowerCase();
  if (t.includes("ciudad")) return "ciudad";
  if (t.includes("provincia")) return "provincia";
  if (t.includes("santa fe")) return "santa_fe";
  if (t.includes("rdoba")) return "cordoba";
  if (t.includes("entre r")) return "entre_rios";
  if (t.includes("montevideo")) return "montevideo";
  return null;
}

// Check if a sorteo should have completed by now (past its time + 15-min grace)
function isSorteoPastDeadline(sorteo: SorteoKeyInternal): boolean {
  const deadline = SORTEO_DEADLINE[sorteo];
  if (!deadline) return false;

  const now = getArgentinaTime();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const deadlineMinutes = deadline.hours * 60 + deadline.minutes;

  return currentMinutes >= deadlineMinutes;
}

// Check if a sorteo is missing data for main provinces (Ciudad & Provincia)
function isSorteoMissingData(
  data: ParsedData,
  sorteo: SorteoKeyInternal
): boolean {
  const mainProvinces: ProvinciaKeyInternal[] = ["ciudad", "provincia"];
  return mainProvinces.every((p) => !data[sorteo][p]);
}

// Parse the notitimba AJAX response — it returns today's results inside
// <table class="qTbl"> elements. Columns match SORTEO_ORDER:
// PREVIA, PRIMERO, MATUTINA, VESPERTINA, NOCTURNA.
// Numbers live in <div class="qTDc">NUMBER</div>; empty cells use class "qTD".
function parseNotitimbaResponse(
  html: string | null,
  sorteosNeeded: SorteoKeyInternal[]
): ParsedData {
  const data = emptyParsedData();
  if (!html) return data;

  const $ = cheerio.load(html);

  $("table.qTbl").each((_, table) => {
    $(table)
      .find("tr")
      .each((_, row) => {
        const th = $(row).find("th").first();
        if (th.length === 0) return;

        const provinciaKey = matchNotitimbaProvince(th.text());
        if (!provinciaKey) return;

        // Each <td> corresponds to a sorteo column in order
        $(row)
          .find("td")
          .each((colIndex, cell) => {
            if (colIndex >= SORTEO_ORDER.length) return;
            const sorteo = SORTEO_ORDER[colIndex];
            if (!sorteosNeeded.includes(sorteo)) return;

            const numDiv = $(cell).find(".qTDc");
            if (numDiv.length > 0) {
              const text = numDiv.text().trim();
              if (/^\d{4}$/.test(text)) {
                data[sorteo][provinciaKey] = text;
              }
            }
          });
      });
  });

  return data;
}

// Merge fallback data into primary data — only fills in missing values
function mergeParsedData(
  primary: ParsedData,
  fallback: ParsedData
): ParsedData {
  const merged = emptyParsedData();

  for (const sorteo of SORTEO_ORDER) {
    merged[sorteo] = { ...primary[sorteo] };
    for (const [provincia, value] of Object.entries(fallback[sorteo])) {
      if (!merged[sorteo][provincia as ProvinciaKeyInternal] && value) {
        merged[sorteo][provincia as ProvinciaKeyInternal] = value;
      }
    }
  }

  return merged;
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
    let dataHoy = parseHoyPage(htmlHoy);
    const dataAyer = parseAyerPage(htmlAyer);

    // Determine which sorteos are past their deadline but missing from the primary source
    const sorteosToFallback: SorteoKeyInternal[] = (
      ["previa", "primero", "matutina", "vespertina"] as SorteoKeyInternal[]
    ).filter(
      (sorteo) =>
        isSorteoPastDeadline(sorteo) && isSorteoMissingData(dataHoy, sorteo)
    );

    // If any sorteos need fallback, try notitimba
    if (sorteosToFallback.length > 0) {
      console.log(
        `[Quiniela] Primary source missing data for: ${sorteosToFallback.join(
          ", "
        )}. Trying notitimba fallback...`
      );

      const htmlNotitimba = await fetchNotitimbaData();
      const dataFallback = parseNotitimbaResponse(
        htmlNotitimba,
        sorteosToFallback
      );
      dataHoy = mergeParsedData(dataHoy, dataFallback);

      const filledSorteos = sorteosToFallback.filter(
        (s) => Object.keys(dataFallback[s]).length > 0
      );
      if (filledSorteos.length > 0) {
        console.log(
          `[Quiniela] Notitimba fallback filled data for: ${filledSorteos.join(
            ", "
          )}`
        );
      } else {
        console.log(
          `[Quiniela] Notitimba fallback had no data for today either.`
        );
      }
    }

    // Transform to the format expected by the table
    const response = transformToTableFormat(dataHoy, dataAyer);

    return NextResponse.json(response);
  } catch (e) {
    console.error(e);

    return NextResponse.json({ error: "Error quiniela" }, { status: 500 });
  }
}
