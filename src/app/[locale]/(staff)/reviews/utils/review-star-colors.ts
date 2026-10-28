export const REVIEW_STAR_COLORS = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#84cc16",
  5: "#10b981",
} as const;

export const resolveReviewStarColor = (star: number) => {
  const normalized = Math.max(
    1,
    Math.min(5, Math.round(star)),
  ) as keyof typeof REVIEW_STAR_COLORS;
  return REVIEW_STAR_COLORS[normalized];
};
