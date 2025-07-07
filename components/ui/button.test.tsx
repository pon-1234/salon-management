import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button";

describe("Button component", () => {
  it("should render the button with its children", () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByRole("button", { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
  });

  it("should call the onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const buttonElement = screen.getByRole("button", { name: /click me/i });
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should apply the correct variant and size classes", () => {
    render(<Button variant="destructive" size="lg">Delete</Button>);
    const buttonElement = screen.getByRole("button", { name: /delete/i });
    expect(buttonElement).toHaveClass("bg-destructive", "h-11");
  });

  it("should render as a different component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/link">I am a link</a>
      </Button>
    );
    const linkElement = screen.getByRole("link", { name: /i am a link/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.tagName).toBe("A");
  });

  it("should be disabled when the disabled prop is set", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled Button</Button>);
    const buttonElement = screen.getByRole("button", { name: /disabled button/i });
    expect(buttonElement).toBeDisabled();
    fireEvent.click(buttonElement);
    expect(handleClick).not.toHaveBeenCalled();
  });
}); 