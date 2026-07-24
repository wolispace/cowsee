// Connect to your SSE endpoint
const ev = new EventSource("/events");

// TODO set this when we log in
const playerInfo = {id: 'w', loc: '2'};

// When the server sends ANY message (event: message or default)
ev.onmessage = (e) => {
  appendInfo( e.data);
};

// If you send named events (event: update)
// ev.addEventListener("update", (e) => {
//   appendInfo("Update: " + e.data);
// });


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
function appendInfo(text) {
  const info = document.querySelector("#bottom");
  const div = document.createElement("div");
  const json = JSON.parse(text);
  console.log(json);
  
  // grab the current obj and use its loc to update the playerInfo


  if (json.msg) {
      // Interpolate object templates: {ID} (defaults to longname) or {ID.attribute}
      json.msg = json.msg.replace(/\{(\w+)(?:\.(\w+))?\}/g, (match, id, attr) => {
          const obj = json.objs?.[id];
          if (!obj) return match;

          const prop = attr || 'longname';
          let val = obj[prop] !== undefined ? obj[prop] : '';

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

          // Wrap in clickable link if object is linkable

              return `<a href="#" class="obj-link" data-id="${val}" title="Examine ${val}">${styled}</a>`;
          return styled;
      });

      json.msg = json.msg.replace(/\s+/g, ' ').trim();
  }
  if (json.msg) {
    div.innerHTML = capitalEachSentence(json.msg);
    info.appendChild(div);
    // auto-scroll bottom to newest content
    info.scrollTop = info.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', () => {

  document.querySelector('.commandform').addEventListener('submit', async (e) => {
    e.preventDefault();
    playerInfo.cmd = document.getElementById('q').value;
    document.getElementById('q').value = '';
      await fetchJson('/command', playerInfo);
  });

  // Delegated click handler for object links in both sections
  document.querySelectorAll('#top, #bottom').forEach(section => {
    section.addEventListener('click', async (e) => {
      const link = e.target.closest('.obj-link');
      if (link) {
        e.preventDefault();
        const id = link.dataset.id;
        playerInfo.cmd = `examine ${id}`;
        await fetchJson('/command', playerInfo);
      }
    });
  });

  // ── Splitter drag logic ──
  const splitter = document.getElementById('splitter');
  const panels = document.getElementById('panels');
  const top = document.getElementById('top');
  const bottom = document.getElementById('bottom');
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
    if (topH < minHeight)    { topH = minHeight;    bottomH = available - minHeight; }
    if (bottomH < minHeight) { bottomH = minHeight;  topH = available - minHeight; }

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

// bundle up a form and sent it to the server as a /command and simply show the result for now
async function saveForm() {
  const form = document.querySelector('form');
  const formData = new FormData(form);
  const json = Object.fromEntries(formData.entries());
  const result = await fetchJson('/command', json);
  // do something with the result
}

// sends a json object to the server and return the json response
async function fetchJson(type, json) {
  const response = await fetch(type, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json),
  });
  return await response.json();
}
