import type { AppProps } from "next/app";
import Link from "next/link";
import "@/styles/global.css"; // 전역 스타일

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <header
        style={{ display: "flex", justifyContent: "center", gap: "1rem" }}
      >
        <Link href="/project-sql-builder">프로젝트 공장</Link>
        <Link href="/sql-builder">아티클 공장</Link>
      </header>
      <Component {...pageProps} />
    </>
  );
}
