import { TECH_NAME_TO_ID } from "@/tech";
import { useMemo } from "react";
import { escapeSQL } from "../../../utils/escapeSQL";
import { parseCSV } from "../../../utils/parseCSV";
import { PROJECT_CATEGORY_ID } from "..";

interface SQLResult {
  projectSQL: string;
  techSQL: string;
  catSQL: string;
  urlsSQL: string;
  combinedSQL: string;
}

export const useBuildSQL = (projectData) => {
  // SQL 빌드 함수
  const buildSQL = useMemo((): SQLResult => {
    const {
      title,
      summary,
      description,
      githubUrl,
      productionUrl,
      techStacks,
      categories,
      imageUrls,
    } = projectData;

    const projectSQL = `INSERT INTO project (title, summary, github_url, production_url, author_id, created_at, updated_at, views, description) VALUES (
    '${escapeSQL(title)}',
    '${escapeSQL(summary)}',
    '${escapeSQL(githubUrl)}',
    '${escapeSQL(productionUrl)}',
    1,
    '2025-08-20 00:00:00.000000',
    '2025-08-20 00:00:00.000000',
    0,
    '${escapeSQL(description)}'
  );`;

    const setPidSQL = `SET @pid = LAST_INSERT_ID();`;

    // techStacks
    const techNames = parseCSV(techStacks).map((s) => s.toLowerCase());
    const techIds = techNames.map((n) => TECH_NAME_TO_ID[n]).filter(Boolean);
    let techSQL = "-- (입력된 techStacks 없음)";
    if (techIds.length > 0) {
      const values = techIds.map((id) => `(@pid, ${id})`).join(",\n  ");
      techSQL = `INSERT INTO project_tech_stacks (project_id, tech_stacks_id) VALUES \n  ${values};`;
    }

    // categories
    const catNames = parseCSV(categories).map((s) => s.toLowerCase());
    const catIds = catNames
      .map((n) => PROJECT_CATEGORY_ID[n as keyof typeof PROJECT_CATEGORY_ID])
      .filter(Boolean);
    let catSQL = "-- (입력된 categories 없음)";
    if (catIds.length > 0) {
      const values = catIds.map((id) => `(@pid, ${id})`).join(",\n  ");
      catSQL = `INSERT INTO project_categories (project_id, categories_id) VALUES \n  ${values};`;
    }

    // urls
    const urls = parseCSV(imageUrls);
    let urlsSQL = "-- (입력된 imageUrls 없음)";
    if (urls.length > 0) {
      const values = urls.map((u) => `(@pid, '${escapeSQL(u)}')`).join(",\n  ");
      urlsSQL = `INSERT INTO project_urls (project_id, urls) VALUES \n  ${values};`;
    }

    const combinedSQL = [
      "START TRANSACTION;",
      projectSQL,
      setPidSQL,
      techSQL,
      catSQL,
      urlsSQL,
      "COMMIT;",
    ].join("\n\n");

    return { projectSQL, techSQL, catSQL, urlsSQL, combinedSQL };
  }, [projectData]);

  return { buildSQL };
};
