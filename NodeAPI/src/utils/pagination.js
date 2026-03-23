function normalizePagination(query = {}, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(1, Number(query.page) || 1);
  const requestedLimit = Number(query.limit) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, requestedLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginationMeta({ total, page, limit }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

module.exports = { normalizePagination, buildPaginationMeta };
