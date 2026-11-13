// Demo page: pick a colour template, see the widget live, copy the embed code.
(function () {
  "use strict";
  var COLORS = {
    blue: "#2563eb", indigo: "#4f46e5", violet: "#7c3aed", pink: "#db2777", crimson: "#c8141e",
    orange: "#ea580c", amber: "#d97706", emerald: "#059669", teal: "#0d9488", slate: "#334155", black: "#111111"
  };
  var params = new URLSearchParams(location.search);
  var color = COLORS[params.get("color")] ? params.get("color") : "blue";
  var mode = params.get("mode") === "dark" ? "dark" : "light";

  var swatches = document.getElementById("swatches");
  Object.keys(COLORS).forEach(function (name) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.title = name;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", name);
    b.setAttribute("aria-checked", String(name === color));
    b.style.background = COLORS[name];
    b.onclick = function () { go(name, mode); };
    swatches.appendChild(b);
  });
  document.querySelectorAll('input[name="mode"]').forEach(function (r) {
    r.checked = r.value === mode;
    r.onchange = function () { go(color, r.value); };
  });

  function go(c, m) { location.search = "?color=" + c + "&mode=" + m; }

  var snippet =
    '<script src="' + location.origin + '/widget/widget.js"\n' +
    '        data-color="' + color + '"' + (mode === "dark" ? ' data-mode="dark"' : "") + '\n' +
    '        data-name="Zubair" data-fullname="Zubair Hussain" defer></script>';
  document.getElementById("snippet").textContent = snippet;
  document.getElementById("copy").onclick = function () {
    navigator.clipboard.writeText(snippet).then(function () { document.getElementById("copy").textContent = "Copied!"; });
  };

  var s = document.createElement("script");
  s.src = "/widget/widget.js";
  s.dataset.color = color;
  s.dataset.mode = mode;
  s.dataset.name = "Zubair";
  s.dataset.fullname = "Zubair Hussain";
  document.body.appendChild(s);
})();
