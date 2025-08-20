import { CATEGORY_ID } from "@/pages/project-sql-builder";
import { TECH_NAME_TO_ID } from "@/tech";

// 하이라이트 HTML 생성 함수
export const getHighlightHTMLByArticle = (
  value: string,
  fieldName: string
): string => {
  const tokens = value.split(/([\s,]+)/);
  let dict: Record<string, number> = {};

  if (fieldName === "techStacks") dict = TECH_NAME_TO_ID;
  else if (fieldName === "category") dict = CATEGORY_ID;

  const counts: Record<string, number> = {};
  tokens.forEach((token) => {
    if (/^[\s,]+$/.test(token)) return;
    const lower = token.toLowerCase();
    if (dict[lower]) counts[lower] = (counts[lower] || 0) + 1;
  });

  const escapeHTML = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return tokens
    .map((token) => {
      if (/^[\s,]+$/.test(token)) return escapeHTML(token);

      const lower = token.toLowerCase();
      if (dict[lower]) {
        if (counts[lower] > 1) {
          return `<span style="color:orange">${escapeHTML(token)}</span>`;
        }
        return `<span style="color:green">${escapeHTML(token)}</span>`;
      }

      const hasPartial = Object.keys(dict).some((name) =>
        name.startsWith(lower)
      );
      if (hasPartial) {
        return `<span style="color:deepskyblue">${escapeHTML(token)}</span>`;
      }

      return `<span style="color:red">${escapeHTML(token)}</span>`;
    })
    .join("");
};
