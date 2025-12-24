import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renders correctly", () => {
    render(<Input placeholder="Test input" />);
    expect(screen.getByPlaceholderText("Test input")).toBeInTheDocument();
  });

  it("shows label when provided", () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("shows error message when provided", () => {
    render(<Input error="This field is required" id="test" />);
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("applies error class when error exists", () => {
    const { container } = render(<Input error="Error" id="test" />);
    const input = container.querySelector("input");
    expect(input).toHaveClass("input-error");
  });

  it("accepts all standard input props", () => {
    render(<Input type="email" placeholder="Email" id="email" value="test@test.com" />);
    const input = screen.getByPlaceholderText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveValue("test@test.com");
  });
});
