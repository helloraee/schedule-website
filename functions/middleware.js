// Single-user session management for Cloudflare Pages
const SESSIONS = new Map();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const CORRECT_PASSWORD = "12345"; // ⚠️ CHANGE THIS PASSWORD!
const MAX_SESSIONS = 1; // Only one user can be logged in at a time

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Allow access to auth endpoints
  if (url.pathname.startsWith('/api/auth') || url.pathname === '/login') {
    return context.next();
  }
  
  // Handle login form submission
  if (url.pathname === '/' && request.method === 'POST') {
    return handleLoginSubmission(request);
  }
  
  // Check for authentication
  const sessionToken = getCookie(request, 'session_token');
  
  if (!sessionToken || !isValidSession(sessionToken)) {
    return new Response(getLoginPage(), {
      headers: { 'Content-Type': 'text/html' },
      status: 401
    });
  }
  
  // Valid session - continue to the app
  return context.next();
}

async function handleLoginSubmission(request) {
  try {
    const formData = await request.formData();
    const password = formData.get('password');
    
    if (password !== CORRECT_PASSWORD) {
      return new Response(getLoginPage('ACCESS DENIED - INVALID CREDENTIALS'), {
        headers: { 'Content-Type': 'text/html' },
        status: 401
      });
    }
    
    // Check if there's already an active session
    cleanExpiredSessions();
    
    if (SESSIONS.size >= MAX_SESSIONS) {
      return new Response(getLoginPage('SYSTEM LOCKED - ANOTHER USER IS CURRENTLY LOGGED IN'), {
        headers: { 'Content-Type': 'text/html' },
        status: 423
      });
    }
    
    // Create new session
    const sessionToken = generateSecureToken();
    const expiresAt = Date.now() + SESSION_DURATION;
    
    SESSIONS.set(sessionToken, {
      expires: expiresAt,
      created: Date.now(),
      ip: request.headers.get('CF-Connecting-IP') || 'unknown'
    });
    
    // Set secure cookie and redirect
    const cookie = `session_token=${sessionToken}; Max-Age=${SESSION_DURATION / 1000}; HttpOnly; Secure; SameSite=Strict; Path=/`;
    
    return new Response('', {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': cookie
      }
    });
    
  } catch (error) {
    return new Response(getLoginPage('SYSTEM ERROR - PLEASE TRY AGAIN'), {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
}

function getCookie(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function isValidSession(token) {
  const session = SESSIONS.get(token);
  if (!session) return false;
  
  if (Date.now() > session.expires) {
    SESSIONS.delete(token);
    return false;
  }
  
  // Extend session on activity
  session.expires = Date.now() + SESSION_DURATION;
  
  return true;
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of SESSIONS.entries()) {
    if (now > session.expires) {
      SESSIONS.delete(token);
    }
  }
}

function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getLoginPage(errorMessage = '') {
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: '2-digit' 
  }).toUpperCase();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SCHEDULE TERMINAL ACCESS</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            background: #000; 
            color: #00ff00; 
            font-family: 'JetBrains Mono', 'Courier New', monospace; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            padding: 20px;
            line-height: 1.4;
        }
        
        .terminal-wrapper {
            width: 100%;
            max-width: 500px;
        }
        
        .terminal-header {
            background: #1a1a1a;
            border: 1px solid #333;
            padding: 12px 20px;
            margin-bottom: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .terminal-title {
            color: #ffaa00;
            font-weight: 600;
        }
        
        .terminal-status {
            color: #00ffff;
            display: flex;
            gap: 15px;
            font-size: 10px;
        }
        
        .status-dot {
            width: 6px;
            height: 6px;
            background: #ff0000;
            border-radius: 50%;
            animation: pulse 2s infinite;
            margin-right: 5px;
            display: inline-block;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        .login-container { 
            border: 1px solid #333; 
            border-top: none;
            padding: 40px; 
            background: #0a0a0a; 
            text-align: center;
            position: relative;
        }
        
        .login-title {
            color: #ffaa00;
            font-size: 16px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
        }
        
        .login-subtitle {
            color: #666;
            font-size: 11px;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .login-form {
            margin-bottom: 20px;
        }
        
        input { 
            background: #000; 
            border: 1px solid #333; 
            color: #00ff00; 
            padding: 15px; 
            width: 100%; 
            font-family: inherit;
            font-size: 14px;
            margin: 15px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: border-color 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #00ff00;
        }
        
        input::placeholder {
            color: #444;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        button { 
            background: #004400; 
            border: 1px solid #00ff00; 
            color: #ffffff; 
            padding: 15px 30px; 
            cursor: pointer; 
            font-family: inherit;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            transition: all 0.3s;
            width: 100%;
        }
        
        button:hover { 
            background: #006600; 
            transform: translateY(-1px);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        .error { 
            color: #ff0000; 
            margin-top: 15px; 
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            padding: 10px;
            border: 1px solid #330000;
            background: #110000;
            animation: errorFlash 0.5s ease-in-out;
        }
        
        @keyframes errorFlash {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        .status { 
            color: #666; 
            font-size: 9px; 
            margin-top: 25px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-top: 1px solid #222;
            padding-top: 15px;
        }
        
        .security-notice {
            background: #001122;
            border: 1px solid #004488;
            padding: 12px;
            margin-top: 20px;
            font-size: 9px;
            color: #00ffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.6;
        }
        
        @media (max-width: 768px) {
            .terminal-header {
                flex-direction: column;
                gap: 8px;
                text-align: center;
            }
            
            .terminal-status {
                justify-content: center;
            }
            
            .login-container {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="terminal-wrapper">
        <div class="terminal-header">
            <div class="terminal-title">RAEE SCHEDULE TERMINAL v2.1.0</div>
            <div class="terminal-status">
                <div><span class="status-dot"></span>SECURE</div>
                <div>${currentTime}</div>
                <div>${currentDate}</div>
            </div>
        </div>
        
        <div class="login-container">
            <div class="login-title">🔒 AUTHORIZED ACCESS ONLY</div>
            <div class="login-subtitle">Single User Authentication Required</div>
            
            <form class="login-form" method="POST" action="/">
                <input type="password" name="password" id="password" placeholder="ENTER ACCESS CODE" required autocomplete="off">
                <button type="submit">ACCESS TERMINAL</button>
            </form>
            
            ${errorMessage ? `<div class="error">⚠️ ${errorMessage}</div>` : ''}
            
            <div class="status">
                SINGLE USER SESSION • SECURE CONNECTION • 30 MIN TIMEOUT
            </div>
            
            <div class="security-notice">
                NOTICE: This system enforces single-user access. Only one person can be logged in at any given time. Sessions automatically expire after 30 minutes of inactivity for security purposes.
            </div>
        </div>
    </div>
    
    <script>
        // Auto-focus password field
        document.getElementById('password').focus();
        
        // Handle form submission with visual feedback
        document.querySelector('.login-form').addEventListener('submit', function(e) {
            const button = this.querySelector('button');
            const originalText = button.textContent;
            
            button.textContent = 'AUTHENTICATING...';
            button.disabled = true;
            
            // Re-enable button after 3 seconds in case of issues
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 3000);
        });
        
        // Clear any previous error on new input
        document.getElementById('password').addEventListener('input', function() {
            const errorDiv = document.querySelector('.error');
            if (errorDiv) {
                errorDiv.style.opacity = '0.5';
            }
        });
    </script>
</body>
</html>`;
}