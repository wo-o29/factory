import React, { useState, useMemo, useRef } from "react";
import Head from "next/head";
import { TECH_NAME_TO_ID } from "../tech";

// 상수 정의
const CATEGORY_ID = { fe: 1, be: 2, android: 3, ios: 4, ss: 5, etc: 6 };

const FIELDS = [
  "title",
  "summary",
  "articleUrl",
  "category",
  "techStacks",
  "content",
];

// 타입 정의
interface ArticleData {
  id: number;
  title: string;
  summary: string;
  articleUrl: string;
  category: string;
  techStacks: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  clicks: number;
  expanded: boolean;
}

interface SQLResult {
  articleSQL: string;
  techSQL: string;
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

function randInt(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function formatDateTime(date: Date): string {
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.000000`;
}

function randomCreatedAtWithinPastYear(): Date {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - 365);
  return new Date(randInt(past.getTime(), now.getTime()));
}

function randomUpdatedAfter(createdAt: Date): Date {
  const maxDate = new Date(createdAt);
  maxDate.setDate(createdAt.getDate() + 365);
  return new Date(randInt(createdAt.getTime(), maxDate.getTime()));
}

// 메인 컴포넌트
export default function SqlBuilder() {
  const [projectGithubUrl, setProjectGithubUrl] = useState("");
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropboxRef = useRef<HTMLDivElement>(null);

  // 새 아티클 생성 함수
  const createNewArticle = (url?: string, jsonData?: any): ArticleData => {
    const createdAt = randomCreatedAtWithinPastYear();
    const updatedAt = randomUpdatedAfter(createdAt);

    return {
      id: Date.now() + Math.random(),
      title: jsonData?.title || "",
      summary: jsonData?.summary || "",
      articleUrl: url || "",
      category: "",
      techStacks: "",
      content: jsonData?.content || "",
      createdAt,
      updatedAt,
      clicks: randInt(1, 999),
      expanded: true,
    };
  };

  // SQL 빌드 함수
  const buildSQL = (article: ArticleData): SQLResult => {
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
    const categoryIds = categoryNames
      .map((n) => CATEGORY_ID[n as keyof typeof CATEGORY_ID])
      .filter(Boolean);
    const categoryIdValue = categoryIds.length > 0 ? categoryIds[0] : "''";
    const categoryKey = categoryNames || "";

    const articleSQL = `INSERT INTO article (title, summary, project_id, article_url, category_id, created_at, updated_at, clicks, content) VALUES (
  '${escapeSQL(title)}',
  '${escapeSQL(summary)}',
  ${projectIdExpr},
  '${escapeSQL(articleUrl)}',
  ${categoryIdValue},
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

  // 유효성 검사 함수
  const validateArticle = (article: ArticleData): Record<string, string> => {
    const errors: Record<string, string> = {};
    const categoryNames = parseCSV(article.category).map((s) =>
      s.toLowerCase()
    );
    const categoryKey = categoryNames[0] || "";
    const techNames = parseCSV(article.techStacks).map((s) => s.toLowerCase());
    const techIds = techNames.map((n) => TECH_NAME_TO_ID[n]).filter(Boolean);

    if (article.title.length < 2 || article.title.length > 50) {
      errors.title = "2~50자 필요";
    }
    if (article.summary.length < 10 || article.summary.length > 255) {
      errors.summary = "10~255자 필요";
    }
    if (article.content.length < 100 || article.content.length > 8000) {
      errors.content = "100~8000자 필요";
    }
    if (article.articleUrl.length < 1 || article.articleUrl.length > 255) {
      errors.articleUrl = "필수, 1~255자";
    }
    if (categoryNames.length !== 1) {
      errors.category = "category는 반드시 1개 입력";
    } else if (!["trouble", "tech", "etc"].includes(categoryNames[0])) {
      errors.category = "유효한 카테고리 필요";
    }
    if (categoryKey === "etc" && techIds.length !== 0) {
      errors.techStacks = "etc에서는 techStacks 입력 불가";
    } else if (
      (categoryKey === "trouble" || categoryKey === "tech") &&
      (techIds.length < 1 || techIds.length > 3)
    ) {
      errors.techStacks = "1~3개의 스택 필요";
    }

    return errors;
  };

  // 하이라이트 HTML 생성 함수
  const getHighlightHTML = (value: string, fieldName: string): string => {
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

  // 드래그앤드롭 핸들러
  const handleDrop = async (e: React.DragEvent, inputUrl: string = "") => {
    e.preventDefault();
    setDragOver(false);
    setLoading(true); // 로딩 시작

    const url =
      (e.dataTransfer?.getData("text/uri-list") ||
        e.dataTransfer?.getData("text/plain")) ??
      inputUrl;

    if (!url) {
      setLoading(false);
      return;
    }

    const mappingApi = (url: string) => {
      if (url.includes("notion.site")) {
        return "crawl-notion";
      }

      if (url.includes("github.com") && url.includes("wiki")) {
        return "crawl-github-wiki";
      }

      return "crawl";
    };

    try {
      const apiUrl = mappingApi(url);
      const response = await fetch(
        `/api/${apiUrl}?url=${encodeURIComponent(url)}`
      );
      if (!response.ok) throw new Error("크롤링 실패");

      const jsonData = await response.json();
      const newArticle = createNewArticle(url, jsonData);
      setArticles((prev) => [...prev, newArticle]);
    } catch (error) {
      alert("크롤링 실패: " + error);
      const newArticle = createNewArticle(url);
      setArticles((prev) => [...prev, newArticle]);
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 아티클 업데이트 함수
  const updateArticle = (id: number, field: keyof ArticleData, value: any) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.id === id ? { ...article, [field]: value } : article
      )
    );
  };

  // 통합 SQL 생성
  const allSQL = useMemo(() => {
    const sqlParts = articles.map((article) => buildSQL(article).combinedSQL);
    return ["START TRANSACTION;", ...sqlParts, "COMMIT;"].join("\n\n");
  }, [articles, projectGithubUrl]);

  // 복사 함수
  const copyAllSQL = () => {
    navigator.clipboard.writeText(allSQL).then(() => {
      alert("통합 INSERT문이 복사되었습니다!");
    });
  };

  // 아티클별 SQL과 에러 계산
  const articlesWithSQL = useMemo(() => {
    return articles.map((article) => ({
      ...article,
      sql: buildSQL(article),
      errors: validateArticle(article),
    }));
  }, [articles, projectGithubUrl]);

  return (
    <>
      <Head>
        <title>Articles → SQL Builder</title>
      </Head>

      <div className="container">
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "white",
            padding: "16px",
          }}
        >
          {/* Project GitHub URL 입력 */}
          <div className="project-url-section">
            <label>Project GitHub URL</label>
            <input
              type="text"
              value={projectGithubUrl}
              onChange={(e) => setProjectGithubUrl(e.target.value)}
              placeholder="예: https://github.com/user/repo"
              className="project-url-input"
            />
          </div>
          {/* 드롭박스 */}
          <div
            ref={dropboxRef}
            className={`dropbox ${dragOver ? "dragover" : ""} ${
              loading ? "loading" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={(e) => {
              const url = prompt("URL을 붙여넣으세요 (취소하면 초기화됩니다):");
              handleDrop(e, url);
            }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <div>크롤링 중...</div>
              </>
            ) : (
              "URL을 여기에 드래그하세요"
            )}
          </div>
        </div>

        {/* 아티클 블록들 */}
        {articlesWithSQL.map((article) => (
          <ArticleBlock
            key={article.id}
            article={article}
            onUpdate={(field, value) => updateArticle(article.id, field, value)}
            onToggle={() =>
              updateArticle(article.id, "expanded", !article.expanded)
            }
            getHighlightHTML={getHighlightHTML}
          />
        ))}

        <br />
        <br />
        <br />
        <br />
        <br />
        <hr />

        {/* 통합 INSERT문 */}
        <h2>
          📦 통합 INSERT문 (모든 아티클)
          <span style={{ color: "red" }}> 순서 지켜야함</span>
        </h2>
        <button className="copy-btn" onClick={copyAllSQL}>
          📋 복사하기
        </button>
        <pre className="sql-all">{allSQL}</pre>

        {/* 스타일 */}
        <style jsx>{`
          .container {
            font-family: system-ui, -apple-system, Segoe UI, Roboto,
              Apple SD Gothic Neo, "Noto Sans KR", sans-serif;
            margin: 24px;
          }

          .project-url-section {
            margin-bottom: 20px;
          }

          .project-url-section label {
            font-weight: 600;
            margin-right: 8px;
          }

          .project-url-input {
            width: 400px;
            padding: 4px;
          }

          .dropbox {
            border: 2px dashed #888;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            font-size: 14px;
            color: #555;
            transition: all 0.2s;
          }

          .dropbox.dragover {
            background: #f0f8ff;
            border-color: #007acc;
            color: #007acc;
          }

          .copy-btn {
            margin-top: 8px;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: #007acc;
            color: white;
            cursor: pointer;
            font-size: 13px;
          }

          .sql-all {
            background: #0b1021;
            color: #e5e7eb;
            padding: 12px;
            overflow: auto;
            border-radius: 6px;
            margin-top: 16px;
          }
        `}</style>
      </div>
    </>
  );
}

// 아티클 블록 컴포넌트
interface ArticleBlockProps {
  article: ArticleData & { sql: SQLResult; errors: Record<string, string> };
  onUpdate: (field: keyof ArticleData, value: any) => void;
  onToggle: () => void;
  getHighlightHTML: (value: string, fieldName: string) => string;
}

function ArticleBlock({
  article,
  onUpdate,
  onToggle,
  getHighlightHTML,
}: ArticleBlockProps) {
  return (
    <div className="article-block">
      {/* 폼 그리드 */}
      <div className={`grid ${!article.expanded ? "hidden" : ""}`}>
        {FIELDS.map((field) => (
          <div key={field} className="row">
            <label>{field}</label>
            <div className="input-wrapper">
              {field === "techStacks" || field === "category" ? (
                <div className="hl-wrap">
                  <pre
                    className="hl-back"
                    dangerouslySetInnerHTML={{
                      __html: getHighlightHTML(article[field] as string, field),
                    }}
                  />
                  <textarea
                    value={article[field] as string}
                    onChange={(e) => onUpdate(field, e.target.value)}
                    className={`${
                      field === "summary" || field === "content"
                        ? field
                        : "single"
                    } ${article.errors[field] ? "error" : ""}`}
                  />
                </div>
              ) : (
                <textarea
                  value={article[field] as string}
                  onChange={(e) => onUpdate(field, e.target.value)}
                  className={`${
                    field === "summary" || field === "content"
                      ? field
                      : "single"
                  } ${article.errors[field] ? "error" : ""}`}
                />
              )}
              {article.errors[field] && (
                <div className="warn">{article.errors[field]}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SQL 패널 */}
      <div className="panel">
        <div className="header-flex">
          <h3>📦 Article #{article.id} INSERT문</h3>
          <button className="toggle-btn" onClick={onToggle}>
            Toggle
          </button>
        </div>
        <pre className="sql-combined">{article.sql.combinedSQL}</pre>

        <div className={`cols detail ${!article.expanded ? "hidden" : ""}`}>
          <div>
            <h3>📰 article INSERT</h3>
            <pre className="sql-part">{article.sql.articleSQL}</pre>
          </div>
          <div>
            <h3>🧩 article_tech_stacks INSERT</h3>
            <pre className="sql-part">{article.sql.techSQL}</pre>
          </div>
        </div>
      </div>

      <style jsx>{`
        .article-block {
          border: 5px solid #007acc;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
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

        .hl-wrap {
          position: relative;
          width: 100%;
        }

        .hl-back {
          position: absolute;
          margin: 0;
          inset: 0;
          padding: 8px;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: ui-monospace, monospace;
          font-size: 13px;
          line-height: 1.4;
          z-index: 1;
          pointer-events: none;
        }

        .hl-wrap textarea {
          position: relative;
          z-index: 2;
          background: transparent;
          color: transparent;
          caret-color: white;
          resize: none;
        }

        textarea {
          width: 100%;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 13px;
          padding: 8px;
        }

        textarea.summary {
          min-height: 80px;
        }

        textarea.content {
          min-height: 80px;
        }

        textarea.single {
          min-height: 24px;
          max-height: 24px;
          overflow-y: auto;
        }

        .error {
          border: 1px solid #c1121f !important;
        }

        .warn {
          color: #c1121f;
          margin-top: 4px;
          font-size: 12px;
        }

        .panel {
          margin-top: 16px;
        }

        .header-flex {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .toggle-btn {
          margin-left: auto;
          padding: 6px 16px;
          border: none;
          border-radius: 4px;
          background: #007acc;
          color: white;
          cursor: pointer;
          font-size: 13px;
        }

        .sql-combined,
        .sql-part {
          background: #0b1021;
          color: #e5e7eb;
          padding: 12px;
          overflow: auto;
          border-radius: 6px;
          margin-top: 16px;
        }

        .cols {
          display: grid;
          grid-template-columns: repeat(2, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .hidden {
          display: none;
        }
      `}</style>
    </div>
  );
}
