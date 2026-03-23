export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} — ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error.",
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: "Visit /api for all available endpoints.",
  });
};
