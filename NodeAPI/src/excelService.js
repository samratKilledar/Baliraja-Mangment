// Reporting adapter point for XLSX export.
// Implement with exceljs when report downloads are required.

async function generateFeeReportXlsx(rows) {
  return { filename: 'fee-report.xlsx', rowCount: rows.length };
}

module.exports = { generateFeeReportXlsx };
