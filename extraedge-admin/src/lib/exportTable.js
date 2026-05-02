// Tiny client-side table exporter — no library.
// Generates either a plain CSV or an Excel XML 2003 spreadsheet (.xls). Both
// open in Excel / Numbers / Google Sheets without prompts.

const escapeXml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const escapeCsv = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// columns: [{ key, label, get? }]   get(row) returns the cell value (string|number|Date)
// rows:    array of plain objects
export const downloadCsv = (filename, columns, rows) => {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.get ? c.get(r) : r[c.key];
      if (v instanceof Date) return escapeCsv(v.toISOString());
      return escapeCsv(v);
    }).join(','),
  ).join('\n');
  // BOM so Excel detects UTF-8 correctly with special characters.
  const csv = '﻿' + header + '\n' + body;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
};

// SpreadsheetML / Excel XML 2003 — opens directly in Excel as a real workbook.
export const downloadXls = (filename, sheetName, columns, rows) => {
  const cell = (v, type) => {
    if (v === null || v === undefined) return '<Cell><Data ss:Type="String"></Data></Cell>';
    if (v instanceof Date) {
      return `<Cell ss:StyleID="sDate"><Data ss:Type="DateTime">${v.toISOString().replace(/\.\d+Z$/, '')}</Data></Cell>`;
    }
    if (typeof v === 'number') return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
    return `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
  };
  const headerRow = `<Row>${columns.map((c) =>
    `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(c.label)}</Data></Cell>`,
  ).join('')}</Row>`;
  const bodyRows = rows.map((r) =>
    `<Row>${columns.map((c) => cell(c.get ? c.get(r) : r[c.key])).join('')}</Row>`,
  ).join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="sHeader"><Font ss:Bold="1"/><Interior ss:Color="#FDF3ED" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sDate"><NumberFormat ss:Format="yyyy-mm-dd hh:mm:ss"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName || 'Sheet1')}">
  <Table>${headerRow}${bodyRows}</Table>
 </Worksheet>
</Workbook>`;
  downloadBlob(
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }),
    filename,
  );
};
