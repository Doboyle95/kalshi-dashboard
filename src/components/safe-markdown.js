export function safeMarkdown(marked, markdown, {inline = false} = {}) {
  const raw = inline ? marked.parseInline(markdown ?? "") : marked.parse(markdown ?? "");
  const template = document.createElement("template");
  template.innerHTML = raw;
  const allowedTags = new Set(["P", "BR", "STRONG", "EM", "UL", "OL", "LI", "CODE", "A"]);
  const allowedAttrs = new Map([["A", new Set(["href"])]]);

  function clean(node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) continue;
      if (child.nodeType !== 1 || !allowedTags.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent ?? ""));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        if (!allowedAttrs.get(child.tagName)?.has(attr.name)) child.removeAttribute(attr.name);
      }
      if (child.tagName === "A") {
        const href = child.getAttribute("href") ?? "";
        if (!/^https?:\/\//i.test(href)) child.removeAttribute("href");
        else {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
      }
      clean(child);
    }
  }

  clean(template.content);
  return template.innerHTML;
}
