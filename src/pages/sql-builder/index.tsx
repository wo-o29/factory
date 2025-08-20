import React, { useState, useMemo, useRef } from "react";
import Head from "next/head";
import { getHighlightHTMLByArticle } from "../../article/utils/getHighlightHTMLByArticle";
import { createNewArticle } from "../../article/utils/createNewArticle";
import { buildSQL } from "../../article/utils/buildSQL";
import { validateArticle } from "../../article/utils/validateArticle";
import ArticleBlock from "../../article/components/ArticleBlock";

// 상수 정의
export const ARTICLE_CATEGORY_ID = {
  fe: 1,
  be: 2,
  android: 3,
  ios: 4,
  ss: 5,
  etc: 6,
};
export const CATEGORY_KEY = Object.keys(ARTICLE_CATEGORY_ID);

export const FIELDS = [
  "title",
  "summary",
  "articleUrl",
  "category",
  "techStacks",
  "content",
];

// 타입 정의
export interface ArticleData {
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

export interface SQLResult {
  articleSQL: string;
  techSQL: string;
  combinedSQL: string;
}

// 메인 컴포넌트
export default function SqlBuilder() {
  const [projectGithubUrl, setProjectGithubUrl] = useState("");
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropboxRef = useRef<HTMLDivElement>(null);

  // 드래그앤드롭 핸들러
  const handleDrop = async (
    e: React.DragEvent | React.MouseEvent,
    inputUrl: string = ""
  ) => {
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
      setArticles((prev) => [newArticle, ...prev]);
    } catch (error) {
      alert("크롤링 실패: " + error);
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 아티클 업데이트 함수
  const updateArticle = (id: number, field: string, value: any) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.id === id ? { ...article, [field]: value } : article
      )
    );
  };

  const deleteArticle = (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    setArticles((prev) => prev.filter((article) => article.id !== id));
  };

  // 통합 SQL 생성
  const allSQL = useMemo(() => {
    const sqlParts = articles.map(
      (article) => buildSQL(article, projectGithubUrl).combinedSQL
    );
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
      sql: buildSQL(article, projectGithubUrl),
      errors: validateArticle(article),
    }));
  }, [articles, projectGithubUrl]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCopyScroll = () => {
    const element = document.getElementById("copy-all");
    if (element) {
      const elementTop =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offset = 220; // 상단에서 165px 위로 위치시키기
      window.scrollTo({
        top: elementTop - offset,
        behavior: "smooth",
      });
    }
  };

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
          <div style={{ display: "flex", justifyContent: "right", gap: "8px" }}>
            <button type="button" onClick={handleScrollToTop}>
              TOP
            </button>
            <button type="button" onClick={handleCopyScroll}>
              전체 복사하러 가기
            </button>
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
            onDelete={() => deleteArticle(article.id)}
            getHighlightHTML={getHighlightHTMLByArticle}
          />
        ))}

        <br />
        <br />
        <br />
        <br />
        <br />
        <hr />

        {/* 통합 INSERT문 */}
        <h2 id="copy-all">
          📦 통합 INSERT문 (모든 아티클)
          <span style={{ color: "red" }}> 순서 지켜야함</span>
        </h2>
        <button type="button" className="copy-btn" onClick={copyAllSQL}>
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
