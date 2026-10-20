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
    '.nm-panel { position: fixed; left: 0; right: 0; z-index: 999; overflow-y: auto; padding: 8px 20px 24px; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.08); box-shadow: 0 18px 40px rgba(15,23,42,0.12); }',
    '.nm-panel[hidden] { display: none; }',
    '.nm-group + .nm-group { border-top: 1px solid rgba(0,0,0,0.06); }',
    '.nm-heading { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 14px 4px; border: 0; background: none; font: 800 1.05rem var(--font-body, sans-serif); color: var(--text, #0f172a); cursor: pointer; text-align: left; }',
    '.nm-heading svg { width: 12px; height: 12px; transition: transform 0.18s; }',
    '.nm-heading[aria-expanded="true"] svg { transform: rotate(180deg); }',
    '.nm-links { padding: 0 0 8px 12px; }',
    '.nm-links[hidden] { display: none; }',
    '.nm-panel a { display: block; padding: 11px 4px; font-size: 0.98rem; font-weight: 600; color: var(--text, #0f172a); text-decoration: none; border-radius: 8px; }',
    '.nm-panel a:hover, .nm-panel a:focus-visible { color: #0170B8; }',
    '.nm-panel a.nm-cta { margin-top: 14px; padding: 14px; border-radius: 100px; background: var(--primary, #0197F6); color: #fff; text-align: center; font-weight: 800; }',
    '.nm-panel a.nm-cta:hover, .nm-panel a.nm-cta:focus-visible { color: #fff; }',
    '@media (max-width: ' + BREAKPOINT + 'px) {',
    '  nav .nav-links { display: none !important; }',
    '  .nm-toggle { display: inline-flex; }',
    '  .nm-right > :not(.nm-toggle) { display: none !important; }',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  var panel = document.createElement('div');
  panel.className = 'nm-panel';
  panel.id = 'nm-panel';
  panel.hidden = true;
  links.querySelectorAll('.nav-item').forEach(function (item, i) {
    var label = item.querySelector('.nav-link');
    var menu = item.querySelector('.nav-dropdown-menu');
    if (!label || !menu) return;
    var group = document.createElement('div');
    group.className = 'nm-group';
    var heading = document.createElement('button');
    heading.type = 'button';
    heading.className = 'nm-heading';
    heading.setAttribute('aria-expanded', 'false');
    heading.setAttribute('aria-controls', 'nm-links-' + i);
    heading.textContent = label.textContent.trim();
    heading.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    var list = document.createElement('div');
    list.className = 'nm-links';
    list.id = 'nm-links-' + i;
    list.hidden = true;
    menu.querySelectorAll('a').forEach(function (a) { list.appendChild(a.cloneNode(true)); });
    heading.addEventListener('click', function () {
      list.hidden = !list.hidden;
      heading.setAttribute('aria-expanded', String(!list.hidden));
    });
    group.appendChild(heading);
    group.appendChild(list);
    panel.appendChild(group);
  });
  document.body.appendChild(panel);

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nm-toggle';
  toggle.setAttribute('aria-label', 'Menu');
  toggle.setAttribute('aria-controls', 'nm-panel');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  // Group the hamburger with the nav's right-hand button so space-between keeps them together.
  var right = document.createElement('div');
  right.className = 'nm-right';
  var lastChild = nav.lastElementChild;
  if (lastChild && !lastChild.contains(links)) {
    if (lastChild.tagName === 'A') {
      var cta = document.createElement('a');
      cta.href = lastChild.getAttribute('href');
      cta.className = 'nm-cta';
      cta.textContent = lastChild.textContent.trim();
      panel.appendChild(cta);
    }
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
    if (!open) panel.querySelectorAll('.nm-links').forEach(function (l) {
      l.hidden = true;
      l.previousElementSibling.setAttribute('aria-expanded', 'false');
    });
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
