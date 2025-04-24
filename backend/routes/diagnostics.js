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

/**
 * @route   POST /api/diagnostics/mobile-ai-test
 * @desc    Test endpoint for mobile AI functionality
 * @access  Public
 */
router.post('/mobile-ai-test', async (req, res) => {
  try {
    // Import OpenAI service directly in this route
    const openaiService = require('../services/openaiService');
    
    // Simple test prompt that doesn't require a lot of token
    const testPrompt = {
      prompt: req.body.prompt || "Generate a simple test response",
      isMobile: true
    };
    
    // Simple system prompt
    const testSystemPrompt = `You are a helpful assistant. 
    Respond with a simple JSON response with the following format:
    {
      "message": "string",
      "status": "success",
      "timestamp": "ISO date string"
    }`;
    
    // Run a quick, simple AI test - force mobile mode
    const result = await openaiService.generateResponse(testPrompt, testSystemPrompt, true);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: "Mobile AI test completed successfully",
      testResult: result,
      timestamp: new Date().toISOString(),
      mobileDetected: req.isMobile || false,
      connectionInfo: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        host: req.headers.host,
        origin: req.headers.origin
      }
    });
  } catch (error) {
    // Return detailed error information to help diagnose issues
    res.status(500).json({
      success: false,
      message: "Mobile AI test failed",
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : null
      },
      timestamp: new Date().toISOString(),
      mobileDetected: req.isMobile || false
    });
  }
});

/**
 * @route   GET /api/diagnostics/mobile-ai-test
 * @desc    GET endpoint for mobile AI testing - can be directly accessed from mobile browser
 * @access  Public
 */
router.get('/mobile-ai-test', async (req, res) => {
  try {
    // Import OpenAI service directly in this route
    const openaiService = require('../services/openaiService');
    
    // Simple test prompt with minimal tokens needed
    const testPrompt = {
      prompt: "Generate a very simple response to test mobile connection",
      isMobile: true
    };
    
    // Very simple system prompt to minimize token usage
    const testSystemPrompt = `You are a system tester. Keep your response under 50 tokens. 
    Respond with a simple JSON object: {"message": "AI connection working", "status": "success"}`;
    
    // Run a minimal AI test - force mobile mode with small token count
    const result = await openaiService.generateResponse(testPrompt, testSystemPrompt, true);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: "Mobile AI test GET endpoint successful",
      testResult: result,
      timestamp: new Date().toISOString(),
      mobileDetected: req.isMobile || false,
      connectionInfo: {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });
  } catch (error) {
    // Return simplified error for GET endpoint
    res.status(500).json({
      success: false,
      message: "Mobile AI test failed: " + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/diagnostics
 * @desc    API Guide for all diagnostic endpoints
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BGFitness API Diagnostics Guide',
    endpoints: [
      {
        path: '/api/diagnostics/ping',
        method: 'GET',
        description: 'Simple connectivity test'
      },
      {
        path: '/api/diagnostics/mobile',
        method: 'GET',
        description: 'Mobile client connectivity test'
      },
      {
        path: '/api/diagnostics/mobile-ai-test',
        method: 'GET',
        description: 'Test AI connectivity from mobile (minimal test)'
      },
      {
        path: '/api/diagnostics/mobile-ai-test',
        method: 'POST',
        description: 'Comprehensive AI test with custom prompt support'
      },
      {
        path: '/api/diagnostics/info',
        method: 'GET',
        description: 'Detailed system and connection information'
      },
      {
        path: '/api/diagnostics/healthcheck',
        method: 'GET',
        description: 'System health status'
      }
    ],
    mainApiEndpoints: [
      {
        path: '/api/workout',
        method: 'POST',
        description: 'Generate workout plan'
      },
      {
        path: '/api/nutrition',
        method: 'POST',
        description: 'Generate nutrition plan'
      }
    ],
    serverUrl: 'https://bgfitness.onrender.com',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 