import type { Category } from "../data/schema.ts";

export const CATEGORY_LABELS: Record<Category, string> = {
  science: "Science",
  technology: "Technology",
  medicine: "Medicine",
  space: "Space",
  government: "Government",
  law: "Law and courts",
  crime: "Crime",
  business: "Business",
  animals: "Animals",
  education: "Education",
  sports: "Sports",
  culture: "Arts and culture",
  environment: "Environment",
  transport: "Transport",
  food: "Food and drink",
};

export function categoryPath(c: Category): string {
  return `/categories/${c}`;
}
