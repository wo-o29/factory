import { TECH_VALUES } from "@/tech";
import { ArticleData } from "../../pages/sql-builder";

const KOREAN_CATEGORY = {
  프론트엔드: "fe",
  프론트: "fe",
  frontend: "fe",
  fe: "fe",
  백엔드: "be",
  backend: "be",
  be: "be",
  안드로이드: "android",
  "안드로이드 앱": "android",
  android: "android",
  "ios 앱": "ios",
  ios: "ios",
  소프트스킬: "ss",
  "소프트 스킬": "ss",
  "soft skill": "ss",
  softskill: "ss",
};
const KOREAN_CATEGORY_KEYS = Object.keys(KOREAN_CATEGORY);

export const createNewArticle = (url?: string, jsonData?: any): ArticleData => {
  const allData = jsonData.title + jsonData.content;
  const tokens = allData.toLowerCase().split(/\W+/); // 단어 단위 분리

  const filteredStacks = TECH_VALUES.filter((techStack) =>
    //  const regex = new RegExp(`\\b${techStack}\\b`, "i");
    // return regex.test(allData);
    tokens.includes(techStack.toLowerCase())
  );
  const techStacks = [...new Set(filteredStacks)].join(", ");

  const filteredCategory = KOREAN_CATEGORY_KEYS.filter((category) => {
    // const regex = new RegExp(`\\b${category}\\b`, "i");
    // return regex.test(allData);
    return tokens.includes(category.toLowerCase());
  });

  const category = [
    ...new Set(filteredCategory.map((category) => KOREAN_CATEGORY[category])),
  ].join(", ");

  return {
    id: Date.now() + Math.random(),
    title: jsonData?.title || "",
    summary: jsonData?.summary.trim().substring(0, 255) || "",
    articleUrl: url || "",
    category,
    techStacks,
    content: jsonData?.content || "",
    createdAt: new Date("2025-08-19T00:00:00.000Z"),
    updatedAt: new Date("2025-08-19T00:00:00.000Z"),
    clicks: 0,
    expanded: true,
  };
};
