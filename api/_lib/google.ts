import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * Lee una variable de entorno o lanza error si falta.
 * @param key - Nombre de la variable de entorno.
 * @returns Valor de la variable.
 * @throws {Error} Si la variable no está definida.
 */
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

let authClient: InstanceType<typeof google.auth.JWT> | null = null;

/**
 * Obtiene (o crea) el cliente JWT para autenticación con Google APIs.
 * Usa GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY del entorno.
 * @returns Cliente JWT de Google Auth.
 */
export function getAuth() {
  if (authClient) return authClient;

  const auth = new google.auth.JWT({
    email: requireEnv('GOOGLE_CLIENT_EMAIL'),
    key: requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  authClient = auth;
  return auth;
}

/**
 * Obtiene el cliente de la API de Google Sheets (v4).
 * @returns Cliente sheets de Google APIs.
 */
export function getSheets() {
  return google.sheets({ version: 'v4' as const, auth: getAuth() });
}

/**
 * Mapa de nombres lógicos a IDs reales de spreadsheets en Google Sheets.
 * Cada valor se obtiene de una variable de entorno distinta.
 */
export const SPREADSHEETS: Record<string, string> = {
  produccion_cuncia: requireEnv('SPREADSHEET_PRODUCCION_CUNCIA'),
  produccion_acacias: requireEnv('SPREADSHEET_PRODUCCION_ACACIAS'),
  mantenimiento_acacias: requireEnv('SPREADSHEET_MANTENIMIENTO_ACACIAS'),
  mantenimiento_cuncia: requireEnv('SPREADSHEET_MANTENIMIENTO_CUNCIA'),
  ordenes_ot_cuncia: requireEnv('SPREADSHEET_ORDENES_OT_CUNCIA'),
  ordenes_ot_acacias: requireEnv('SPREADSHEET_ORDENES_OT_ACACIAS'),
  maestro_cuncia: requireEnv('SPREADSHEET_MAESTRO_CUNCIA'),
  maestro_acacias: requireEnv('SPREADSHEET_MAESTRO_ACACIAS'),
  produccion_concretos: requireEnv('SPREADSHEET_PRODUCCION_CONCRETOS'),
  ordenes_ot_concretos: requireEnv('SPREADSHEET_ORDENES_OT_CONCRETOS'),
  maestro_concretos: requireEnv('SPREADSHEET_MAESTRO_CONCRETOS'),
};
