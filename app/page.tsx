"use client";

import HomePage from "../components/HomePage";

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");
const brandLogoSrc = `${BASE_PATH}/fastsigns-logo.svg`;

export default function Page() {
  return <HomePage brandLogoSrc={brandLogoSrc} />;
}
