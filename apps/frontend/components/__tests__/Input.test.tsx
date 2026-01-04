import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input Component', () => {
  const defaultProps = {
    name: 'email',
    label: 'Email',
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label correctly', () => {
    render(<Input {...defaultProps} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(<Input {...defaultProps} error="This field is required" />);
    expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
  });

  it('shows helper text when provided', () => {
    render(<Input {...defaultProps} helperText="Enter your email address" />);
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
  });

  it('calls onChange when value changes', async () => {
    const onChange = vi.fn();
    render(<Input {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByLabelText(/email/i);
    await userEvent.type(input, 'test@example.com');
    
    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveValue('test@example.com');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input {...defaultProps} disabled />);
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
  });

  it('accepts different input types', () => {
    const { rerender } = render(<Input {...defaultProps} type="password" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'password');

    rerender(<Input {...defaultProps} type="number" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'number');

    rerender(<Input {...defaultProps} type="tel" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'tel');
  });

  it('applies placeholder text', () => {
    render(<Input {...defaultProps} placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Input {...defaultProps} required />);
    expect(screen.getByText(/\*/i)).toBeInTheDocument();
  });

  it('handles focus state', () => {
    render(<Input {...defaultProps} />);
    const input = screen.getByLabelText(/email/i);
    
    fireEvent.focus(input);
    expect(input).toHaveFocus();
    
    fireEvent.blur(input);
    expect(input).not.toHaveFocus();
  });

  it('applies custom className', () => {
    render(<Input {...defaultProps} className="custom-input" />);
    expect(screen.getByLabelText(/email/i)).toHaveClass('custom-input');
  });

  it('supports full width mode', () => {
    render(<Input {...defaultProps} fullWidth />);
    expect(screen.getByLabelText(/email/i)).toHaveClass('w-full');
  });
});

describe('Input Validation States', () => {
  it('shows valid state', () => {
    render(<Input name="email" label="Email" value="test@example.com" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows invalid state with aria attributes', () => {
    render(<Input name="email" label="Email" value="invalid" error="Invalid email" onChange={vi.fn()} />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });
});
