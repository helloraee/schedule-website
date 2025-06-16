// Single-user session management
const SESSIONS = new Map();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const CORRECT_PASSWORD = "your-secure-password-here"; // Change this!

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Allow access to auth endpoints
  if (url.pathname.startsWith('/api/auth')) {
    return context.next();
  }
  
  // Check for authentication
  const sessionToken = getCookie(request, 'session_token');
  
  if (!sessionToken || !isValidSession(sessionToken)) {
    return new Response(getLoginPage(), {
      headers: { 'Content-Type': 'text/html' },
      status: 401
    });
  }
  
  return context.next();
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
  
  return true;
}

function getLoginPage() {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>SCHEDULE TERMINAL ACCESS</title>
    <style>
        body { 
            background: #000; 
            color: #00ff00; 
            font-family: 'Courier New', monospace; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0;
        }
        .login-container { 
            border: 1px solid #333; 
            padding: 40px; 
            background: #111; 
            max-width: 400px;
            text-align: center;
        }
        .login-title {
            color: #ffaa00;
            font-size: 18px;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        input { 
            background: #000; 
            border: 1px solid #333; 
            color: #00ff00; 
            padding: 12px; 
            width: 100%; 
            font-family: inherit;
            margin: 10px 0;
        }
        button { 
            background: #004400; 
            border: 1px solid #00ff00; 
            color: #ffffff; 
            padding: 12px 24px; 
            cursor: pointer; 
            font-family: inherit;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        button:hover { background: #006600; }
        .error { color: #ff0000; margin-top: 10px; }
        .status { color: #666; font-size: 10px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-title">🔒 AUTHORIZED ACCESS ONLY</div>
        <form onsubmit="handleLogin(event)">
            <input type="password" id="password" placeholder="ENTER ACCESS CODE" required>
            <br>
            <button type="submit">ACCESS TERMINAL</button>
        </form>
        <div id="error" class="error"></div>
        <div class="status">SINGLE USER SESSION • SECURE CONNECTION</div>
    </div>
    
    <script>
        async function handleLogin(event) {
            event.preventDefault();
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                
                if (response.ok) {
                    window.location.reload();
                } else {
                    document.getElementById('error').textContent = 'ACCESS DENIED';
                    document.getElementById('password').value = '';
                }
            } catch (error) {
                document.getElementById('error').textContent = 'CONNECTION ERROR';
            }
        }
    </script>
</body>
</html>`;
}