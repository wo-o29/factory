import { TECH_VALUES } from "@/tech";
import { ArticleData } from "../SqlBuilder.page";

export const createNewArticle = (url?: string, jsonData?: any): ArticleData => {
  const allData = jsonData.title + jsonData.content;
  // console.log("모든 데이터:", allData);
  const filteredStacks = TECH_VALUES.filter((techStack) => {
    const regex = new RegExp(`\\b${techStack}\\b`, "i");
    return regex.test(allData);
  });
  const techStacks = filteredStacks.join(", ");

  return {
    id: Date.now() + Math.random(),
    title: jsonData?.title || "",
    summary: jsonData?.summary || "",
    articleUrl: url || "",
    category: "",
    techStacks,
    content: jsonData?.content || "",
    createdAt: new Date("2025-08-20T00:00:00.000Z"),
    updatedAt: new Date("2025-08-20T00:00:00.000Z"),
    clicks: 0,
    expanded: true,
  };
};
