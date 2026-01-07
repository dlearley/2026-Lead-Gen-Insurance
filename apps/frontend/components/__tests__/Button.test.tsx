import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  const defaultProps = {
    children: 'Click me',
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(<Button {...defaultProps}>Test Button</Button>);
    expect(screen.getByRole('button', { name: /test button/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button {...defaultProps} onClick={onClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button {...defaultProps} disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button {...defaultProps} disabled onClick={onClick}>Disabled Click</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button {...defaultProps} variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button {...defaultProps} variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<Button {...defaultProps} variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Button {...defaultProps} size="small">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');

    rerender(<Button {...defaultProps} size="medium">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-md');

    rerender(<Button {...defaultProps} size="large">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('shows loading state', () => {
    render(<Button {...defaultProps} loading>Loading</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveTextContent(/loading/i);
  });

  it('renders icon when provided', () => {
    const Icon = () => <span data-testid="icon">★</span>;
    render(<Button {...defaultProps} icon={<Icon />}>With Icon</Button>);
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Button {...defaultProps} className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
