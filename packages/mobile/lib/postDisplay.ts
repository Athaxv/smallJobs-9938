import { categoryLabel } from "@template/web/categories";

/** Primary line for a post card — never returns blank. */
export function displayPostTitle(
  title?: string | null,
  body?: string | null,
  category?: string,
): string {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) return trimmedTitle;

  const trimmedBody = body?.trim();
  if (trimmedBody) {
    const firstLine = trimmedBody.split("\n")[0].trim();
    if (firstLine.length <= 80) return firstLine;
    return `${firstLine.slice(0, 77)}...`;
  }

  const cat = category?.trim();
  if (cat) return `${categoryLabel(cat)} request`;

  return "Open request";
}

/** Body text for cards — omitted when empty or already shown as the title. */
export function displayPostBody(
  title?: string | null,
  body?: string | null,
): string | null {
  const trimmedBody = body?.trim();
  if (!trimmedBody) return null;

  const trimmedTitle = title?.trim();
  if (!trimmedTitle) return null;

  if (trimmedBody === trimmedTitle) return null;

  const firstLine = trimmedBody.split("\n")[0].trim();
  if (firstLine === trimmedTitle && trimmedBody.length <= trimmedTitle.length + 40) {
    return null;
  }

  return trimmedBody;
}

export function hasProvidedTitle(title?: string | null): boolean {
  return Boolean(title?.trim());
}
