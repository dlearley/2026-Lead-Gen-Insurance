import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays title correctly', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText(/test modal/i)).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText(/modal content/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking overlay', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside modal content', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    
    const content = screen.getByText(/modal content/i);
    fireEvent.click(content);
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key press', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    render(
      <Modal
        {...defaultProps}
        footer={<button>Footer Button</button>}
      />
    );
    expect(screen.getByText(/footer button/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal" />);
    expect(screen.getByRole('dialog')).toHaveClass('custom-modal');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="small" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-sm');

    rerender(<Modal {...defaultProps} size="medium" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-md');

    rerender(<Modal {...defaultProps} size="large" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-lg');

    rerender(<Modal {...defaultProps} size="fullscreen" />);
    expect(screen.getByRole('dialog')).toHaveClass('modal-fullscreen');
  });

  it('focuses on modal when opened', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveFocus();
  });
});
