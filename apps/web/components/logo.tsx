"use client";
import Image from "next/image";
import Link from "next/link";

type Size = "sm" | "md" | "lg";

export function Logo({ size = "md", withText = false, href = "/" }: { size?: Size; withText?: boolean; href?: string }) {
  const dims = size === "sm" ? 28 : size === "lg" ? 64 : 40;
  return (
    <Link href={href} className="inline-flex items-center gap-2 select-none">
      {/* Place your logo image at apps/web/public/tiasas-logo.png */}
      <Image src="/tiasas-logo.png" alt="TIASAS logo" width={dims} height={dims} priority />
      {withText ? <span className="font-semibold tracking-wide">TIASAS</span> : null}
    </Link>
  );
}

