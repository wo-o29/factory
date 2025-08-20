import { ArticleData, FIELDS, SQLResult } from "../../pages/sql-builder";
import TextArea from "./TextArea";

// 아티클 블록 컴포넌트
interface ArticleBlockProps {
  article: ArticleData & { sql: SQLResult; errors: Record<string, string> };
  onUpdate: (field: keyof ArticleData, value: any) => void;
  onToggle: () => void;
  onDelete: () => void;
  getHighlightHTML: (value: string, fieldName: string) => string;
}

const validationLength = {
  title: { min: 2, max: 50 },
  summary: { min: 10, max: 255 },
  content: { min: 100, max: 99999999999 },
  articleUrl: { min: 1, max: 500 },
};

export default function ArticleBlock({
  article,
  onUpdate,
  onToggle,
  onDelete,
  getHighlightHTML,
}: ArticleBlockProps) {
  const onClick = () => {
    navigator.clipboard.writeText(article.sql.combinedSQL).then(() => {
      alert("개별 INSERT문이 복사되었습니다!");
    });
  };

  const isError = Object.keys(article.errors).length > 0;
  return (
    <div className="article-block">
      {/* 폼 그리드 */}
      <div className={`grid ${article.expanded ? "" : "height"}`}>
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
                  <TextArea
                    value={article[field] as string}
                    onChange={(value) => onUpdate(field, value)}
                    className={`${
                      field === "summary" || field === "content"
                        ? field
                        : "single"
                    } ${article.errors[field] ? "error" : ""}`}
                  />
                </div>
              ) : (
                <textarea
                  minLength={validationLength[field]?.min}
                  maxLength={validationLength[field]?.max}
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
          <h3>{article.title}</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            {!isError && (
              <button type="button" className="copy-btn" onClick={onClick}>
                개별 복사
              </button>
            )}
            <button type="button" className="toggle-btn" onClick={onToggle}>
              Toggle
            </button>
            <button type="button" className="delete-btn" onClick={onDelete}>
              삭제
            </button>
          </div>
        </div>
        <pre className={`sql-combined ${article.expanded ? "" : "height"}`}>
          {article.sql.combinedSQL}
        </pre>

        <div className={`cols detail ${article.expanded ? "" : "height"}`}>
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
          max-height: 1000px;
          transition: max-height 0.3s ease;
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
          width: 100%;
        }

        .hl-wrap textarea {
          position: relative;
          z-index: 999;
          background: transparent;
          color: transparent;
          caret-color: black;
          resize: none;
        }

        textarea {
          width: 100%;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 13px;
          padding: 8px;
          color: black;
        }

        textarea.summary {
          min-height: 80px;
          color: black;
        }

        textarea.content {
          color: black;
          min-height: 80px;
        }

        textarea.single {
          /* color: black; */
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

        .delete-btn {
          margin-left: auto;
          padding: 6px 16px;
          border: none;
          border-radius: 4px;
          background: #cc1b00;
          color: white;
          cursor: pointer;
          font-size: 13px;
        }

        .copy-btn {
          margin-left: auto;
          padding: 6px 16px;
          border: none;
          border-radius: 4px;
          background: #00cc41;
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
          max-height: 1000px;
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

        .height {
          max-height: 0;
          margin: 0;
          padding: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
      `}</style>
    </div>
  );
}
