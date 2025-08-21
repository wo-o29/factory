import React, { useState } from "react";
import Head from "next/head";
import { useBuildSQL } from "@/project/hooks/useBuildSQL";
import { useProjectValidateFields } from "@/project/hooks/useProjectValidateFields";
import { getHighlightHTMLByProject } from "@/project/utils/getHighlightHTMLByProject";

// 상수 정의
export const PROJECT_CATEGORY_ID = {
  education: 1,
  it: 2,
  game: 3,
  entertainment: 4,
  travel: 5,
  social: 6,
  life: 7,
  finance: 8,
  sports: 9,
  ecommerce: 10,
  etc: 11,
  web: 12,
  app: 13,
};

const FIELDS = [
  "title",
  "summary",
  "description",
  "techStacks",
  "categories",
  "thumbnailUrls",
  "imageUrls",
  "githubUrl",
  "productionUrl",
];

const validationLength = {
  title: { min: 2, max: 30 },
  summary: { min: 10, max: 50 },
  description: { min: 100, max: 8000 },
  githubUrl: { min: 1, max: 500 },
};

// 타입 정의
interface ProjectData {
  title: string;
  summary: string;
  description: string;
  techStacks: string;
  categories: string;
  thumbnailUrls: string;
  imageUrls: string;
  githubUrl: string;
  productionUrl: string;
}

export default function ProjectSqlBuilder() {
  const [projectData, setProjectData] = useState<ProjectData>({
    title: "",
    summary: "",
    description: "",
    techStacks: "",
    categories: "",
    thumbnailUrls: "",
    imageUrls: "",
    githubUrl: "",
    productionUrl: "",
  });
  const { buildSQL } = useBuildSQL(projectData);
  const { validateFields } = useProjectValidateFields(projectData);

  // 필드 업데이트 함수
  const updateField = (field: string, value: string) => {
    setProjectData((prev) => ({ ...prev, [field]: value }));
  };

  const copyAllSQL = () => {
    navigator.clipboard.writeText(buildSQL.combinedSQL).then(() => {
      alert("통합 INSERT문이 복사되었습니다!");
    });
  };

  return (
    <>
      <Head>
        <title>Project → SQL Builder</title>
      </Head>

      <div className="container">
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "white",
            padding: "16px",
            display: "flex",
            justifyContent: "right",
          }}
        >
          <button type="button" onClick={copyAllSQL}>
            전체 복사
          </button>
        </div>
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
                        __html: getHighlightHTMLByProject(
                          projectData[field],
                          field
                        ),
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
                    minLength={validationLength[field]?.min}
                    maxLength={validationLength[field]?.max}
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
