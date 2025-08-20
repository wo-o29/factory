import { TECH_NAME_TO_ID } from "@/tech";
import { parseCSV } from "@/utils/parseCSV";
import { ArticleData, CATEGORY_KEY } from "../SqlBuilder.page";

// 유효성 검사 함수
export const validateArticle = (
  article: ArticleData
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const categoryNames = parseCSV(article.category).map((s) => s.toLowerCase());
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
  if (article.articleUrl.length < 1 || article.articleUrl.length >= 500) {
    errors.articleUrl = "필수, 1~500자 이하";
  }
  if (categoryNames.length !== 1) {
    errors.category = "category는 반드시 1개 입력";
  } else if (!CATEGORY_KEY.includes(categoryNames[0])) {
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
