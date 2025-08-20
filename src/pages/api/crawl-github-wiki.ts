// pages/api/crawl-github-wiki.ts
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

export default async function handler(req, res) {
  const { url } = req.query;

  // GitHub Wiki URL 유효성 검사
  if (!url || !url.includes("github.com") || !url.includes("/wiki/")) {
    return res.status(400).json({
      error: "Invalid URL",
      message:
        "GitHub Wiki URL이 필요합니다. 예: https://github.com/user/repo/wiki/PageName",
    });
  }

  let browser;
  const startTime = Date.now();
  try {
    // Vercel/AWS Lambda용 설정
    const isProduction = process.env.NODE_ENV === "production";
    browser = await puppeteer.launch({
      args: isProduction
        ? [...chromium.args, "--disable-dev-shm-usage", "--single-process"]
        : [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--single-process",
          ],
      defaultViewport: chromium.defaultViewport,
      executablePath: isProduction
        ? await chromium.executablePath()
        : undefined,
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const blockedResources = ["image", "stylesheet", "font", "media"];
      if (blockedResources.includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("🚀 GitHub Wiki 페이지 로딩 중:", url);

    // await page.goto(url, {
    //   waitUntil: "networkidle2",
    //   timeout: 30000,
    // });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // GitHub Wiki 콘텐츠 로드 대기
    try {
      await page.waitForSelector(
        ".markdown-body, #wiki-content, .wiki-wrapper",
        { timeout: 5000 }
      );
    } catch (e) {
      console.log("⚠️ GitHub Wiki 콘텐츠를 찾을 수 없음");
    }

    const wikiContent = await page.evaluate(() => {
      // 1. 제목 추출 (GitHub Wiki 제목 구조)
      const title =
        document.querySelector(".gh-header-title")?.innerText ||
        document.querySelector("h1")?.innerText ||
        document.querySelector(".wiki-page-title")?.innerText ||
        document.querySelector("#wiki-wrapper h1")?.innerText ||
        document.title.replace(" · Wiki · GitHub", "") ||
        "";

      // 2. 메인 콘텐츠 영역 찾기
      const contentContainer =
        document.querySelector(".markdown-body") ||
        document.querySelector("#wiki-content") ||
        document.querySelector(".wiki-wrapper") ||
        document.querySelector("#wiki-body");

      if (!contentContainer) {
        return {
          title: title.trim(),
          content: "콘텐츠를 찾을 수 없습니다.",
          headings: [],
          links: [],
          codeBlocks: [],
        };
      }

      // 3. 헤딩 추출
      const headings = Array.from(
        contentContainer.querySelectorAll("h1, h2, h3, h4, h5, h6")
      ).map((heading) => ({
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.innerText.trim(),
        id: heading.id || "",
      }));

      // 4. 링크 추출
      const links = Array.from(contentContainer.querySelectorAll("a"))
        .map((link) => ({
          text: link.innerText.trim(),
          href: link.href,
          isInternal:
            link.href.includes("github.com") && link.href.includes("/wiki/"),
        }))
        .filter((link) => link.text && link.href);

      // 5. 코드 블록 추출
      const codeBlocks = Array.from(
        contentContainer.querySelectorAll("pre code, .highlight")
      )
        .map((codeElement, index) => ({
          index: index + 1,
          language:
            codeElement.className.match(/language-(\w+)/)?.[1] || "text",
          code: codeElement.innerText.trim(),
        }))
        .filter((block) => block.code);

      // 6. 전체 텍스트 콘텐츠 추출 (마크다운 형식 유지)
      const processElement = (element) => {
        let text = "";

        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();

            switch (tagName) {
              case "h1":
                text += `\n# ${node.innerText.trim()}\n`;
                break;
              case "h2":
                text += `\n## ${node.innerText.trim()}\n`;
                break;
              case "h3":
                text += `\n### ${node.innerText.trim()}\n`;
                break;
              case "h4":
                text += `\n#### ${node.innerText.trim()}\n`;
                break;
              case "h5":
                text += `\n##### ${node.innerText.trim()}\n`;
                break;
              case "h6":
                text += `\n###### ${node.innerText.trim()}\n`;
                break;
              case "p":
                text += `${node.innerText.trim()}\n`;
                break;
              case "ul":
              case "ol":
                const listItems = Array.from(node.querySelectorAll("li"))
                  .map((li) => `• ${li.innerText.trim()}`)
                  .join("\n");
                text += `${listItems}\n`;
                break;
              case "pre":
                const codeText = node.innerText.trim();
                text += `\`\`\`\n${codeText}\n\`\`\`\n`;
                break;
              case "code":
                if (!node.closest("pre")) {
                  text += `\`${node.innerText.trim()}\``;
                }
                break;
              case "blockquote":
                const quoteLines = node.innerText
                  .trim()
                  .split("\n")
                  .map((line) => `> ${line}`)
                  .join("\n");
                text += `${quoteLines}\n`;
                break;
              case "table":
                text += `[표 내용]\n`;
                break;
              default:
                text += processElement(node);
            }
          }
        }

        return text;
      };

      const mainContent = processElement(contentContainer);

      // 7. 목차 생성
      const toc = headings
        .map((heading) => `${"  ".repeat(heading.level - 1)}- ${heading.text}`)
        .join("\n");

      return {
        title: title.trim(),
        summary: mainContent.trim(),
        content: mainContent.trim(),
        headings,
        links,
        codeBlocks,
        toc,
        repository: {
          owner: window.location.pathname.split("/")[1] || "",
          repo: window.location.pathname.split("/")[1] || "",
          pageName: window.location.pathname.split("/wiki/")[2] || "",
        },
      };
    });

    const endTime = Date.now(); // 종료 시간 기록
    console.log(`⏱ 크롤링 소요 시간: ${(endTime - startTime) / 1000}초`);

    // // 콘솔에 추출 결과 출력
    // console.log("📝 위키 제목:", wikiContent.title);
    // console.log(
    //   "📁 저장소:",
    //   `${wikiContent.repository.owner}/${wikiContent.repository.repo}`
    // );
    // console.log("📄 페이지명:", wikiContent.repository.pageName);
    // console.log("\n=== 목차 ===");
    // console.log(wikiContent.toc);
    // console.log("\n=== 본문 내용 (처음 500자) ===");
    // console.log(wikiContent.content.substring(0, 500) + "...");

    // API 응답
    return res.status(200).json({
      title: wikiContent.title,
      repository: wikiContent.repository,
      summary: wikiContent.summary,
      content: wikiContent.content,
      sliceContent: wikiContent.content.substring(0, 2000), // 처음 2000자
      toc: wikiContent.toc, // 목차
      headings: wikiContent.headings,
      links: wikiContent.links,
      codeBlocks: wikiContent.codeBlocks,

      debug: {
        totalHeadings: wikiContent.headings.length,
        totalLinks: wikiContent.links.length,
        totalCodeBlocks: wikiContent.codeBlocks.length,
        contentLength: wikiContent.content.length,
      },
    });
  } catch (error) {
    console.error("❌ GitHub Wiki 크롤링 에러:", error);
    return res.status(500).json({
      error: "Failed to crawl GitHub Wiki page",
      message: error.message,
      details: error.stack,
    });
  } finally {
    if (browser) {
      console.log("🔄 브라우저 종료");
      await browser.close();
    }
  }
}
