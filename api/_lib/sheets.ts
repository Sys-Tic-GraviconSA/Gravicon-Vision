import { getSheets, SPREADSHEETS } from './google.js';

/** TTL del caché en milisegundos (5 min). */
const cacheTTL = 300_000
/** Máximo de entradas en el caché antes de purgar las más viejas. */
const MAX_CACHE_SIZE = 100
/** Caché simple con soporte de revalidación (stale-while-revalidate). */
const cache = new Map<string, { data: unknown; ts: number; promise: Promise<unknown> | null }>()

/**
 * Purga las entradas más antiguas si el caché supera MAX_CACHE_SIZE.
 */
function trimCache() {
  if (cache.size <= MAX_CACHE_SIZE) return
  const entries = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)
  const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE)
  for (const [key] of toDelete) cache.delete(key)
}

/**
 * Cache con patrón stale-while-revalidate: sirve datos viejos mientras refresca en segundo plano.
 * @param cacheKey - Clave única para el caché.
 * @param fn - Función asíncrona que obtiene los datos frescos.
 * @returns Datos cacheados (frescos o viejos).
 */
async function withCache<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(cacheKey)
  const now = Date.now()

  if (entry && now - entry.ts < cacheTTL) {
    return entry.data as T
  }

  if (entry && entry.data !== undefined) {
    if (!entry.promise) {
      entry.promise = fn()
        .then(data => {
          cache.set(cacheKey, { data, ts: Date.now(), promise: null })
          return data
        })
        .catch(err => {
          console.error(`[sheets-cache:${cacheKey}]`, err)
          entry.promise = null
        })
    }
    return entry.data as T
  }

  if (entry?.promise) {
    return entry.promise as unknown as Promise<T>
  }

  const promise = fn()
    .then(data => {
      cache.set(cacheKey, { data, ts: Date.now(), promise: null })
      trimCache()
      return data
    })
    .catch(err => {
      cache.delete(cacheKey)
      throw err
    })
  cache.set(cacheKey, { data: undefined, ts: 0, promise: promise as unknown as Promise<unknown> })
  return promise
}

interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'date' | 'text' | 'percentage' | 'currency';
  sampleValues: (string | number | null)[];
  nullCount: number;
  uniqueCount: number;
}

interface SheetAnalysis {
  name: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  columns: ColumnAnalysis[];
  sampleRows: Record<string, unknown>[];
}

interface SpreadsheetAnalysis {
  id: string;
  name: string;
  sheets: SheetAnalysis[];
  detectedMetrics: { column: string; sheet: string; type: string }[];
  detectedDates: { column: string; sheet: string }[];
  detectedRelationships: { source: string; target: string; type: string }[];
}

function detectType(values: (string | null)[]): ColumnAnalysis['type'] {
  const nonNull = values.filter((v) => v !== null && v !== '');

  if (nonNull.length === 0) return 'text';

  const numericCount = nonNull.filter((v) => !isNaN(Number(v)) && v !== '').length;
  const dateCount = nonNull.filter((v) => {
    if (typeof v !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{2}\/\d{2}\/\d{4}/.test(v);
  }).length;

  if (numericCount > nonNull.length * 0.7) {
    if (nonNull.some((v) => String(v).includes('$') || String(v).includes('%'))) {
      return String(nonNull.find((v) => String(v).includes('%'))) ? 'percentage' : 'currency';
    }
    return 'numeric';
  }
  if (dateCount > nonNull.length * 0.7) return 'date';
  return 'text';
}

async function _fetchAnalyzeSpreadsheet(key: string, id: string): Promise<SpreadsheetAnalysis> {
  const sheetsApi = getSheets();
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: id });
  const sheetEntries = meta.data.sheets ?? [];
  const sheets: SheetAnalysis[] = [];

  for (const s of sheetEntries) {
    const title = s.properties?.title ?? '';
    const result = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: id,
      range: title,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = result.data.values ?? [];
    if (rows.length < 2) {
      sheets.push({ name: title, rowCount: 0, columnCount: 0, headers: [], columns: [], sampleRows: [] });
      continue;
    }

    const headers = rows[0].map((h) => String(h ?? ''));
    const dataRows = rows.slice(1);
    const sampleRows = dataRows.slice(0, 5).map((r) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        const val = r[i];
        obj[h] = val == null || val === '' ? null : val;
      });
      return obj;
    });

    const columns: ColumnAnalysis[] = headers.map((h, ci) => {
      const values = dataRows.map((r) => (r[ci] !== undefined ? String(r[ci]) : null));
      const type = detectType(values);
      const nullCount = values.filter((v) => v === null || v === '').length;
      const uniqueCount = new Set(values.filter((v) => v !== null && v !== '')).size;
      const sampleValues = values.slice(0, 3).map((v) => {
        if (v === null || v === '') return null;
        const n = Number(v);
        return isNaN(n) ? v : n;
      });
      return { name: h, type, sampleValues, nullCount, uniqueCount };
    });

    sheets.push({
      name: title,
      rowCount: dataRows.length,
      columnCount: headers.length,
      headers,
      columns,
      sampleRows,
    });
  }

  const detectedMetrics: SpreadsheetAnalysis['detectedMetrics'] = [];
  const detectedDates: SpreadsheetAnalysis['detectedDates'] = [];

  for (const sheet of sheets) {
    for (const col of sheet.columns) {
      if (col.type === 'numeric' || col.type === 'percentage' || col.type === 'currency') {
        detectedMetrics.push({ column: col.name, sheet: sheet.name, type: col.type });
      }
      if (col.type === 'date') {
        detectedDates.push({ column: col.name, sheet: sheet.name });
      }
    }
  }

  const possibleRelationships: SpreadsheetAnalysis['detectedRelationships'] = [];
  const allNames = sheets.map((s) => s.name);

  for (const sheet of sheets) {
    for (const col of sheet.columns) {
      const match = allNames.find((n) =>
        n.toLowerCase() !== sheet.name.toLowerCase() &&
        (col.name.toLowerCase().includes(n.toLowerCase().slice(0, 4)) ||
         n.toLowerCase().includes(col.name.toLowerCase()))
      );
      if (match) {
        possibleRelationships.push({
          source: `${sheet.name}.${col.name}`,
          target: match,
          type: 'many-to-one',
        });
      }
    }
  }

  return {
    id,
    name: meta.data.properties?.title ?? key,
    sheets,
    detectedMetrics,
    detectedDates,
    detectedRelationships: possibleRelationships,
  };
}

