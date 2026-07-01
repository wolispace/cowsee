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
  console.log(json.context);
      json.msg = json.msg.replace(/\[\$(\w+)\]/g, (match, name) => json?.context[name] !== undefined ? json?.context[name] : '');
      json.msg = json.msg.replace(/\$(\w+)/g, (match, name) => json?.context[name] !== undefined ? json?.context[name] : '');
      json.msg =json. msg.replace(/\s+/g, ' ').trim();
  div.textContent = json.msg;
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