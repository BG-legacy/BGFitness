/**
 * Mobile Detection Middleware
 * Detects mobile client requests and applies appropriate handling
 */

/**
 * Middleware function that detects if a request is coming from a mobile client
 * and sets appropriate request properties for downstream handlers
 */
const mobileDetect = (req, res, next) => {
  // Check user agent string for mobile identifiers
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);
  
  // Check for Capacitor/Ionic specific headers
  const isCapacitor = req.headers['x-capacitor-client'] || req.headers['x-ionic-client'] || false;
  
  // Add isMobile flag to request object for other middleware/routes to use
  req.isMobile = isMobile || isCapacitor;
  
  // Add mobile info to request for debugging/logging
  req.mobileInfo = {
    userAgent,
    isCapacitor,
    isMobile: req.isMobile,
    origin: req.headers.origin,
    host: req.headers.host
  };
  
  // Log mobile detection for debugging purposes (only in development)
  if (process.env.NODE_ENV === 'development' && req.isMobile) {
    console.log('Mobile client detected:', req.mobileInfo);
  }
  
  // Proceed to next middleware
  next();
};

module.exports = mobileDetect; 