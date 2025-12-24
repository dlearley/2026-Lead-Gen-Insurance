import React from 'react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (total === 0) {
    return null;
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {startItem} to {endItem} of {total} leads
      </div>

      <div className="pagination-controls">
        <div className="page-size-selector">
          <label htmlFor="page-size">Show:</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="page-numbers">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ← Previous
          </button>

          {getPageNumbers().map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={index}
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            ) : (
              <span key={index} className="page-ellipsis">
                {page}
              </span>
            )
          )}

          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};
