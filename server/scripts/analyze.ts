import { analyzeAll } from '../../api/_lib/sheets.js';
import fs from 'node:fs';

/**
 * Script autónomo para analizar todos los spreadsheets registrados
 * y guardar los resultados en `analysis-result.json`.
 * Ejecutar con: npx tsx server/scripts/analyze.ts
 */
async function main() {
  console.log('=== ANALYZING ALL SPREADSHEETS ===\n');
  const results = await analyzeAll();

  for (const r of results) {
    console.log(`\n## ${r.name} (${r.id})`);
    console.log(`Sheets: ${r.sheets.length}`);

    for (const s of r.sheets) {
      console.log(`\n  Sheet: "${s.name}" - ${s.rowCount} rows x ${s.columnCount} cols`);
      console.log(`  Headers: ${s.headers.join(' | ')}`);
      console.log(`  Columns:`);
      for (const c of s.columns) {
        console.log(`    - ${c.name} (${c.type}) nulls=${c.nullCount} unique=${c.uniqueCount}`);
      }
      if (s.sampleRows.length > 0) {
        console.log(`  Sample:`);
        console.log(`    ${JSON.stringify(s.sampleRows[0], null, 4)}`);
      }
    }

    if (r.detectedMetrics.length > 0) {
      console.log(`\n  Detected Metrics:`);
      for (const m of r.detectedMetrics) {
        console.log(`    - ${m.column} (${m.sheet}) [${m.type}]`);
      }
    }

    if (r.detectedDates.length > 0) {
      console.log(`\n  Detected Dates:`);
      for (const d of r.detectedDates) {
        console.log(`    - ${d.column} (${d.sheet})`);
      }
    }

    if (r.detectedRelationships.length > 0) {
      console.log(`\n  Detected Relationships:`);
      for (const rel of r.detectedRelationships) {
        console.log(`    - ${rel.source} → ${rel.target} (${rel.type})`);
      }
    }
  }

  fs.writeFileSync('analysis-result.json', JSON.stringify(results, null, 2));
  console.log('\n\nFull results saved to analysis-result.json');
}

main().catch(console.error);
