export function stripBom(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function smartSplitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): string[][] {
  const lines = stripBom(text).split(/\r?\n/).filter((l) => l.trim().length > 0 && !l.trim().startsWith("#"));
  if (lines.length === 0) return [];
  const header = lines[0]!;
  const hasComma = header.includes(",");
  const hasTab = header.includes("\t");
  const hasSemicolon = header.includes(";");
  const hasWhitespaceCols = !hasComma && !hasTab && !hasSemicolon && /\S+\s+\S+/.test(header);
  if (hasComma) return lines.map((l) => smartSplitCsv(l));
  const split = (line: string) => {
    if (hasTab) return line.split("\t").map((s) => s.trim());
    if (hasSemicolon) return line.split(";").map((s) => s.trim());
    if (hasWhitespaceCols) return line.trim().split(/\s+/);
    // fall back to comma behavior
    return smartSplitCsv(line);
  };
  return lines.map((l) => split(l));
}

export function toDecimalString(v: string | number | null | undefined): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return String(v);
  const cleaned = v.replace(/,/g, "").trim();
  if (cleaned === "") return undefined;
  if (!/^[-+]?\d*(?:\.\d+)?$/.test(cleaned)) return undefined;
  return cleaned;
}
