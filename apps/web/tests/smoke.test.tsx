import { describe, it, expect } from "vitest";
import Page from "@/app/page";
import { render } from "@testing-library/react";

describe("landing page", () => {
  it("renders marketing cards", () => {
    const { getByText } = render(<Page /> as any);
    expect(getByText("TIASAS")).toBeTruthy();
    expect(getByText("Market Desk")).toBeTruthy();
  });
});

