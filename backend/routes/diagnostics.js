/**
 * Diagnostics API Routes
 * Provides endpoints for troubleshooting and system health checks
 */

const express = require('express');
const router = express.Router();
const os = require('os');

/**
 * @route   GET /api/diagnostics/ping
 * @desc    Simple ping endpoint to verify API connectivity
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is reachable',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/diagnostics/info
 * @desc    Returns system and connection information for troubleshooting
 * @access  Public
 */
router.get('/info', (req, res) => {
  // Get network interfaces (for helping users find the right IP)
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses = [];
  
  // Filter for IPv4 addresses
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(interfaceInfo => {
      if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
        ipAddresses.push({
          interface: interfaceName,
          address: interfaceInfo.address
        });
      }
    });
  });
  
  // Gather Render-specific deployment information
  const renderInfo = {
    isRender: process.env.RENDER === 'true' || !!process.env.RENDER_EXTERNAL_URL,
    serviceId: process.env.RENDER_SERVICE_ID || 'Not available',
    serviceUrl: process.env.RENDER_EXTERNAL_URL || 'Not available',
    git: {
      commit: process.env.RENDER_GIT_COMMIT || 'Not available',
      branch: process.env.RENDER_GIT_BRANCH || 'Not available',
      repo: process.env.RENDER_GIT_REPO_SLUG || 'Not available'
    }
  };
  
  // Return detailed diagnostics information
  res.status(200).json({
    success: true,
    server: {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + ' seconds',
      platform: os.platform(),
      nodeVersion: process.version,
      ipAddresses,
      renderDeployment: renderInfo
    },
    client: {
      ip: req.ip,
      isMobile: req.isMobile || false, // Set by mobileDetect middleware
      mobileInfo: req.mobileInfo || {},
      userAgent: req.headers['user-agent'],
      headers: req.headers
    },
    cors: {
      allowedOrigins: req.app.get('allowedOrigins') || 'Not set'
    }
  });
});

/**
 * @route   GET /api/diagnostics/healthcheck
 * @desc    Detailed health check for monitoring systems
 * @access  Public
 */
router.get('/healthcheck', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'operational',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/diagnostics/mobile
 * @desc    Simple endpoint specifically for mobile app testing
 * @access  Public
 */
router.get('/mobile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Mobile API connection successful',
    timestamp: new Date().toISOString(),
    serverInfo: {
      url: 'https://bgfitness.onrender.com',
      environment: process.env.NODE_ENV || 'development'
    },
    clientInfo: {
      isMobile: req.isMobile || false,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });
});

module.exports = router; 