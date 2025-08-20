import { TECH_VALUES } from "@/tech";
import { ArticleData } from "..";

const KOREAN_CATEGORY_VALUES = [
  "프론트엔드",
  "프론트",
  "frontend",
  "fe",
  "백엔드",
  "backend",
  "be",
  "안드로이드",
  "안드로이드 앱",
  "android",
  "ios 앱",
  "ios",
  "소프트스킬",
  "소프트 스킬",
  "soft skill",
  "softskill",
];

export const createNewArticle = (url?: string, jsonData?: any): ArticleData => {
  const allData = jsonData.title + jsonData.content;
  // console.log("모든 데이터:", allData);
  const filteredStacks = TECH_VALUES.filter((techStack) => {
    const regex = new RegExp(`\\b${techStack}\\b`, "i");
    return regex.test(allData);
  });
  const techStacks = filteredStacks.join(", ");

  const filteredCategory = KOREAN_CATEGORY_VALUES.filter((category) => {
    const regex = new RegExp(`\\b${category}\\b`, "i");
    return regex.test(allData);
  });
  const category = filteredCategory.join(", ");

  return {
    id: Date.now() + Math.random(),
    title: jsonData?.title || "",
    summary: jsonData?.summary || "",
    articleUrl: url || "",
    category,
    techStacks,
    content: jsonData?.content || "",
    createdAt: new Date("2025-08-20T00:00:00.000Z"),
    updatedAt: new Date("2025-08-20T00:00:00.000Z"),
    clicks: 0,
    expanded: true,
  };
};
