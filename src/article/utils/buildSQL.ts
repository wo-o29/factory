import { TECH_NAME_TO_ID } from "@/tech";
import { escapeSQL } from "@/utils/escapeSQL";
import { parseCSV } from "@/utils/parseCSV";
import {
  ARTICLE_CATEGORY_ID,
  ArticleData,
  SQLResult,
} from "../../pages/sql-builder";
import { formatDateTime } from "./formatDateTime";

// SQL 빌드 함수
export const buildSQL = (
  article: ArticleData,
  projectGithubUrl: string
): SQLResult => {
  const {
    title,
    summary,
    articleUrl,
    category,
    techStacks,
    content,
    createdAt,
    updatedAt,
    clicks,
  } = article;

  const projectIdExpr = projectGithubUrl
    ? `(select id from project where github_url = '${escapeSQL(
        projectGithubUrl
      )}')`
    : "/* project github_url 필요 */";

  const categoryNames = parseCSV(category).map((s) => s.toLowerCase());
  const categoryKey = categoryNames || "";
  const legendCategory = category
    .split(", ")
    .map((c) => ARTICLE_CATEGORY_ID[c])
    .join(", ");

  const articleSQL = `INSERT INTO article (title, summary, project_id, article_url, category_id, created_at, updated_at, clicks, content) VALUES (
  '${escapeSQL(title)}',
  '${escapeSQL(summary)}',
  ${projectIdExpr},
  '${escapeSQL(articleUrl)}',
  ${legendCategory},
  '${formatDateTime(createdAt)}',
  '${formatDateTime(updatedAt)}',
  ${clicks},
  '${escapeSQL(content)}'
);`;

  const techNames = parseCSV(techStacks).map((s) => s.toLowerCase());
  const techIds = techNames.map((n) => TECH_NAME_TO_ID[n]).filter(Boolean);

  let techSQL = "";
  if (categoryKey === "etc") {
    techSQL = "";
  } else if (techIds.length > 0) {
    const values = techIds
      .map((id) => `(LAST_INSERT_ID(), ${id})`)
      .join(",\n  ");
    techSQL = `INSERT INTO article_tech_stacks (article_id, tech_stacks_id) VALUES \n  ${values};`;
  } else {
    techSQL = "-- (입력된 techStacks 없음)";
  }

  return {
    articleSQL,
    techSQL,
    combinedSQL: [articleSQL, techSQL].filter(Boolean).join("\n\n"),
  };
};
