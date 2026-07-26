export class TextUtils {

  expand(data, format = 'html') {
    if (data.msg) {
      // Interpolate object templates: {ID} (defaults to longname) or {ID.attribute}
      data.msg = data.msg.replace(/\{(\w+)(?:\.(\w+))?\}/g, (match, id, attr) => {
        const obj = data.objs?.[id];
        if (!obj) return match;

        const prop = attr || 'longname';
        let val = obj[prop] !== undefined ? obj[prop] : '';

        // Special handling if the player/actor matches the object ID (e.g. 'w' -> wolis)
        if (prop === 'longname' && id === data.playerId) {
          val = `${obj.name} (you)`;
        }

        if (!['longname', 'name', 'shorname', 'plural'].includes(prop)) {
          return val;
        }

        if (format == 'html') {
          // Format value with styling if colour is defined
          const color = obj.colour || obj.color;
          let styled = val;
          if (color && val !== '') {
            styled = `<span style="color: ${color}">${val}</span>`;
          }
          return `<a href="#" class="obj-link" data-id="${val}" title="Examine ${val} [${obj.id}]">${styled}</a>`;
        } else {
          return val;
        }
      });

      data.msg = data.msg.replace(/\s+/g, ' ').trim();
    }
    return this.capitalEachSentence(data.msg);
  }

  capitalEachSentence(text) {
  return text.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`);
}

}