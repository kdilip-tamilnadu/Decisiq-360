import * as XLSX from 'xlsx';
import type { UploadedFileMetadata } from '../types/index.ts';

export interface ParsedSheetData {
  fileId: string;
  fileName: string;
  format: 'csv' | 'xlsx' | 'json';
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export function generateId(prefix = 'doc'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function parseUploadedFile(file: File): Promise<ParsedSheetData> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const fileId = generateId('file');

  if (extension === 'json') {
    const text = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`File "${file.name}" is not valid JSON.`);
    }

    let records: Record<string, any>[] = [];
    if (Array.isArray(parsed)) {
      records = parsed;
    } else if (parsed && typeof parsed === 'object') {
      // Find the first array property (e.g. { data: [...], records: [...] })
      const firstArrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
      if (firstArrayKey) {
        records = parsed[firstArrayKey];
      } else {
        records = [parsed];
      }
    }

    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    return {
      fileId,
      fileName: file.name,
      format: 'json',
      headers,
      rows: records,
      totalRows: records.length,
    };
  }

  if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error(`The workbook "${file.name}" contains no sheets.`);
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      throw new Error(`File "${file.name}" appears to be empty.`);
    }

    const headers = Object.keys(rawRows[0] || {});
    return {
      fileId,
      fileName: file.name,
      format: extension === 'csv' ? 'csv' : 'xlsx',
      headers,
      rows: rawRows,
      totalRows: rawRows.length,
    };
  }

  throw new Error(`Unsupported file format ".${extension}". Please upload CSV, XLSX, or JSON.`);
}

/**
 * Intelligent Canonical Column Matcher
 * Maps varying real-world naming conventions into canonical keys without guessing.
 */
export function findMatchingField(
  availableKeys: string[],
  aliases: string[]
): string | undefined {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanAliases = aliases.map(clean);

  for (const key of availableKeys) {
    const cleanedKey = clean(key);
    if (cleanAliases.includes(cleanedKey)) {
      return key;
    }
  }

  // Fallback: substring contains
  for (const key of availableKeys) {
    const cleanedKey = clean(key);
    for (const alias of cleanAliases) {
      if (cleanedKey.includes(alias) || alias.includes(cleanedKey)) {
        return key;
      }
    }
  }

  return undefined;
}

/**
 * Parse numeric monetary amount safely, stripping '$', commas, spaces, etc.
 */
export function parseNumberField(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const str = String(val).replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

/**
 * Normalize date strings into YYYY-MM-DD
 */
export function normalizeDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
}
