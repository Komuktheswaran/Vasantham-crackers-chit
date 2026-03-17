const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message, error = null, statusCode = 500) => {
  console.error(`Error: ${message}`, error);
  return res.status(statusCode).json({
    success: false,
    message,
    // Never expose internal error details in production — only log them server-side
    error: process.env.NODE_ENV === 'production' ? null : (error ? error.message || error : null),
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
