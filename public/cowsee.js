// Connect to your SSE endpoint
const ev = new EventSource("/events");

// TODO set this when we log in
const playerInfo = { id: 'x', loc: '2' };

const TOKEN_KEY = 'token';
const PLAYER_KEY = 'id';

// When the server sends ANY message (event: message or default)
ev.onmessage = (e) => {
  handleMsg(e.data);
};

/**
 * Sets stuff about the currently logged in player, their id and loc are they main things
 * @param {object} info 
 */
function setPlayerInfo(info) {
  if (info.id) {
    playerInfo.id = info.id;
  }
  if (info.loc) {
    playerInfo.loc = info.loc;
  }
}

// Helper to append text to the .info section
function handleMsg(data) {
  const json = JSON.parse(data);
  console.log(json);
  if (json.token) {
    // we are a new session, so remember this token and prompt for login
    localStorage.setItem(TOKEN_KEY, json.token);
    const id = localStorage.getItem(PLAYER_KEY);
    if (id) {
      // has logged in before so setup player and find their current loc
      playerInfo.id = id;
      wakePlayer();
    } else {
      showLoginDialog(json);
    }
  } else if (json.msg) {
    // TODO: ensure this player is logged in, otherwise skip this message
    addMessage(json);
  }
  // unhandled msg from server

}

function addMessage(json) {
  const div = document.createElement("div");
  const section = json.top ? '#top' : '#bottom';
  const info = document.querySelector(section);

  // DEBUG: If the user simply includes 'logoff' in the msg then logoff - make a propper command later
  if (json.msg.includes('logoff')) {
    localStorage.clear(PLAYER_KEY);
    localStorage.clear(TOKEN_KEY);
    showDialog('You have logged off<form><menu><button class="buttonize">Ok</button></menu></form>');
  }
  
  // grab the current obj and use its loc to update the playerInfo
  if (json.msg) {
    // Interpolate object templates: {ID} (defaults to longname) or {ID.attribute}
    json.msg = json.msg.replace(/\{(\w+)(?:\.(\w+))?\}/g, (match, id, attr) => {
      const obj = json.objs?.[id];
      if (!obj) return match;

      const prop = attr || 'longname';
      let val = obj[prop] !== undefined ? obj[prop] : '';

      // if (obj.class == 'player') {
      //   val = obj.name;
      // }

      // Special handling if the player/actor matches the object ID (e.g. 'w' -> wolis)
      if (prop === 'longname' && json.context && id === playerInfo.id) {
        val = `${obj.name} (you)`;
      }
      

      if (!['longname', 'name', 'shorname', 'plural'].includes(prop)) {
        return val;
      }

      // Format value with styling if colour is defined
      const color = obj.colour || obj.color;
      let styled = val;
      if (color && val !== '') {
        styled = `<span style="color: ${color}">${val}</span>`;
      }
      return `<a href="#" class="obj-link" data-id="${val}" title="Examine ${val}">${styled}</a> <sup>${obj.id}</sup>`;
    });

    json.msg = json.msg.replace(/\s+/g, ' ').trim();
  }
  if (json.msg) {
    div.innerHTML = capitalEachSentence(json.msg);
    if (json.top) {
      info.replaceChildren(div);
      // auto-scroll top for new look around
      // TODO: only scroll if the current scroll position is at the bottom before appending the content
      info.scrollTop = 0;

    } else {
      info.appendChild(div);
      // auto-scroll bottom to newest content
      // TODO: only scroll if the current scroll position is at the bottom before appending the content
      info.scrollTop = info.scrollHeight;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // universal form submit we pass to the handler for forms
  document.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const data = Object.fromEntries(new FormData(form));
    handleForm(data);
  });

  // Delegated click handler for object links in both sections
  document.querySelectorAll('#top, #bottom').forEach(section => {
    section.addEventListener('click', async (e) => {
      const link = e.target.closest('.obj-link');
      if (link) {
        e.preventDefault();
        await sendCommand(`examine ${link.dataset.id}`)
      }
    });
  });

  // ── Splitter drag logic ──
  const splitter = document.getElementById('splitter');
  const panels = document.getElementById('panels');
  const top = document.getElementById('top');
  const bottom = document.getElementById('bottom');
  const input = document.getElementById('input');
  const minHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--section-min-height')) * parseFloat(getComputedStyle(document.documentElement).fontSize);

  let dragging = false;
  let startY = 0;
  let startTopH = 0;
  let startBottomH = 0;
  let splitRatio = null; // null = use CSS flex defaults; 0–1 = top's share after drag

  /** Redistribute top/bottom within #panels based on the stored ratio */
  function applySplitRatio() {
    if (splitRatio === null) return; // CSS flex handles it before any drag
    const available = panels.getBoundingClientRect().height - splitter.getBoundingClientRect().height;

    let topH = available * splitRatio;
    let bottomH = available * (1 - splitRatio);

    // enforce minimums
    if (topH < minHeight) { topH = minHeight; bottomH = available - minHeight; }
    if (bottomH < minHeight) { bottomH = minHeight; topH = available - minHeight; }

    top.style.flex = `0 0 ${topH}px`;
    bottom.style.flex = `0 0 ${bottomH}px`;
  }

  splitter.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    startTopH = top.getBoundingClientRect().height;
    startBottomH = bottom.getBoundingClientRect().height;
    splitter.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  splitter.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    let newTopH = startTopH + dy;
    let newBottomH = startBottomH - dy;

    // enforce minimums
    if (newTopH < minHeight) {
      newTopH = minHeight;
      newBottomH = startTopH + startBottomH - minHeight;
    }
    if (newBottomH < minHeight) {
      newBottomH = minHeight;
      newTopH = startTopH + startBottomH - minHeight;
    }
    newBottomH -= input.getBoundingClientRect().height;

    top.style.flex = `0 0 ${newTopH}px`;
    bottom.style.flex = `0 0 ${newBottomH}px`;
  });

  splitter.addEventListener('pointerup', (e) => {
    dragging = false;
    splitter.releasePointerCapture(e.pointerId);
    // store ratio so resizes stay proportional
    const topH = top.getBoundingClientRect().height;
    const bottomH = bottom.getBoundingClientRect().height;
    splitRatio = topH / (topH + bottomH);
  });

  splitter.addEventListener('pointercancel', (e) => {
    dragging = false;
  });

  // ── Proportional resize when viewport changes (keyboard, window resize) ──
  new ResizeObserver(() => {
    if (!dragging) applySplitRatio();
  }).observe(panels);
});

