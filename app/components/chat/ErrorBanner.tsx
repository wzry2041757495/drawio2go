"use client";

import { Alert, Button } from "@heroui/react";

interface ErrorBannerProps {
  error: string | null;
}

export default function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) {
    return null;
  }

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <Alert status="danger" className="mb-3">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>无法发送请求</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Content>
      <Button size="sm" variant="danger" onPress={handleReload}>
        刷新页面
      </Button>
    </Alert>
  );
}
