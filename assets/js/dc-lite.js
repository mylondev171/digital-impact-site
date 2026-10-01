/* dc-lite: a small runtime that renders Digital Impact pages exported from the design canvas. */
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

  function buildChildren(parentTpl) {
    const parts = [];
    parentTpl.childNodes.forEach((n) => { const b = build(n); if (b) parts.push(b); });
    return {
      nodes: parts.reduce((a, p) => a.concat(p.nodes), []),
      update(scope) { parts.forEach((p) => p.update(scope)); },
      remove() { parts.forEach((p) => p.remove()); }
    };
  }

  function build(tpl) {
    if (tpl.nodeType === 3) {
      const text = tpl.nodeValue;
      const tn = document.createTextNode(text.indexOf('{{') >= 0 ? '' : text);
      const dyn = text.indexOf('{{') >= 0;
      return { nodes: [tn], update(scope) { if (dyn) { const v = interp(text, scope); const s = v == null ? '' : String(v); if (tn.nodeValue !== s) tn.nodeValue = s; } }, remove() { tn.remove(); } };
    }
    if (tpl.nodeType !== 1) return null;
    if (isTag(tpl, 'sc-if')) {
      const cond = tpl.getAttribute('value') || '';
      const anchor = document.createComment('if');
      let inst = null;
      return {
        nodes: [anchor],
        update(scope) {
          const on = !!interp(cond, scope);
          if (on && !inst) {
            inst = buildChildren(tpl);
            inst.nodes.forEach((n) => anchor.parentNode.insertBefore(n, anchor));
            inst.update(scope);
          } else if (!on && inst) { inst.remove(); inst = null; }
          else if (inst) inst.update(scope);
        },
        remove() { if (inst) inst.remove(); anchor.remove(); }
      };
    }
    if (isTag(tpl, 'sc-for')) {
      const listAttr = tpl.getAttribute('list') || '';
      const as = tpl.getAttribute('as') || 'item';
      const anchor = document.createComment('for');
      const insts = [];
      return {
        nodes: [anchor],
        update(scope) {
          const list = interp(listAttr, scope) || [];
          list.forEach((item, i) => {
            const s = Object.create(scope);
            s[as] = item; s.$index = i;
            if (!insts[i]) {
              const inst = buildChildren(tpl);
              inst.nodes.forEach((n) => anchor.parentNode.insertBefore(n, anchor));
              insts[i] = inst;
            }
            insts[i].update(s);
          });
          while (insts.length > list.length) insts.pop().remove();
        },
        remove() { insts.forEach((i) => i.remove()); anchor.remove(); }
      };
    }
    const el = tpl.namespaceURI && tpl.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(tpl.namespaceURI, tpl.localName) : document.createElement(tpl.localName);
    const dyn = [];
    let cur = {};
    for (const a of Array.from(tpl.attributes)) {
      const name = a.name, val = a.value;
      if (name.indexOf('hint-') === 0) continue;
      if (/^on[a-z]+$/i.test(name) && val.indexOf('{{') >= 0) {
        const path = val.replace(/[{}]/g, '').trim();
        el.addEventListener(name.slice(2).toLowerCase(), (e) => { const fn = lookup(cur, path); if (typeof fn === 'function') fn(e); });
      } else if (val.indexOf('{{') >= 0) {
        dyn.push([name, val, undefined]);
      } else {
        el.setAttribute(name, val);
      }
    }
    const kids = buildChildren(tpl.localName === 'template' ? tpl.content : tpl);
    kids.nodes.forEach((n) => el.appendChild(n));
    return {
      nodes: [el],
      update(scope) {
        cur = scope;
        for (const d of dyn) {
          const v = interp(d[1], scope);
          if (v === d[2]) continue;
          d[2] = v;
          if (v === false || v == null) el.removeAttribute(d[0]);
          else el.setAttribute(d[0], v === true ? '' : String(v));
        }
        kids.update(scope);
      },
      remove() { el.remove(); }
    };
  }

  function mount() {
    const tpl = document.getElementById('dc-tpl');
    const logic = document.getElementById('dc-logic');
    const app = document.getElementById('app');
    if (!tpl || !app) return;
    const Component = logic ? new Function('DCLogic', logic.textContent + '\nreturn Component;')(DCLogic) : class extends DCLogic {};
    const comp = new Component({});
    const root = buildChildren(tpl.content);
    app.textContent = '';
    root.nodes.forEach((n) => app.appendChild(n));
    comp.__render = () => root.update(comp.renderVals() || {});
    comp.__render();
    if (comp.componentDidMount) comp.componentDidMount();
    window.__dc = comp;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
