// app/components/TopLoader.tsx
"use client";

import NextTopLoader from "nextjs-toploader";

export default function TopLoader() {
  return (
    <NextTopLoader
      showSpinner={false}
      height={3}
      shadow={false}
      zIndex={99999}
    />
  );
}