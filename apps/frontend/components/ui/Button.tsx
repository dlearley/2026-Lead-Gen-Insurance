import { ButtonHTMLAttributes, cloneElement, forwardRef, isValidElement } from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = "btn";
    const variantClasses = {
      default: "btn-primary",
      primary: "btn-primary",
      secondary: "btn-secondary",
      outline: "btn-outline",
      danger: "btn-danger",
      ghost: "btn-ghost",
    };
    const sizeClasses = {
      sm: "btn-sm",
      md: "btn-md",
      lg: "btn-lg",
    };

    const computedClassName = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      disabled || isLoading ? "opacity-50 cursor-not-allowed" : "",
      className
    );

    if (asChild && isValidElement(children)) {
      const childClassName = (children.props as { className?: string }).className;
      return cloneElement(children, {
        className: cn(computedClassName, childClassName),
        onClick: props.onClick,
      });
    }

    return (
      <button ref={ref} className={computedClassName} disabled={disabled || isLoading} {...props}>
        {isLoading && <span className="animate-spin mr-2">⟳</span>}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
