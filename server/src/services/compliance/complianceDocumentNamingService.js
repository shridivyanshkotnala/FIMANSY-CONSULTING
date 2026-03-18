const normalize = (value = "") => String(value || "").trim();

export const slugifyComplianceName = (value = "document") => {
  const v = normalize(value).toLowerCase();
  return (
    v
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "document"
  );
};

export const formatDueDateForName = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "unknown-date";
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const normalizeFinancialYear = (fy = "") => {
  const raw = normalize(fy);
  if (!raw) return "FY-unknown";

  const clean = raw
    .replace(/\s+/g, "")
    .replace(/\//g, "-")
    .replace(/^FY[-\s]?/i, "");

  const m = clean.match(/^(\d{4})[-]?((?:\d{2})|(?:\d{4}))$/);
  if (m) {
    const start = m[1];
    const endPart = m[2].length === 2 ? m[2] : m[2].slice(2);
    return `FY-${start}-${endPart}`;
  }

  return `FY-${clean.replace(/[^a-zA-Z0-9-]/g, "") || "unknown"}`;
};

export const extractExtension = (fileName = "") => {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0 || idx === fileName.length - 1) return ".pdf";
  const ext = fileName.slice(idx).toLowerCase();
  return ext.length > 10 ? ".pdf" : ext;
};

export const buildFinalCanonicalName = ({
  complianceName,
  dueDate,
  financialYear,
  extension,
}) => {
  const safeName = slugifyComplianceName(complianceName);
  const safeDueDate = formatDueDateForName(dueDate);
  const safeFY = normalizeFinancialYear(financialYear);
  const ext = extension?.startsWith(".") ? extension.toLowerCase() : `.${extension || "pdf"}`;
  const year = safeDueDate.slice(0, 4);

  return `${safeName}-${safeDueDate}-${safeFY}-${year}${ext}`;
};
