const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Default error status and message
    let statusCode = err.statusCode || 500;
    let message = 'Internal Server Error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message || 'Validation failed';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = err.message || 'Not authorized';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = err.message || 'Access forbidden';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = err.message || 'Resource not found';
    }

    // Send error response
    const errorResponse = {
        success: false,
        error: {
            message,
            status: statusCode
        }
    };

    // Add stack trace in development environment
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler; 