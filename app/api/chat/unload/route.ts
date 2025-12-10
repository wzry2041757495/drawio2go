import { NextResponse, type NextRequest } from "next/server";

/**
 * 页面卸载时的轻量级上报终点。
 *
 * - 主要用于配合 `navigator.sendBeacon`，在页面关闭/刷新时快速接收断开通知。
 * - 当前仅做快速 ACK，实际消息持久化仍由前端存储层负责。
 */
export async function POST(_req: NextRequest) {
  return new NextResponse(null, { status: 204 });
}