/**
 * Obtiene el análisis completo de un spreadsheet (con caché stale-while-revalidate).
 * @param key - Clave interna del spreadsheet.
 * @param id - ID real del spreadsheet.
 * @returns Análisis del spreadsheet.
 */
export async function analyzeSpreadsheet(key: string, id: string): Promise<SpreadsheetAnalysis> {
  return withCache(`analyze:${key}`, () => _fetchAnalyzeSpreadsheet(key, id))
}

async function _fetchAnalyzeAll(): Promise<SpreadsheetAnalysis[]> {
  const results: SpreadsheetAnalysis[] = [];
  for (const [key, id] of Object.entries(SPREADSHEETS)) {
    console.log(`Analyzing ${key}...`);
    const analysis = await analyzeSpreadsheet(key, id);
    results.push(analysis);
  }
  return results;
}

/**
 * Obtiene el análisis de todos los spreadsheets registrados (con caché).
 * @returns Lista completa de análisis.
 */
export async function analyzeAll(): Promise<SpreadsheetAnalysis[]> {
  return withCache('analyze:__all__', _fetchAnalyzeAll)
}

/**
 * Normaliza un string para comparación insensible a tildes y mayúsculas.
 * @param str - String a normalizar.
 * @returns String normalizado en minúsculas sin tildes ni espacios extra.
 */
function normalizeString(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Obtiene el título real de una hoja por su nombre (insensible a tildes/mayúsculas).
 * @param spreadsheetId - ID del spreadsheet.
 * @param name - Nombre a buscar.
 */
async function getSheetTitleByName(spreadsheetId: string, name: string): Promise<string | null> {
  const sheetsApi = getSheets();
  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(title))',
  });

  const target = normalizeString(name);
  const sheet = meta.data.sheets?.find((s) => {
    const title = s.properties?.title ?? '';
    return normalizeString(title) === target;
  });

  return sheet?.properties?.title ?? null;
}

/**
 * Obtiene los datos de una hoja específica desde Google Sheets API.
 * @param key - Clave interna del spreadsheet.
 * @param sheetName - Nombre de la hoja (opcional).
 * @returns Headers, filas como objetos y total.
 */
async function _fetchSheetData(key: string, sheetName?: string) {
  const id = SPREADSHEETS[key];
  if (!id) throw new Error(`Unknown spreadsheet key: ${key}`);

  const sheetsApi = getSheets();
  let range: string | undefined = undefined;

  if (sheetName) {
    const matchedTitle = await getSheetTitleByName(id, sheetName);
    if (matchedTitle === null) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet ${key}`);
    }
    range = `'${matchedTitle}'!A:ZZ`;
  }

  const result = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: id,
    range: range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });

  const rows = result.data.values ?? [];
  if (rows.length < 2) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => String(h ?? ''));
  const dataRows = rows.slice(1).map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const val = r[i];
      obj[h] = val == null || val === '' ? null : val;
    });
    return obj;
  });

  return { headers, rows: dataRows, total: dataRows.length };
}

export async function getSheetData(key: string, sheetName?: string, forceRefresh = false) {
  const cacheKey = `data:${key}:${sheetName || ''}`
  if (forceRefresh) {
    cache.delete(cacheKey)
  }
  return withCache(cacheKey, () => _fetchSheetData(key, sheetName))
}

/**
 * Obtiene los metadatos de un spreadsheet desde Google Sheets API.
 * @param key - Clave interna del spreadsheet.
 * @returns Lista de hojas con id, título, filas y columnas.
 */
async function _fetchSpreadsheetMeta(key: string) {
  const id = SPREADSHEETS[key];
  const sheetsApi = getSheets();
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: id });
  return meta.data.sheets?.map((s) => ({
    id: s.properties?.sheetId,
    title: s.properties?.title,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  })) ?? [];
}

export async function getSpreadsheetMeta(key: string) {
  return withCache(`meta:${key}`, () => _fetchSpreadsheetMeta(key))
}
