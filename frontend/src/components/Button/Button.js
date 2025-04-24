import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

const Button = ({ children, variant = 'primary', size = 'medium', onClick, disabled, className }) => {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className || ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'text']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;
