// Connect to your SSE endpoint
const ev = new EventSource("/events");

// TODO set this when we log in
const thisPlayer = 'w';

// When the server sends ANY message (event: message or default)
ev.onmessage = (e) => {
  appendInfo( e.data);
};

// If you send named events (event: update)
// ev.addEventListener("update", (e) => {
//   appendInfo("Update: " + e.data);
// });

// Helper to append text to the .info section
function appendInfo(text) {
  const info = document.querySelector(".info");
  const div = document.createElement("div");
  const json = JSON.parse(text);
  console.log(json);
  if (json.msg) {
      // Interpolate object templates: {ID} (defaults to longname) or {ID.attribute}
      json.msg = json.msg.replace(/\{(\w+)(?:\.(\w+))?\}/g, (match, id, attr) => {
          const obj = json.objs?.[id];
          if (!obj) return match;

          const prop = attr || 'longname';
          let val = obj[prop] !== undefined ? obj[prop] : '';

          // Special handling if the player/actor matches the object ID (e.g. 'w' -> wolis)
          if (prop === 'longname' && json.context && id === thisPlayer) {
              val = `${obj.name} (you)`;
          }

          if (!['longname', 'name', 'shorname'].includes(prop)) {
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
    div.innerHTML = json.msg;
    info.appendChild(div);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.searchform').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('q').value;
    document.getElementById('q').value = '';
    fetch('/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: thisPlayer, cmd: q })
    });
  });

  // Delegated click handler for object links (examine on click)
  document.querySelector('.info').addEventListener('click', (e) => {
    const link = e.target.closest('.obj-link');
    if (link) {
      e.preventDefault();
      const id = link.dataset.id;
      fetch('/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: `examine ${id}` })
      });
    }
  });
});
