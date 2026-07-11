// Connect to your SSE endpoint
const ev = new EventSource("/events");

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
      // 1. Replace variables from context: [$actor] or $actor
      json.msg = json.msg.replace(/\[\$(\w+)\]/g, (match, name) => json?.context[name] !== undefined ? json?.context[name] : '');
      json.msg = json.msg.replace(/\$(\w+)/g, (match, name) => json?.context[name] !== undefined ? json?.context[name] : '');

      // 2. Interpolate object templates: {ID} (defaults to longname) or {ID.attribute}
      json.msg = json.msg.replace(/\{(\w+)(?:\.(\w+))?\}/g, (match, id, attr) => {
          const obj = json.objs?.[id];
          if (!obj) return match;

          const prop = attr || 'longname';
          let val = obj[prop] !== undefined ? obj[prop] : '';

          // Special handling if the player/actor matches the object ID (e.g. 'w' -> wolis)
          if (prop === 'longname' && json.context && id === json.context.actor) {
              val = `${val} (you)`;
          }

          // Format value with styling if colour is defined
          const color = obj.colour || obj.color;
          if (color && val !== '') {
              return `<span style="color:${color}" style="color: ${color};">${val}</span>`;
          }
          return val;
      });

      json.msg = json.msg.replace(/\s+/g, ' ').trim();
  }
  div.innerHTML = json.msg;
  info.appendChild(div);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.searchform').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('q').value;
    document.getElementById('q').value = '';
    fetch('/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: q })
    });
  });
});
``