const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/**
 * Script to create Excel template files for bulk upload
 */

const templatesDir = path.join(process.cwd(), "apps", "web", "public", "templates");

// Ensure templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// PNL Template
const pnlData = [
  { date: "2025-01-02", realized: 1200, unrealized: -50, totalEquity: 150000, note: "First week note" },
  { date: "2025-01-03", realized: -200, unrealized: 0, totalEquity: 149800, note: "" },
];

const pnlWorksheet = XLSX.utils.json_to_sheet(pnlData);
const pnlWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(pnlWorkbook, pnlWorksheet, "Daily PNL");
XLSX.writeFile(pnlWorkbook, path.join(templatesDir, "pnl_template.xlsx"));
console.log("✓ Created pnl_template.xlsx");

// NAV Template
const navData = [
  { date: "2025-01", nav: 100000 },
  { date: "2025-02", nav: 101250 },
];

const navWorksheet = XLSX.utils.json_to_sheet(navData);
const navWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(navWorkbook, navWorksheet, "Monthly NAV");
XLSX.writeFile(navWorkbook, path.join(templatesDir, "nav_monthly_template.xlsx"));
console.log("✓ Created nav_monthly_template.xlsx");

// Journal Template
const journalData = [
  { date: "2025-01-02", text: "Execution focus", tags: "process,execution" },
  { date: "2025-01-03", text: "Review losers", tags: "postmortem" },
];

const journalWorksheet = XLSX.utils.json_to_sheet(journalData);
const journalWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(journalWorkbook, journalWorksheet, "Journal");
XLSX.writeFile(journalWorkbook, path.join(templatesDir, "journal_template.xlsx"));
console.log("✓ Created journal_template.xlsx");

console.log("\nAll Excel templates created successfully!");