function capitalEachSentence(text) {
  return text.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`);
}

// sends a json object to the server and return the json response
async function fetchJson(type, json) {
  json.token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(type, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json),
  });
  return await response.json();
}

function showDialog(html) {
  const dlg = document.getElementById("dialog");
  dlg.innerHTML = html;
  dlg.showModal();
}

function closeDialog() {
  const dlg = document.getElementById("dialog");
  dlg.close();
}

function showLoginDialog() {
  const html = `
    <form method="dialog" id="loginform">
    <input type="hidden" name="type" value="login">
      <label for="playername">Your name:</label>
      <input type="text" id="playername" name="playername" placeholder="Your name in cow" required>
      <label for="pw">Password:</label>
      <input type="password" id="pw" name="pw" placeholder="Prove your you">
      <!-- <label for="email">Email:</label>
      <input type="text" id="email" name="email" placeholder="Optional. For email recovery">
      -->
      <menu>
        <button value="submit" class="buttonize">Login</button>
      </menu>
    </form>
  `;
  showDialog(html);
}

// based on the hidden type of the form what do we do
async function handleForm(data) {
  if (data.type == 'login') {
    const result = await fetchJson('/player', data);
    if (result.id) {
      localStorage.setItem(PLAYER_KEY, result.id);
      playerInfo.id = result.id;
      playerInfo.loc = result.loc;
      wakePlayer();
      closeDialog();
    } else {
      alert('Invalid player or password');
    }
  } else {
    await sendCommand();
  }
}

function wakePlayer() {
  addMessage({msg: 'You wake up in cow'});
  sendCommand('look');
}

async function sendCommand(cmd) {
  playerInfo.cmd = cmd ?? document.getElementById('cmd').value;
  document.getElementById('cmd').value = '';
  await fetchJson('/command', playerInfo);
}