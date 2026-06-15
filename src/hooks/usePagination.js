import { useState, useMemo } from 'react';

export function usePagination(data, perPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil((data?.length || 0) / perPage));

  const paginatedData = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * perPage;
    return data.slice(start, start + perPage);
  }, [data, currentPage, perPage]);

  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    setCurrentPage, // allow manual reset
  };
}
