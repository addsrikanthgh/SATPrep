export const AP_CSP_UNITS = [
  "Internet and Networks",
  "Data",
  "Algorithms",
  "Programming",
  "Impact of Computing",
] as const;

export type ApCspUnit = (typeof AP_CSP_UNITS)[number];

export function normalizeUnit(value: string | null | undefined) {
  if (!value || value.trim().length === 0 || value.toLowerCase() === "all") {
    return null;
  }

  return value.trim();
}

export function formatCspUnitLabel(value: string) {
  if (value.includes("_")) {
    return value
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return value;
}

export function toChoiceArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}
