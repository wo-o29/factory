import React, { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";

export default function TextArea({ value, onChange, ...props }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [height, setHeight] = useState("auto");
  console.log(height);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (textareaRef.current) {
      // 우선 높이를 초기화
      flushSync(() => setHeight("auto"));
      setHeight(`${textareaRef.current.scrollHeight}px`); // 내용에 맞춰 높이 지정
    }
  };

  // // 초기 로드나 value 변경 시 동기화
  useEffect(() => {
    if (textareaRef.current) {
      setHeight("auto");
      setHeight(`${textareaRef.current.scrollHeight}px`);
    }
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      style={{
        height,
        overflow: "hidden",
        resize: "none",
        width: "100%",
        padding: 8,
        lineHeight: 1.4,
        fontSize: 13,
        color: "transparent",
      }} // 재조정 위한 스타일
    />
  );
}
