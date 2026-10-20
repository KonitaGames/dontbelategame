// Mobile navigation: below the breakpoint, the dropdown links collapse into a hamburger menu.
(function () {
  var BREAKPOINT = 760;
  var nav = document.querySelector('nav');
  var links = nav && nav.querySelector('.nav-links');
  if (!links) return;

  var css = document.createElement('style');
  css.textContent = [
    '.nm-right { display: flex; align-items: center; gap: 10px; }',
    '.nm-toggle { display: none; align-items: center; justify-content: center; width: 42px; height: 42px; padding: 0; border: 0; border-radius: 10px; background: none; color: var(--text, #0f172a); cursor: pointer; }',
    '.nm-toggle:hover { background: rgba(15,23,42,0.06); }',
    '.nm-toggle svg { width: 24px; height: 24px; }',
    '.nm-toggle .nm-close { display: none; }',
    '.nm-toggle[aria-expanded="true"] .nm-open { display: none; }',
    '.nm-toggle[aria-expanded="true"] .nm-close { display: block; }',
    '.nm-panel { position: fixed; left: 0; right: 0; z-index: 999; overflow-y: auto; padding: 8px 20px 24px; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.08); box-shadow: 0 18px 40px rgba(15,23,42,0.12); }',
    '.nm-panel[hidden] { display: none; }',
    '.nm-group + .nm-group { margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06); }',
    '.nm-heading { padding: 10px 4px 4px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted, #64748b); }',
    '.nm-panel a { display: block; padding: 12px 4px; font-size: 1.02rem; font-weight: 700; color: var(--text, #0f172a); text-decoration: none; border-radius: 8px; }',
    '.nm-panel a:hover, .nm-panel a:focus-visible { color: #0170B8; }',
    '@media (max-width: ' + BREAKPOINT + 'px) {',
    '  nav .nav-links { display: none !important; }',
    '  .nm-toggle { display: inline-flex; }',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  var panel = document.createElement('div');
  panel.className = 'nm-panel';
  panel.id = 'nm-panel';
  panel.hidden = true;
  links.querySelectorAll('.nav-item').forEach(function (item) {
    var label = item.querySelector('.nav-link');
    var menu = item.querySelector('.nav-dropdown-menu');
    if (!label || !menu) return;
    var group = document.createElement('div');
    group.className = 'nm-group';
    var heading = document.createElement('div');
    heading.className = 'nm-heading';
    heading.textContent = label.textContent.trim();
    group.appendChild(heading);
    menu.querySelectorAll('a').forEach(function (a) { group.appendChild(a.cloneNode(true)); });
    panel.appendChild(group);
  });
  document.body.appendChild(panel);

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nm-toggle';
  toggle.setAttribute('aria-label', 'Menu');
  toggle.setAttribute('aria-controls', 'nm-panel');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML =
    '<svg class="nm-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
    '<svg class="nm-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // Group the hamburger with the nav's right-hand button so space-between keeps them together.
  var right = document.createElement('div');
  right.className = 'nm-right';
  var lastChild = nav.lastElementChild;
  if (lastChild && !lastChild.contains(links)) {
    nav.insertBefore(right, lastChild);
    right.appendChild(lastChild);
  } else {
    nav.appendChild(right);
  }
  right.appendChild(toggle);

  function setOpen(open) {
    if (open) panel.style.top = nav.getBoundingClientRect().bottom + 'px';
    panel.style.maxHeight = open ? 'calc(100vh - ' + panel.style.top + ')' : '';
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > BREAKPOINT && !panel.hidden) setOpen(false);
  });
})();
