"use client";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  setNavigating?: (v: boolean) => void;
};

export default function TransitionLink({
  href,
  children,
  className,
  setNavigating,
}: Props) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();

    setNavigating?.(true);

    requestAnimationFrame(() => {
      router.push(href);
    });
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}