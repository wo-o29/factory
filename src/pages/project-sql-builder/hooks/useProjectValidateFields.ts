import { TECH_NAME_TO_ID } from "@/tech";
import { useMemo } from "react";
import { CATEGORY_ID } from "..";
import { parseCSV } from "../../../utils/parseCSV";

// 유효성 검사 함수
export const useProjectValidateFields = (projectData) => {
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

  return { validateFields };
};
