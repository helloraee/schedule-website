const SESSIONS = new Map();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const CORRECT_PASSWORD = "your-secure-password-here"; // Change this!
const MAX_SESSIONS = 1; // Only one active session

export async function onRequestPost(context) {
  const { request } = context;
  
  try {
    const { password } = await request.json();
    
    if (password !== CORRECT_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if there's already an active session
    if (SESSIONS.size >= MAX_SESSIONS) {
      // Clear expired sessions first
      for (const [token, session] of SESSIONS.entries()) {
        if (Date.now() > session.expires) {
          SESSIONS.delete(token);
        }
      }
      
      // If still at max capacity, deny access
      if (SESSIONS.size >= MAX_SESSIONS) {
        return new Response(JSON.stringify({ 
          error: 'Another user is currently logged in. Please try again later.' 
        }), {
          status: 423, // Locked
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Create new session
    const sessionToken = generateSecureToken();
    const expiresAt = Date.now() + SESSION_DURATION;
    
    SESSIONS.set(sessionToken, {
      expires: expiresAt,
      created: Date.now()
    });
    
    const cookie = `session_token=${sessionToken}; Max-Age=${SESSION_DURATION / 1000}; HttpOnly; Secure; SameSite=Strict; Path=/`;
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}