// handls all interactions with players, logging in authenticating, storing stuff, movnig locations
export class PlayerManager {
  #sessions = new Map(); // token -> username

  constructor(tickManager) {
    this.tickManager = tickManager;
  }

  handleLogin(request, result) {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      const params = Object.fromEntries(new URLSearchParams(body));
      const { user, pw } = params;

      // TODO: validate against DB
      if (this.#validate(user, pw)) {
        const token = crypto.randomUUID();
        this.#sessions[token] = user;
        result.writeHead(302, {
          'Set-Cookie': `session=${token}; HttpOnly; Path=/`,
          'Location': `/?user=${encodeURIComponent(user)}`
        });
      } else {
        result.writeHead(302, { 'Location': '/login.html?error=Invalid+username+or+password' });
      }
      result.end();
    });
  }

  handleAutoLogin(request, result) {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      const { user } = JSON.parse(body);
      if (!user) { result.writeHead(401); result.end(); return; }
      const token = crypto.randomUUID();
      this.#sessions[token] = user;
      result.writeHead(200, {
        'Set-Cookie': `session=${token}; HttpOnly; Path=/`,
        'Content-Type': 'application/json'
      });
      result.end(JSON.stringify({ ok: true }));
    });
  }

  handleLogout(request, result) {
    const cookie = request.headers.cookie ?? '';
    const token = cookie.match(/session=([^;]+)/)?.[1];
    if (token) delete this.#sessions[token];
    result.writeHead(302, {
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0',
      'Location': '/login.html'
    });
    result.end();
  }

  getSession(request) {
    const cookie = request.headers.cookie ?? '';
    const token = cookie.match(/session=([^;]+)/)?.[1];
    return token ? this.#sessions[token] : null;
  }

  #validate(user, pw) {
    // TODO: check DB with hashed pw
    const obj = this.tickManager.objectManager.findUser(user, pw);
    return (obj) ? true : false;
  }

  /**
   * Adds the user to the list of current players
   * @param {string} user 
   * @param {string} pw 
   */
  add(user, pw) {
    const obj = this.tickManager.objectManager.findUser(user, pw);
    const token = crypto.randomUUID();
    this.#sessions.set(token) = {user: user, pw: pw};
  }
}
