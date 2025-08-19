import React, { useState, useMemo } from "react";
import Head from "next/head";
import { TECH_NAME_TO_ID } from "@/tech";

// 상수 정의
const CATEGORY_ID = {
  education: 1,
  it: 2,
  game: 3,
  entertainment: 4,
  travel: 5,
  social: 6,
  life: 8,
  finance: 9,
  sports: 10,
  ecommerce: 11,
  etc: 12,
  web: 13,
  app: 14,
};

const FIELDS = [
  "title",
  "summary",
  "description",
  "techStacks",
  "categories",
  "imageUrls",
  "githubUrl",
  "productionUrl",
];

// 타입 정의
interface ProjectData {
  title: string;
  summary: string;
  description: string;
  techStacks: string;
  categories: string;
  imageUrls: string;
  githubUrl: string;
  productionUrl: string;
}

interface SQLResult {
  projectSQL: string;
  techSQL: string;
  catSQL: string;
  urlsSQL: string;
  combinedSQL: string;
}

// 유틸리티 함수들
function parseCSV(text: string): string[] {
  return (text || "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeSQL(str = ""): string {
  return String(str).replaceAll("'", "''");
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDateTime(dt: Date): string {
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
    dt.getDate()
  )} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(
    dt.getSeconds()
  )}.000000`;
}

function randomCreatedAtWithinPastYear(): Date {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - 365);
  return new Date(randInt(past.getTime(), now.getTime()));
}

function randomUpdatedAfter(createdAt: Date): Date {
  const max = new Date(createdAt);
  max.setDate(max.getDate() + 365);
  return new Date(randInt(createdAt.getTime(), max.getTime()));
}

export default function ProjectSqlBuilder() {
  const [projectData, setProjectData] = useState<ProjectData>({
    title: "",
    summary: "",
    description: "",
    techStacks: "",
    categories: "",
    imageUrls: "",
    githubUrl: "",
    productionUrl: "",
  });

  // 필드 업데이트 함수
  const updateField = (field: keyof ProjectData, value: string) => {
    setProjectData((prev) => ({ ...prev, [field]: value }));
  };

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

    // const authorId = randInt(1, 8);
    const createdAt = randomCreatedAtWithinPastYear();
    const updatedAt = randomUpdatedAfter(createdAt);
    const views = randInt(1, 999);

    const projectSQL = `INSERT INTO project (title, summary, github_url, production_url, author_id, created_at, updated_at, views, description) VALUES (
  '${escapeSQL(title)}',
  '${escapeSQL(summary)}',
  '${escapeSQL(githubUrl)}',
  '${escapeSQL(productionUrl)}',
  1,
  '2025-08-19 00:00:00.000000',
  '2025-08-19 00:00:00.000000',
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
      .map((n) => CATEGORY_ID[n as keyof typeof CATEGORY_ID])
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

  // 유효성 검사 함수
  const validateFields = useMemo(() => {
    const urlRegex = /^(http|https):\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
    const techNames = parseCSV(projectData.techStacks).map((s) =>
      s.toLowerCase()
    );
    const techIds = techNames.map((n) => TECH_NAME_TO_ID[n]).filter(Boolean);
    const catNames = parseCSV(projectData.categories).map((s) =>
      s.toLowerCase()
    );
    const catIds = catNames
      .map((n) => CATEGORY_ID[n as keyof typeof CATEGORY_ID])
      .filter(Boolean);
    const urls = parseCSV(projectData.imageUrls);

    const errors: Record<string, string> = {};

    // title 검사
    if (!/^[a-zA-Z0-9가-힣 ]{2,30}$/.test(projectData.title)) {
      errors.title = "2~30자의 한글/영문/숫자만 가능";
    }

    // summary 검사
    if (projectData.summary.length < 10 || projectData.summary.length > 50) {
      errors.summary = "10~50자 필요";
    }

    // description 검사
    if (
      projectData.description.length < 100 ||
      projectData.description.length > 8000
    ) {
      errors.description = "100~8000자 필요";
    }

    // githubUrl 검사
    if (
      projectData.githubUrl.length < 1 ||
      projectData.githubUrl.length >= 500
    ) {
      errors.githubUrl = "필수, 1~500자 이하";
    } else if (!urlRegex.test(projectData.githubUrl)) {
      errors.githubUrl = "URL 형식이 아님";
    }

    // productionUrl 검사
    if (projectData.productionUrl) {
      if (projectData.productionUrl.length >= 500) {
        errors.productionUrl = "1~500자 이하";
      } else if (!urlRegex.test(projectData.productionUrl)) {
        errors.productionUrl = "URL 형식이 아님";
      }
    }

    // imageUrls 검사
    if (projectData.imageUrls) {
      if (urls.length > 10) {
        errors.imageUrls = "최대 10개까지";
      } else {
        for (const url of urls) {
          if (url.length < 1 || url.length >= 500) {
            errors.imageUrls = "각 URL은 1~500자";
            break;
          }
          if (!urlRegex.test(url)) {
            errors.imageUrls = "잘못된 URL 형식 있음";
            break;
          }
        }
      }
    }

    // techStacks 검사
    if (techIds.length < 1 || techIds.length > 20) {
      errors.techStacks = "1~20개의 유효한 스택 필요";
    }

    // categories 검사
    if (catIds.length < 1 || catIds.length > 5) {
      errors.categories = "1~5개의 유효한 카테고리 필요";
    }

    return errors;
  }, [projectData]);

  console.log(validateFields);

  // 하이라이트 HTML 생성 함수
  const getHighlightHTML = (value: string, fieldName: string): string => {
    const tokens = value.split(/([\s,]+)/);
    let dict: Record<string, number> = {};

    if (fieldName === "techStacks") dict = TECH_NAME_TO_ID;
    else if (fieldName === "categories") dict = CATEGORY_ID;

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

        const hasPrefix = Object.keys(dict).some((name) =>
          name.startsWith(lower)
        );
        if (hasPrefix) {
          return `<span style="color:deepskyblue">${escapeHTML(token)}</span>`;
        }

        return `<span style="color:red">${escapeHTML(token)}</span>`;
      })
      .join("");
  };

  return (
    <>
      <Head>
        <title>Project → SQL Builder</title>
      </Head>

      <div className="container">
        {/* INSERT문 패널 */}
        <div className="panel">
          <h3>📦 통합 INSERT문</h3>
          <pre className="sql-combined" suppressHydrationWarning>
            {buildSQL.combinedSQL}
          </pre>

          <div className="cols">
            <div>
              <h3>🔧 project INSERT</h3>
              <pre className="sql-part" suppressHydrationWarning>
                {buildSQL.projectSQL}
              </pre>
            </div>
            <div>
              <h3>🧩 project_tech_stacks INSERT</h3>
              <pre className="sql-part">{buildSQL.techSQL}</pre>
              {validateFields.techStacks && (
                <div className="warn">{validateFields.techStacks}</div>
              )}
            </div>
            <div>
              <h3>🏷 project_categories INSERT</h3>
              <pre className="sql-part">{buildSQL.catSQL}</pre>
              {validateFields.categories && (
                <div className="warn">{validateFields.categories}</div>
              )}
            </div>
            <div>
              <h3>🔗 project_urls INSERT</h3>
              <pre className="sql-part">{buildSQL.urlsSQL}</pre>
            </div>
          </div>
        </div>

        {/* 폼 그리드 */}
        <div className="grid">
          {FIELDS.map((field) => (
            <div key={field} className="row">
              <label>{field}</label>
              <div className="input-wrapper">
                {field === "techStacks" || field === "categories" ? (
                  <div className="hl-wrap">
                    <pre
                      className="hl-back"
                      dangerouslySetInnerHTML={{
                        __html: getHighlightHTML(projectData[field], field),
                      }}
                    />
                    <textarea
                      id={`field_${field}`}
                      value={projectData[field]}
                      onChange={(e) => updateField(field, e.target.value)}
                      className={`${
                        [
                          "description",
                          "imageUrls",
                          "techStacks",
                          "categories",
                        ].includes(field)
                          ? "multi-line"
                          : "single-line"
                      } ${validateFields[field] ? "error" : ""}`}
                    />
                  </div>
                ) : (
                  <textarea
                    id={`field_${field}`}
                    value={projectData[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    className={`${
                      [
                        "description",
                        "imageUrls",
                        "techStacks",
                        "categories",
                      ].includes(field)
                        ? "multi-line"
                        : "single-line"
                    } ${validateFields[field] ? "error" : ""}`}
                  />
                )}
                {validateFields[field] && (
                  <div className="warn">{validateFields[field]}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <style jsx>{`
          .container {
            font-family: system-ui, -apple-system, Segoe UI, Roboto,
              Apple SD Gothic Neo, "Noto Sans KR", sans-serif;
            margin: 24px;
          }

          .panel {
            margin-bottom: 32px;
          }

          .grid {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 16px;
            align-items: start;
          }

          .row {
            display: contents;
          }

          .row label {
            font-weight: 600;
            margin-top: 8px;
            grid-column: 1;
          }

          .row .input-wrapper {
            grid-column: 2;
            display: flex;
            flex-direction: column;
          }

          textarea {
            width: 100%;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
              monospace;
            font-size: 13px;
            padding: 8px;
          }

          textarea.single-line {
            min-height: 24px;
            max-height: 24px;
            overflow-y: auto;
          }

          textarea.multi-line {
            min-height: 80px;
          }

          .warn {
            color: #c1121f;
            margin-top: 4px;
            font-size: 12px;
          }

          .ok {
            color: #0a7d17;
          }

          .sql-combined,
          .sql-part {
            background: #0b1021;
            color: #e5e7eb;
            padding: 12px;
            overflow: auto;
            border-radius: 6px;
            margin-top: 8px;
          }

          .cols {
            display: grid;
            grid-template-columns: repeat(2, minmax(300px, 1fr));
            gap: 16px;
            margin-top: 16px;
          }

          .hl-wrap {
            position: relative;
            width: 100%;
          }

          .hl-back {
            position: absolute;
            margin: 0;
            inset: 0;
            padding: 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
              monospace;
            font-size: 13px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-break: break-word;
            z-index: 1;
            pointer-events: none;
            background: transparent;
          }

          .hl-wrap textarea {
            position: relative;
            z-index: 2;
            background: transparent;
            color: transparent;
            caret-color: black;
            resize: none;
          }

          .hl-back,
          .hl-wrap textarea {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
              monospace;
            font-size: 13px;
            line-height: 1.4;
            letter-spacing: normal;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .error {
            border: 1px solid #c1121f !important;
          }
        `}</style>
      </div>
    </>
  );
}
