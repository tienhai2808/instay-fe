const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const HTML_IMAGE_PATTERN = /<img\b[\s\S]*?>/i;

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    const normalizedCode = String(code).toLowerCase();

    if (normalizedCode.startsWith("#x")) {
      const parsed = Number.parseInt(normalizedCode.slice(2), 16);
      return Number.isNaN(parsed) ? entity : String.fromCharCode(parsed);
    }

    if (normalizedCode.startsWith("#")) {
      const parsed = Number.parseInt(normalizedCode.slice(1), 10);
      return Number.isNaN(parsed) ? entity : String.fromCharCode(parsed);
    }

    return HTML_ENTITY_MAP[normalizedCode] ?? entity;
  });

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const isRichTextHtml = (value?: string | null) =>
  HTML_TAG_PATTERN.test((value || "").trim());

export const hasRichTextImage = (value?: string | null) =>
  HTML_IMAGE_PATTERN.test((value || "").trim());

export const convertPlainTextToRichTextHtml = (value?: string | null) => {
  const normalized = (value || "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";

  return normalized
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
};

export const extractPlainTextFromRichText = (value?: string | null) => {
  const normalized = (value || "").trim();
  if (!normalized) return "";

  const textSource = isRichTextHtml(normalized)
    ? normalized
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6]|blockquote)>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li>/gi, "- ")
        .replace(/<[^>]+>/g, " ")
    : normalized;

  return decodeHtmlEntities(textSource)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

export const hasMeaningfulRichTextContent = (value?: string | null) => {
  return Boolean(
    extractPlainTextFromRichText(value) || hasRichTextImage(value),
  );
};

export const normalizeRichTextHtml = (value?: string | null) => {
  const normalized = (value || "").trim();
  if (!normalized) return "";

  if (!isRichTextHtml(normalized)) {
    return convertPlainTextToRichTextHtml(normalized);
  }

  return hasMeaningfulRichTextContent(normalized) ? normalized : "";
};
