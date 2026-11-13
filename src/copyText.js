/**
 * Copy plain text from a tap.
 * iPhone Safari accepts navigator.clipboard.writeText on https when the call
 * starts inside the click. If that is refused, a selected element and
 * document.execCommand("copy") still works on older iOS.
 */

function copyWithRange(value, doc) {
  if (!doc || !doc.body || typeof doc.execCommand !== "function" || typeof doc.createRange !== "function" || typeof doc.getSelection !== "function") {
    return false;
  }
  const mark = doc.createElement("span");
  mark.textContent = value;
  mark.setAttribute("data-copy-buffer", "true");
  mark.style.position = "fixed";
  mark.style.top = "0";
  mark.style.left = "0";
  mark.style.whiteSpace = "pre";
  mark.style.userSelect = "text";
  mark.style.webkitUserSelect = "text";
  mark.style.fontSize = "16px";
  doc.body.appendChild(mark);
  const selection = doc.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const range = doc.createRange();
  range.selectNodeContents(mark);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
  let ok = false;
  try {
    ok = doc.execCommand("copy");
  } catch (err) {
    ok = false;
  }
  if (mark.parentNode) mark.parentNode.removeChild(mark);
  if (selection) {
    selection.removeAllRanges();
    if (previous) {
      try { selection.addRange(previous); } catch (err) { /* the old range can be detached */ }
    }
  }
  return ok;
}

function copyWithTextarea(value, doc) {
  if (!doc || !doc.body || typeof doc.execCommand !== "function") return false;
  const area = doc.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.width = "2em";
  area.style.height = "2em";
  area.style.padding = "0";
  area.style.border = "none";
  area.style.outline = "none";
  area.style.boxShadow = "none";
  area.style.background = "transparent";
  area.style.fontSize = "16px";
  doc.body.appendChild(area);
  area.focus();
  area.select();
  if (typeof area.setSelectionRange === "function") area.setSelectionRange(0, area.value.length);
  let ok = false;
  try {
    ok = doc.execCommand("copy");
  } catch (err) {
    ok = false;
  }
  if (area.parentNode) area.parentNode.removeChild(area);
  return ok;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("clipboard-timeout")), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function copyPlainText(text, doc) {
  const value = text == null ? "" : String(text);
  const root = doc || (typeof document !== "undefined" ? document : null);
  const legacyOk = copyWithRange(value, root) || copyWithTextarea(value, root);
  const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      const pending = clipboard.writeText(value);
      if (pending && typeof pending.then === "function") {
        // A stuck clipboard promise must not swallow the tap. The selection
        // copy above already ran while the gesture was active.
        return withTimeout(pending, 1200).then(() => true, () => legacyOk);
      }
      return Promise.resolve(true);
    } catch (err) {
      return Promise.resolve(legacyOk);
    }
  }
  return Promise.resolve(legacyOk);
}
