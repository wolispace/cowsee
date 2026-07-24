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
  }
}

document.addEventListener('DOMContentLoaded', () => {

  document.querySelector('.commandform').addEventListener('submit', async (e) => {
    e.preventDefault();
    playerInfo.cmd = document.getElementById('q').value;
    document.getElementById('q').value = '';
      await fetchJson('/command', playerInfo);
  });

  // Delegated click handler for object links (examine on click)
  document.querySelector('section').addEventListener('click', async (e) => {
    const link = e.target.closest('.obj-link');
    if (link) {
      e.preventDefault();
      const id = link.dataset.id;
      playerInfo.cmd = `examine ${id}`;
      await fetchJson('/command', playerInfo);
    }
  });
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
