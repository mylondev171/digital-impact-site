/* dc-lite: a small runtime that renders Digital Impact pages exported from the design canvas.
   Pages ship pre-rendered HTML; on load the runtime hydrates it (attaches behavior to the existing
   nodes) instead of rebuilding the page. sc-if / sc-for blocks are delimited by comment markers
   (<!--[if--> ... <!--]if-->, <!--[for--> <!--[i--> ... <!--]for-->) so hydration can find them.
   If the markup does not match the template, it falls back to a full client render. */
(function () {
  'use strict';
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; this.__cbs = []; this.__sched = false; }
    setState(partial, cb) {
      const p = typeof partial === 'function' ? partial(this.state, this.props) : partial;
      this.state = Object.assign({}, this.state, p || {});
      if (cb) this.__cbs.push(cb);
      if (!this.__sched) {
        this.__sched = true;
        Promise.resolve().then(() => {
          this.__sched = false;
          if (this.__render) this.__render();
          this.__cbs.splice(0).forEach((f) => { try { f(); } catch (e) { console.error(e); } });
        });
      }
    }
    renderVals() { return {}; }
  }
  window.DCLogic = DCLogic;

  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const ONE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    let v = scope;
    for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
    return v;
  }
  function interp(str, scope) {
    const m = str.match(ONE);
    if (m) return lookup(scope, m[1]);
    return str.replace(HOLE, (_, p) => { const v = lookup(scope, p); return v == null ? '' : String(v); });
  }
  function isTag(node, name) { return node.nodeType === 1 && node.localName.toLowerCase() === name; }
  function mismatch(what) { throw new Error('dc-lite hydrate: ' + what); }
  // Hydration cursor helpers: cur = { node } is the next existing DOM node to adopt (null when rendering fresh).
  function takeMarker(cur, text) {
    const n = cur.node;
    if (!n || n.nodeType !== 8 || n.nodeValue !== text) mismatch('expected <!--' + text + '-->');
    cur.node = n.nextSibling;
    return n;
  }
  function atMarker(cur, text) { return cur.node && cur.node.nodeType === 8 && cur.node.nodeValue === text; }

  function buildChildren(parentTpl, cur) {
    const parts = [];
    parentTpl.childNodes.forEach((n) => { const b = build(n, cur); if (b) parts.push(b); });
    return {
      nodes: parts.reduce((a, p) => a.concat(p.nodes), []),
      update(scope) { parts.forEach((p) => p.update(scope)); },
      remove() { parts.forEach((p) => p.remove()); }
    };
  }

  function build(tpl, cur) {
    if (tpl.nodeType === 3) {
      const text = tpl.nodeValue;
      const dyn = text.indexOf('{{') >= 0;
      let tn;
      if (cur) {
        const n = cur.node;
        if (dyn) {
          // An empty dynamic value has no node in the serialized HTML; create one in place.
          if (n && n.nodeType === 3) { tn = n; cur.node = n.nextSibling; }
          else { tn = document.createTextNode(''); if (n) n.parentNode.insertBefore(tn, n); else cur.parent.appendChild(tn); }
        } else {
          if (!n || n.nodeType !== 3) mismatch('expected text');
          if (n.nodeValue !== text) {
            if (n.nodeValue.indexOf(text) !== 0) mismatch('text differs');
            n.splitText(text.length);
          }
          tn = n; cur.node = n.nextSibling;
        }
      } else tn = document.createTextNode(dyn ? '' : text);
      return { nodes: [tn], update(scope) { if (dyn) { const v = interp(text, scope); const s = v == null ? '' : String(v); if (tn.nodeValue !== s) tn.nodeValue = s; } }, remove() { tn.remove(); } };
    }
    if (tpl.nodeType !== 1) return null;
    if (isTag(tpl, 'sc-if')) {
      const cond = tpl.getAttribute('value') || '';
      let start, anchor, inst = null;
      if (cur) {
        start = takeMarker(cur, '[if');
        if (!atMarker(cur, ']if')) inst = buildChildren(tpl, cur);
        anchor = takeMarker(cur, ']if');
      } else { start = document.createComment('[if'); anchor = document.createComment(']if'); }
      return {
        nodes: [start, anchor],
        update(scope) {
          const on = !!interp(cond, scope);
          if (on && !inst) {
            inst = buildChildren(tpl, null);
            inst.nodes.forEach((n) => anchor.parentNode.insertBefore(n, anchor));
            inst.update(scope);
          } else if (!on && inst) { inst.remove(); inst = null; }
          else if (inst) inst.update(scope);
        },
        remove() { if (inst) inst.remove(); start.remove(); anchor.remove(); }
      };
    }
    if (isTag(tpl, 'sc-for')) {
      const listAttr = tpl.getAttribute('list') || '';
      const as = tpl.getAttribute('as') || 'item';
      const insts = [];
      let start, anchor;
      const item = (mark, inst) => ({ mark: mark, inst: inst, remove() { inst.remove(); mark.remove(); } });
      if (cur) {
        start = takeMarker(cur, '[for');
        while (atMarker(cur, '[i')) { const mark = takeMarker(cur, '[i'); insts.push(item(mark, buildChildren(tpl, cur))); }
        anchor = takeMarker(cur, ']for');
      } else { start = document.createComment('[for'); anchor = document.createComment(']for'); }
      return {
        nodes: [start, anchor],
        update(scope) {
          const list = interp(listAttr, scope) || [];
          list.forEach((it, i) => {
            const s = Object.create(scope);
            s[as] = it; s.$index = i;
            if (!insts[i]) {
              const mark = document.createComment('[i');
              const inst = buildChildren(tpl, null);
              anchor.parentNode.insertBefore(mark, anchor);
              inst.nodes.forEach((n) => anchor.parentNode.insertBefore(n, anchor));
              insts[i] = item(mark, inst);
            }
            insts[i].inst.update(s);
          });
          while (insts.length > list.length) insts.pop().remove();
        },
        remove() { insts.forEach((i) => i.remove()); start.remove(); anchor.remove(); }
      };
    }
    let el;
    if (cur) {
      el = cur.node;
      if (!el || el.nodeType !== 1 || el.localName !== tpl.localName) mismatch('expected <' + tpl.localName + '>');
      cur.node = el.nextSibling;
    } else {
      el = tpl.namespaceURI && tpl.namespaceURI !== 'http://www.w3.org/1999/xhtml'
        ? document.createElementNS(tpl.namespaceURI, tpl.localName) : document.createElement(tpl.localName);
    }
    const dyn = [];
    let scopeNow = {};
    for (const a of Array.from(tpl.attributes)) {
      const name = a.name, val = a.value;
      if (name.indexOf('hint-') === 0) continue;
      if (/^on[a-z]+$/i.test(name) && val.indexOf('{{') >= 0) {
        const path = val.replace(/[{}]/g, '').trim();
        el.addEventListener(name.slice(2).toLowerCase(), (e) => { const fn = lookup(scopeNow, path); if (typeof fn === 'function') fn(e); });
      } else if (val.indexOf('{{') >= 0) {
        dyn.push([name, val, undefined]);
      } else if (!cur) {
        el.setAttribute(name, val);
      }
    }
    const src = tpl.localName === 'template' ? tpl.content : tpl;
    let kids;
    if (cur) {
      const into = tpl.localName === 'template' ? el.content : el;
      const inner = { node: into.firstChild, parent: into };
      kids = buildChildren(src, inner);
      if (inner.node) mismatch('extra nodes in <' + tpl.localName + '>');
    } else {
      kids = buildChildren(src, null);
      kids.nodes.forEach((n) => el.appendChild(n));
    }
    return {
      nodes: [el],
      update(scope) {
        scopeNow = scope;
        for (const d of dyn) {
          const v = interp(d[1], scope);
          if (v === d[2]) continue;
          d[2] = v;
          if (v === false || v == null) el.removeAttribute(d[0]);
          else { const s = v === true ? '' : String(v); if (el.getAttribute(d[0]) !== s) el.setAttribute(d[0], s); }
        }
        kids.update(scope);
      },
      remove() { el.remove(); }
    };
  }

  // Called by each page's script (assets/js/pages/<page>.js) with its component class and template markup.
  window.DCMount = function (Component, tplHTML) {
    const app = document.getElementById('app');
    if (!app) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = tplHTML;
    const comp = new Component({});
    let root = null;
    if (app.firstChild && !window.__DC_PRERENDER) {
      try {
        const cur = { node: app.firstChild, parent: app };
        root = buildChildren(tpl.content, cur);
        if (cur.node) mismatch('extra nodes at end of page');
      } catch (e) { console.warn(e.message + '; rendering on the client instead.'); root = null; }
    }
    if (!root) {
      root = buildChildren(tpl.content, null);
      app.textContent = '';
      root.nodes.forEach((n) => app.appendChild(n));
    }
    comp.__render = () => root.update(comp.renderVals() || {});
    comp.__render();
    if (comp.componentDidMount && !window.__DC_PRERENDER) comp.componentDidMount();
    window.__dc = comp;
  };
})();
