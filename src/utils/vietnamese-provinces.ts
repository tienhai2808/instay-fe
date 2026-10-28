import rawVietnamUnits from "@/data/vn-units.json";

export interface VietnamWard {
  code: string;
  name: string;
  fullName: string;
  codeName?: string;
  provinceCode?: string;
}

export interface VietnamProvince {
  code: string;
  name: string;
  fullName: string;
  codeName?: string;
  wards: VietnamWard[];
}

type RawRecord = Record<string, unknown>;
const rawProvinceRecords = rawVietnamUnits as unknown[];

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const normalizeComparable = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getProvinceList = (input: unknown): unknown[] => {
  if (Array.isArray(input)) return input;
  if (!isRecord(input)) return [];

  const directCandidates = [
    input.provinces,
    input.items,
    input.results,
    input.data,
    isRecord(input.data) ? input.data.provinces : undefined,
    isRecord(input.data) ? input.data.items : undefined,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  const values = Object.values(input);
  if (
    values.length > 0 &&
    values.every((item) => isRecord(item)) &&
    values.some((item) =>
      toText((item as RawRecord).code || (item as RawRecord).id),
    )
  ) {
    return values;
  }

  return [];
};

const getWardList = (province: RawRecord): unknown[] => {
  const candidates = [
    province.wards,
    province.Wards,
    province.children,
    province.items,
    province.communes,
    province.wards_data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const normalizeWard = (
  input: unknown,
  fallbackProvinceCode?: string,
): VietnamWard | null => {
  if (!isRecord(input)) return null;

  const code = toText(input.code || input.id || input.Code);
  const name = toText(input.name || input.Name);
  const fullName = toText(
    input.full_name ||
      input.fullName ||
      input.FullName ||
      input.name ||
      input.Name,
  );

  if (!code || !name) return null;

  return {
    code,
    name,
    fullName: fullName || name,
    codeName: toText(
      input.code_name || input.codeName || input.codename || input.CodeName,
    ),
    provinceCode: toText(
      input.province_code ||
        input.provinceCode ||
        input.ProvinceCode ||
        fallbackProvinceCode,
    ),
  };
};

const normalizeProvince = (input: unknown): VietnamProvince | null => {
  if (!isRecord(input)) return null;

  const code = toText(input.code || input.id || input.Code);
  const name = toText(input.name || input.Name);
  const fullName = toText(
    input.full_name ||
      input.fullName ||
      input.FullName ||
      input.name ||
      input.Name,
  );

  if (!code || !name) return null;

  const wards = getWardList(input)
    .map((ward) => normalizeWard(ward, code))
    .filter((ward): ward is VietnamWard => Boolean(ward))
    .sort((left, right) => left.name.localeCompare(right.name, "vi"));

  return {
    code,
    name,
    fullName: fullName || name,
    codeName: toText(
      input.code_name || input.codeName || input.codename || input.CodeName,
    ),
    wards,
  };
};
const normalizedProvinces = getProvinceList(rawProvinceRecords)
  .map(normalizeProvince)
  .filter((province): province is VietnamProvince => Boolean(province))
  .sort((left, right) => left.name.localeCompare(right.name, "vi"));

export const getVietnamProvinces = async () => {
  return normalizedProvinces;
};

export const matchesProvinceValue = (
  province: VietnamProvince,
  value?: string | null,
) => {
  const comparable = normalizeComparable(value || undefined);
  if (!comparable) return false;

  return [province.name, province.fullName, province.code, province.codeName]
    .filter(Boolean)
    .some((candidate) => normalizeComparable(candidate) === comparable);
};

export const matchesWardValue = (ward: VietnamWard, value?: string | null) => {
  const comparable = normalizeComparable(value || undefined);
  if (!comparable) return false;

  return [ward.name, ward.fullName, ward.code, ward.codeName]
    .filter(Boolean)
    .some((candidate) => normalizeComparable(candidate) === comparable);
};
