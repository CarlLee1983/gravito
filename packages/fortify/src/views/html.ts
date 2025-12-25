/**
 * Default HTML View Templates for Gravito Fortify
 * 
 * These can be used as a starting point for customization.
 */

export const loginHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Gravito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { width: 100%; max-width: 420px; padding: 2.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; backdrop-filter: blur(10px); }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; background: linear-gradient(90deg, #14f195, #9945ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #aaa; }
    input { width: 100%; padding: 0.875rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: #fff; font-size: 1rem; transition: border-color 0.2s; }
    input:focus { outline: none; border-color: #14f195; }
    .checkbox { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
    .checkbox input { width: auto; }
    button { width: 100%; padding: 0.875rem 1rem; background: linear-gradient(90deg, #14f195, #0fd17d); border: none; border-radius: 0.75rem; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(20,241,149,0.3); }
    .links { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: #888; }
    .links a { color: #14f195; text-decoration: none; }
    .links a:hover { text-decoration: underline; }
    .error { background: rgba(255,71,87,0.2); border: 1px solid #ff4757; color: #ff4757; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome Back</h1>
    <p class="subtitle">Sign in to your account</p>
    <form method="POST" action="/login">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="••••••••" required>
      </div>
      <div class="checkbox">
        <input type="checkbox" id="remember" name="remember">
        <label for="remember" style="margin: 0; color: #888;">Remember me</label>
      </div>
      <button type="submit">Sign In</button>
    </form>
    <div class="links">
      <a href="/forgot-password">Forgot password?</a> · <a href="/register">Create account</a>
    </div>
  </div>
</body>
</html>
`

export const registerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Register - Gravito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { width: 100%; max-width: 420px; padding: 2.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; backdrop-filter: blur(10px); }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; background: linear-gradient(90deg, #14f195, #9945ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #aaa; }
    input { width: 100%; padding: 0.875rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: #fff; font-size: 1rem; transition: border-color 0.2s; }
    input:focus { outline: none; border-color: #14f195; }
    button { width: 100%; padding: 0.875rem 1rem; background: linear-gradient(90deg, #14f195, #0fd17d); border: none; border-radius: 0.75rem; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(20,241,149,0.3); }
    .links { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: #888; }
    .links a { color: #14f195; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Create Account</h1>
    <p class="subtitle">Join the Gravito community</p>
    <form method="POST" action="/register">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="Your name" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="••••••••" required>
      </div>
      <div class="form-group">
        <label for="password_confirmation">Confirm Password</label>
        <input type="password" id="password_confirmation" name="password_confirmation" placeholder="••••••••" required>
      </div>
      <button type="submit">Create Account</button>
    </form>
    <div class="links">
      Already have an account? <a href="/login">Sign in</a>
    </div>
  </div>
</body>
</html>
`

export const forgotPasswordHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forgot Password - Gravito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { width: 100%; max-width: 420px; padding: 2.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; backdrop-filter: blur(10px); }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; background: linear-gradient(90deg, #14f195, #9945ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #aaa; }
    input { width: 100%; padding: 0.875rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; color: #fff; font-size: 1rem; transition: border-color 0.2s; }
    input:focus { outline: none; border-color: #14f195; }
    button { width: 100%; padding: 0.875rem 1rem; background: linear-gradient(90deg, #14f195, #0fd17d); border: none; border-radius: 0.75rem; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(20,241,149,0.3); }
    .links { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; }
    .links a { color: #14f195; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Forgot Password</h1>
    <p class="subtitle">Enter your email and we'll send you a reset link.</p>
    <form method="POST" action="/forgot-password">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required>
      </div>
      <button type="submit">Send Reset Link</button>
    </form>
    <div class="links">
      <a href="/login">Back to login</a>
    </div>
  </div>
</body>
</html>
`
