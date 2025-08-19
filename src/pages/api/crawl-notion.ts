// pages/api/crawl-notion.ts
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

export default async function handler(req, res) {
  const { url } = req.query;

  let browser;
  try {
    // Vercel/AWS Lambda용 설정
    const isProduction = process.env.NODE_ENV === "production";
    browser = await puppeteer.launch({
      args: isProduction
        ? chromium.args
        : [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
          ],
      defaultViewport: chromium.defaultViewport,
      executablePath: isProduction
        ? await chromium.executablePath()
        : undefined, // 로컬에서는 기본 Chrome 사용
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("🚀 페이지 로딩 중:", url);

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    // 노션 콘텐츠 로드 대기
    try {
      await page.waitForSelector("[data-block-id]", { timeout: 10000 });
    } catch (e) {
      console.log("⚠️ 노션 블록을 찾을 수 없음");
    }

    const textContent = await page.evaluate(() => {
      // 1. 제목 추출
      const title =
        document.querySelector("h1")?.innerText ||
        document.querySelector('[data-content-editable-leaf="true"]')
          ?.innerText ||
        document.querySelector('[placeholder="Untitled"]')?.value ||
        "";

      // 2. 모든 블록 수집
      const allBlocks = Array.from(
        document.querySelectorAll("[data-block-id]")
      );

      // 6. 블록 필터링 (콘텐츠 시작점 이후만 + 메타데이터 제외)
      const contentBlocks = allBlocks;

      // 7. 텍스트 포맷 처리
      const blockTexts = allBlocks
        .map((block) => {
          const text = block.innerText?.trim();
          // const isHeading = block.querySelector("h1, h2, h3, h4, h5, h6");
          // if (isHeading) return `\n## ${text}\n`;

          // const isList =
          //   block.closest("ul, ol") ||
          //   text.startsWith("•") ||
          //   text.startsWith("-") ||
          //   text.startsWith("*");
          // if (isList) return `• ${text}`;

          return text;
        })
        .filter((text) => text && text.length > 0);

      return {
        title: title.trim(),
        totalBlocks: allBlocks.length,
        contentBlocks: contentBlocks.length,
        blockTexts,
        mainContent: blockTexts.join("\n\n"),
      };
    });

    // 콘솔에 추출 결과 출력
    console.log("📝 제목:", textContent.title);
    console.log("\n=== 본문 내용 ===");
    console.log(textContent.mainContent);

    // API 응답
    return res.status(200).json({
      title: textContent.title,
      summary: textContent.mainContent.substring(0, 200), // 처음 200자
      content: textContent.mainContent.substring(0, 2000), // 처음 2000자
      debug: {
        totalBlocks: textContent.totalBlocks,
        contentBlocks: textContent.contentBlocks,
      },
    });
  } catch (error) {
    console.error("❌ 노션 크롤링 에러:", error);
    return res.status(500).json({
      error: "Failed to crawl Notion page",
      message: error.message,
    });
  } finally {
    if (browser) {
      console.log("🔄 브라우저 종료");
      // await browser.close();
    }
  }
}
