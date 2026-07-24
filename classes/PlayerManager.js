// handls all interactions with players, logging in authenticating, storing stuff, movnig locations
export class PlayerManager {
  #sessions = new Map(); // token -> username

  constructor(tickManager) {
    this.tickManager = tickManager;
  }

  handle(request, result) {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      const data = JSON.parse(body);
      console.log('form post', data);
      if (!data) { result.writeHead(401); result.end(); return; }

      if (data.type == 'login') {
        this.#sessions[data.token] = data;
      } else if (data.type == 'logoff') {

      } else {

      }
      result.writeHead(200, {
        'Content-Type': 'application/json'
      });
      // DEBUG: auto login as wolis
      result.end(JSON.stringify({ id: 'w', player: 'wolis' }));
    });
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
