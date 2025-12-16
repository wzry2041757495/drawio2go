"use client";

import ChatInputArea from "./ChatInputArea";
import type { ComponentProps } from "react";

type ComposerProps = ComponentProps<typeof ChatInputArea>;

/**
 * 底部输入区域容器
 *
 * 将原有 ChatInputArea 的 props 聚合，便于 ChatSidebar 精简结构。
 */
export default function Composer(props: ComposerProps) {
  return <ChatInputArea {...props} />;
}
