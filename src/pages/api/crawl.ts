import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // 원본 크롤러 프록시 서비스 호출
    const response = await fetch(
      `https://crawlerproxy.p-e.kr/do?url=${encodeURIComponent(url)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Crawling error:", error);
    return res.status(500).json({
      error: "Failed to crawl URL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
