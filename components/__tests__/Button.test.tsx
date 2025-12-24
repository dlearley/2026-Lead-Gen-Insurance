import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("applies primary variant by default", () => {
    const { container } = render(<Button>Primary</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveClass("btn-primary");
  });

  it("applies variant classes correctly", () => {
    const { container: secondaryContainer } = render(<Button variant="secondary">Secondary</Button>);
    const { container: outlineContainer } = render(<Button variant="outline">Outline</Button>);
    const { container: dangerContainer } = render(<Button variant="danger">Danger</Button>);
    
    expect(secondaryContainer.querySelector("button")).toHaveClass("btn-secondary");
    expect(outlineContainer.querySelector("button")).toHaveClass("btn-outline");
    expect(dangerContainer.querySelector("button")).toHaveClass("btn-danger");
  });

  it("applies size classes correctly", () => {
    const { container: smContainer } = render(<Button size="sm">Small</Button>);
    const { container: lgContainer } = render(<Button size="lg">Large</Button>);
    
    expect(smContainer.querySelector("button")).toHaveClass("btn-sm");
    expect(lgContainer.querySelector("button")).toHaveClass("btn-lg");
  });

  it("shows loading spinner when isLoading is true", () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByText("⟳")).toBeInTheDocument();
  });

  it("disables button when disabled is true", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("renders left and right icons", () => {
    render(
      <Button leftIcon={<span>←</span>} rightIcon={<span>→</span>}>
        With Icons
      </Button>
    );
    expect(screen.getByText("←")).toBeInTheDocument();
    expect(screen.getByText("→")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByRole("button").click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
