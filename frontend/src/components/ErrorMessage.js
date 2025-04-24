import React from 'react';
import PropTypes from 'prop-types';
import '../styles/ErrorMessage.css';

const ErrorMessage = ({ message, onRetry }) => {
  if (!message) return null;

  // Ensure message is a string before splitting
  const messageStr = typeof message === 'string' ? message : String(message);

  // Split message by newlines to handle multi-line error messages
  const messageLines = messageStr.split('\n');

  return (
    <div className="error-message">
      {messageLines.length === 1 ? (
        <p>{messageStr}</p>
      ) : (
        <ul>
          {messageLines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onRetry: PropTypes.func,
};

export default ErrorMessage;
