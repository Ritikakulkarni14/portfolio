/**
 * Interaction layer for the portfolio.
 *
 * Everything here is progressive enhancement: the pages render and read fine
 * with JS disabled. The site's CSP forbids inline script and inline style
 * attributes, so styling is driven through CSS custom properties written with
 * `style.setProperty` (CSSOM writes are not covered by style-src) and through
 * data attributes that CSS selects on.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------- */
  /* Shared helpers                                                         */
  /* ---------------------------------------------------------------------- */

  var root = document.documentElement;
  var body = document.body;

  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  function reduced() {
    return reduceMotionQuery.matches;
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /** Coalesces scroll/resize work into a single rAF per frame. */
  function rafThrottle(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn();
      });
    };
  }

  var SITE = {
    email: "ritikakulkarni.rcr@gmail.com",
    phone: "+91 84313 99085",
    github: "https://github.com/ritika-kulkarni",
    linkedin: "https://www.linkedin.com/in/ritika-kulkarni-3937851b4",
    resume: "Ritika_Kulkarni_resume.pdf"
  };

  var ICONS = {
    home: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2",
    mail: "M3 6.5h18v11H3zM3 7l9 6 9-6",
    download: "M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16",
    copy: "M9 9h10v12H9zM5 15V3h10",
    theme: "M12 3v2m0 14v2M5 12H3m18 0h-2M6.3 6.3 4.9 4.9m14.2 14.2-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
    printer: "M7 8V3h10v5M7 18H4v-8h16v8h-3M7 14h10v7H7z"
  };

  function icon(name) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      (ICONS[name] || ICONS.grid) +
      '"/></svg>'
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Preloader                                                              */
  /* ---------------------------------------------------------------------- */

  function initPreloader() {
    var loader = $(".preloader");
    if (!loader) return;

    function dismiss() {
      loader.classList.add("is-out");
      window.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 420);
    }

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", function () {
        window.setTimeout(dismiss, 180);
      });
      // Never wait on a slow third-party asset.
      window.setTimeout(dismiss, 2200);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Toasts                                                                 */
  /* ---------------------------------------------------------------------- */

  var toastRegion = null;

  function toast(message) {
    if (!toastRegion) {
      toastRegion = document.createElement("div");
      toastRegion.className = "toast-region";
      toastRegion.setAttribute("role", "status");
      toastRegion.setAttribute("aria-live", "polite");
      body.appendChild(toastRegion);
    }

    var node = document.createElement("div");
    node.className = "toast";
    node.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="m5 13 4 4L19 7"/></svg><span></span>';
    node.lastChild.textContent = message;
    toastRegion.appendChild(node);

    window.setTimeout(function () {
      node.dataset.leaving = "true";
      window.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 260);
    }, 2400);
  }

  function copyText(text, label) {
    function done() {
      toast(label + " copied to clipboard");
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }

    function fallback() {
      var field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.className = "visually-hidden";
      body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
        done();
      } catch (error) {
        toast("Copy failed — " + text);
      }
      body.removeChild(field);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Theme                                                                  */
  /* ---------------------------------------------------------------------- */

  function currentTheme() {
    return root.dataset.theme === "light" ? "light" : "dark";
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem("sr-theme", theme);
    } catch (error) {
      /* Storage unavailable — the choice just won't persist. */
    }

    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f1f4f0" : "#0b0f0e");

    // Canvas colours are read from CSS tokens, so anything drawn must repaint.
    document.dispatchEvent(new CustomEvent("sr:themechange", { detail: { theme: theme } }));
  }

  function toggleTheme() {
    var next = currentTheme() === "light" ? "dark" : "light";
    setTheme(next);
    toast(next === "light" ? "Light theme" : "Dark theme");
  }

  function initTheme() {
    var button = $("[data-theme-toggle]");
    if (button) button.addEventListener("click", toggleTheme);
  }

  /* ---------------------------------------------------------------------- */
  /* Atmosphere: cursor spotlight                                           */
  /* ---------------------------------------------------------------------- */

  function initSpotlight() {
    body.dataset.pointer = finePointerQuery.matches ? "fine" : "coarse";

    finePointerQuery.addEventListener("change", function (event) {
      body.dataset.pointer = event.matches ? "fine" : "coarse";
    });

    if (!finePointerQuery.matches || reduced()) return;

    var target = { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
    var current = { x: target.x, y: target.y };
    var running = false;

    window.addEventListener(
      "pointermove",
      function (event) {
        target.x = event.clientX;
        target.y = event.clientY;
        if (!running) {
          running = true;
          requestAnimationFrame(tick);
        }
      },
      { passive: true }
    );

    function tick() {
      // Light easing keeps the glow from feeling glued to the cursor.
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;

      root.style.setProperty("--mx", current.x.toFixed(1) + "px");
      root.style.setProperty("--my", current.y.toFixed(1) + "px");

      if (Math.abs(target.x - current.x) > 0.4 || Math.abs(target.y - current.y) > 0.4) {
        requestAnimationFrame(tick);
      } else {
        running = false;
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Header: stuck state, nav pill, mobile toggle, active link              */
  /* ---------------------------------------------------------------------- */

  function initHeader() {
    var header = $(".site-header");
    var nav = $(".site-nav");
    var toggle = $(".nav-toggle");

    if (header) {
      var onScroll = rafThrottle(function () {
        header.dataset.stuck = window.scrollY > 12 ? "true" : "false";
      });
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.dataset.open !== "true";
        nav.dataset.open = String(open);
        toggle.setAttribute("aria-expanded", String(open));
      });

      $$("a", nav).forEach(function (link) {
        link.addEventListener("click", function () {
          nav.dataset.open = "false";
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }

    if (!nav) return;

    // Mark the current page.
    var path = window.location.pathname.replace(/\/+$/, "");
    var file = path.split("/").pop() || "index";
    file = file.replace(/\.html$/, "") || "index";

    var links = $$("a", nav);
    var active = null;

    links.forEach(function (link) {
      var href = (link.getAttribute("href") || "").replace(/\/+$/, "");
      var name = href.split("/").pop() || "index";
      name = name.replace(/\.html$/, "") || "index";

      if (name === file) {
        link.setAttribute("aria-current", "page");
        active = link;
      }
    });

    // Sliding pill indicator.
    var pill = document.createElement("span");
    pill.className = "nav-pill";
    pill.setAttribute("aria-hidden", "true");
    nav.appendChild(pill);

    function moveTo(link) {
      if (!link || window.innerWidth <= 860) return;
      pill.style.setProperty("--pill-x", link.offsetLeft + "px");
      pill.style.setProperty("--pill-w", link.offsetWidth + "px");
      pill.dataset.ready = "true";
    }

    links.forEach(function (link) {
      link.addEventListener("pointerenter", function () {
        moveTo(link);
      });
      link.addEventListener("focus", function () {
        moveTo(link);
      });
    });

    nav.addEventListener("pointerleave", function () {
      moveTo(active);
    });

    // Fonts can shift link widths, so settle the pill after they load.
    moveTo(active);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        moveTo(active);
      });
    }
    window.addEventListener(
      "resize",
      rafThrottle(function () {
        moveTo(active);
      }),
      { passive: true }
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Scroll progress (fallback for browsers without scroll-driven CSS)      */
  /* ---------------------------------------------------------------------- */

  function initScrollProgress() {
    if (window.CSS && CSS.supports && CSS.supports("animation-timeline", "scroll()")) return;

    var bar = $(".scroll-progress");
    if (!bar) return;

    var update = rafThrottle(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      bar.style.setProperty("--scroll-progress", String(ratio));
    });

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Split-text headlines                                                   */
  /* ---------------------------------------------------------------------- */

  function splitElement(element) {
    var counter = { index: 0 };

    function wrap(content) {
      var outer = document.createElement("span");
      outer.className = "split-word";
      var inner = document.createElement("span");
      // Each word trails the previous one slightly for a cascading rise.
      inner.style.setProperty("--d", counter.index * 55 + "ms");
      counter.index += 1;
      inner.appendChild(content);
      outer.appendChild(inner);
      return outer;
    }

    function walk(node) {
      var children = Array.prototype.slice.call(node.childNodes);

      children.forEach(function (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          var words = child.textContent.split(/(\s+)/);
          var fragment = document.createDocumentFragment();

          words.forEach(function (part) {
            if (part === "") return;
            if (/^\s+$/.test(part)) {
              fragment.appendChild(document.createTextNode(" "));
            } else {
              fragment.appendChild(wrap(document.createTextNode(part)));
            }
          });

          node.replaceChild(fragment, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.hasAttribute("data-split-atom")) {
            // Treat the whole element as one animating unit. Splitting inside a
            // gradient-clipped span breaks the gradient, so we never do it.
            var placeholder = document.createElement("span");
            node.replaceChild(placeholder, child);
            node.replaceChild(wrap(child), placeholder);
          } else {
            walk(child);
          }
        }
      });
    }

    walk(element);
  }

  function initSplitText() {
    var targets = $$("[data-split]");
    if (targets.length === 0) return;

    if (reduced()) {
      targets.forEach(function (element) {
        element.dataset.splitReady = "true";
      });
      return;
    }

    targets.forEach(function (element) {
      splitElement(element);
    });

    // Reveal on next frame so the initial hidden state is actually painted.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        targets.forEach(function (element) {
          if (element.dataset.split === "onscroll") return;
          element.dataset.splitReady = "true";
        });
      });
    });

    var onScrollTargets = targets.filter(function (element) {
      return element.dataset.split === "onscroll";
    });

    if (onScrollTargets.length === 0 || !("IntersectionObserver" in window)) {
      onScrollTargets.forEach(function (element) {
        element.dataset.splitReady = "true";
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.dataset.splitReady = "true";
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    onScrollTargets.forEach(function (element) {
      observer.observe(element);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Reveal on scroll (+ staggered children)                                */
  /* ---------------------------------------------------------------------- */

  /**
   * A single host element can own several animations — the console holds two
   * gauges, a meter and a sparkline — so callbacks are kept as a list per host.
   */
  var revealCallbacks = new WeakMap();
  var revealHosts = [];

  /** Lets other modules start their animation the moment an element is seen. */
  function onReveal(element, callback) {
    var list = revealCallbacks.get(element);
    if (!list) {
      list = [];
      revealCallbacks.set(element, list);
      revealHosts.push(element);
    }
    list.push(callback);
  }

  function runRevealCallbacks(element) {
    var list = revealCallbacks.get(element);
    if (!list) return;
    revealCallbacks.delete(element);
    list.forEach(function (callback) {
      callback(element);
    });
  }

  function initReveal() {
    $$("[data-stagger]").forEach(function (container) {
      $$(":scope > *", container).forEach(function (child, index) {
        child.style.setProperty("--i", String(index));
      });
    });

    var targets = $$("[data-reveal], [data-stagger]");

    function show(element) {
      element.classList.add("is-in");
      runRevealCallbacks(element);
    }

    if (!("IntersectionObserver" in window) || reduced()) {
      targets.forEach(show);
      revealHosts.forEach(runRevealCallbacks);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          show(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach(function (element) {
      observer.observe(element);
    });

    // Hosts that animate themselves without being reveal containers.
    var extras = revealHosts.filter(function (element) {
      return !element.hasAttribute("data-reveal") && !element.hasAttribute("data-stagger");
    });

    if (extras.length === 0) return;

    var extraObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runRevealCallbacks(entry.target);
          extraObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.25 }
    );

    extras.forEach(function (element) {
      extraObserver.observe(element);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 3D tilt + cursor-tracked card glow                                     */
  /* ---------------------------------------------------------------------- */

  function initTilt() {
    var cards = $$("[data-tilt]");
    if (cards.length === 0) return;

    cards.forEach(function (card) {
      card.classList.add("tilt", "tilt--resting");

      // `data-tilt="0"` means glow only — used where tilting would fight with
      // the content, such as a form the visitor is typing into.
      var strength = Number(card.dataset.tilt);
      if (!isFinite(strength)) strength = 5;

      // The glow follows the pointer even when tilt itself is disabled.
      card.addEventListener(
        "pointermove",
        function (event) {
          var rect = card.getBoundingClientRect();
          var px = (event.clientX - rect.left) / rect.width;
          var py = (event.clientY - rect.top) / rect.height;

          card.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
          card.style.setProperty("--gy", (py * 100).toFixed(1) + "%");

          if (strength <= 0 || reduced() || !finePointerQuery.matches) return;

          card.classList.remove("tilt--resting");
          card.style.setProperty("--ry", ((px - 0.5) * strength * 2).toFixed(2) + "deg");
          card.style.setProperty("--rx", ((0.5 - py) * strength * 2).toFixed(2) + "deg");
        },
        { passive: true }
      );

      card.addEventListener("pointerleave", function () {
        card.classList.add("tilt--resting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Magnetic buttons                                                       */
  /* ---------------------------------------------------------------------- */

  function initMagnetic() {
    if (reduced() || !finePointerQuery.matches) return;

    $$("[data-magnetic]").forEach(function (element) {
      element.classList.add("magnetic");
      var pull = Number(element.dataset.magnetic) || 8;

      element.addEventListener(
        "pointermove",
        function (event) {
          var rect = element.getBoundingClientRect();
          var dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          var dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

          element.dataset.active = "true";
          element.style.setProperty("--magnet-x", (clamp(dx, -1, 1) * pull).toFixed(1) + "px");
          element.style.setProperty("--magnet-y", (clamp(dy, -1, 1) * pull).toFixed(1) + "px");
        },
        { passive: true }
      );

      element.addEventListener("pointerleave", function () {
        element.dataset.active = "false";
        element.style.setProperty("--magnet-x", "0px");
        element.style.setProperty("--magnet-y", "0px");
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Animated counters                                                      */
  /* ---------------------------------------------------------------------- */

  function initCounters() {
    $$("[data-count]").forEach(function (element) {
      var target = Number(element.dataset.count);
      if (!isFinite(target)) return;

      var decimals = Number(element.dataset.countDecimals) || 0;
      var prefix = element.dataset.countPrefix || "";
      var suffix = element.dataset.countSuffix || "";

      function render(value) {
        var shown = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
        if (decimals === 0 && Math.abs(target) >= 1000) {
          shown = Math.round(value).toLocaleString("en-US");
        }
        element.textContent = prefix + shown + suffix;
      }

      render(0);

      var host = element.closest("[data-reveal], [data-stagger]") || element;

      onReveal(host, function () {
        if (reduced()) {
          render(target);
          return;
        }

        var duration = 1500;
        var start = performance.now();

        (function step(now) {
          var t = clamp((now - start) / duration, 0, 1);
          render(target * easeOutExpo(t));
          if (t < 1) requestAnimationFrame(step);
          else render(target);
        })(start);
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Marquee                                                                */
  /* ---------------------------------------------------------------------- */

  function initMarquee() {
    $$(".marquee").forEach(function (marquee) {
      var track = $(".marquee__track", marquee);
      if (!track) return;

      // A second identical track makes the loop seamless: when the first
      // slides a full width left, the clone has taken its place.
      var clone = track.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      $$("a", clone).forEach(function (link) {
        link.setAttribute("tabindex", "-1");
      });
      marquee.appendChild(clone);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Reliability console: gauges, meters, sparkline                         */
  /* ---------------------------------------------------------------------- */

  function initGauges() {
    $$("[data-gauge]").forEach(function (gauge) {
      var circle = $(".gauge__value", gauge);
      var readout = $("[data-gauge-value]", gauge);
      var percent = clamp(Number(gauge.dataset.gauge) || 0, 0, 100);

      if (!circle) return;

      var radius = Number(circle.getAttribute("r")) || 16;
      var circumference = 2 * Math.PI * radius;
      circle.style.setProperty("--circ", circumference.toFixed(2));

      var host = gauge.closest("[data-reveal], [data-stagger]") || gauge;

      onReveal(host, function () {
        circle.style.strokeDashoffset = (circumference * (1 - percent / 100)).toFixed(2);
        if (!readout) return;

        var decimals = Number(readout.dataset.gaugeDecimals) || 0;
        var display = Number(readout.dataset.gaugeValue);
        if (!isFinite(display)) display = percent;
        var suffix = readout.dataset.gaugeSuffix || "";

        if (reduced()) {
          readout.textContent = display.toFixed(decimals) + suffix;
          return;
        }

        var duration = 1600;
        var start = performance.now();

        (function step(now) {
          var t = clamp((now - start) / duration, 0, 1);
          readout.textContent = (display * easeOutExpo(t)).toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(step);
          else readout.textContent = display.toFixed(decimals) + suffix;
        })(start);
      });
    });
  }

  function initMeters() {
    $$("[data-meter]").forEach(function (meter) {
      var fill = $(".meter__fill", meter);
      if (!fill) return;

      var percent = clamp(Number(meter.dataset.meter) || 0, 0, 100);
      var host = meter.closest("[data-reveal], [data-stagger]") || meter;

      onReveal(host, function () {
        fill.style.width = percent + "%";
      });
    });
  }

  /**
   * Sparkline for the "reliability console" panel. The series is synthetic —
   * the panel is labelled as a simulation in the markup — it exists to give the
   * hero a living, on-theme visual rather than to report real telemetry.
   */
  function initSparkline() {
    var host = $("[data-spark]");
    if (!host) return;

    var canvas = $("canvas", host);
    var readout = $("[data-spark-value]", host);
    if (!canvas) return;

    var context = canvas.getContext("2d");
    if (!context) return;

    var POINTS = 48;
    var series = [];
    var base = 42;

    for (var i = 0; i < POINTS; i += 1) {
      series.push(base + Math.sin(i / 3.5) * 5 + (Math.random() - 0.5) * 6);
    }

    var width = 0;
    var height = 0;

    function resize() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function accentColor() {
      return getComputedStyle(root).getPropertyValue("--mint").trim() || "#7ee0c4";
    }

    function draw() {
      if (width === 0) resize();

      context.clearRect(0, 0, width, height);

      var min = Math.min.apply(null, series);
      var max = Math.max.apply(null, series);
      var span = Math.max(max - min, 1);
      var padding = 4;

      var points = series.map(function (value, index) {
        return {
          x: (index / (POINTS - 1)) * width,
          y: padding + (1 - (value - min) / span) * (height - padding * 2)
        };
      });

      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (var i = 0; i < points.length - 1; i += 1) {
        var midX = (points[i].x + points[i + 1].x) / 2;
        var midY = (points[i].y + points[i + 1].y) / 2;
        context.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      context.lineTo(points[points.length - 1].x, points[points.length - 1].y);

      var stroke = accentColor();

      // Fill under the curve.
      context.save();
      var area = new Path2D();
      area.moveTo(points[0].x, height);
      points.forEach(function (point) {
        area.lineTo(point.x, point.y);
      });
      area.lineTo(points[points.length - 1].x, height);
      area.closePath();

      // globalAlpha keeps the fill tied to the themed accent without having to
      // parse the token into an rgba() string.
      var gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, stroke);
      gradient.addColorStop(1, "transparent");
      context.globalAlpha = 0.3;
      context.fillStyle = gradient;
      context.fill(area);
      context.restore();

      context.strokeStyle = stroke;
      context.lineWidth = 1.6;
      context.lineJoin = "round";
      context.stroke();

      // Leading dot.
      var last = points[points.length - 1];
      context.beginPath();
      context.arc(last.x - 1.5, last.y, 2.2, 0, Math.PI * 2);
      context.fillStyle = stroke;
      context.fill();
    }

    function push() {
      // Random walk with occasional small spikes, clamped to a plausible range.
      var drift = (Math.random() - 0.48) * 4;
      var spike = Math.random() > 0.94 ? Math.random() * 14 : 0;
      base = clamp(base + drift, 30, 58);
      var next = clamp(base + spike + (Math.random() - 0.5) * 3, 26, 82);

      series.push(next);
      series.shift();

      if (readout) readout.textContent = next.toFixed(0) + " ms";
      draw();
    }

    resize();
    window.addEventListener("resize", rafThrottle(resize), { passive: true });
    document.addEventListener("sr:themechange", function () {
      draw();
    });

    var timer = null;
    var visible = false;

    function start() {
      if (timer !== null || reduced()) return;
      timer = window.setInterval(push, 1400);
    }

    function stop() {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    }

    onReveal(host, function () {
      draw();
      if (readout) readout.textContent = series[series.length - 1].toFixed(0) + " ms";
      visible = true;
      if (!document.hidden) start();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (visible) start();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (visible && !document.hidden) start();
          } else {
            stop();
          }
        });
      }).observe(host);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Back to top                                                            */
  /* ---------------------------------------------------------------------- */

  function initBackToTop() {
    var button = $(".to-top");
    if (!button) return;

    var update = rafThrottle(function () {
      button.dataset.visible = window.scrollY > window.innerHeight * 0.8 ? "true" : "false";
    });

    update();
    window.addEventListener("scroll", update, { passive: true });

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Section rail                                                           */
  /* ---------------------------------------------------------------------- */

  function initRail() {
    var sections = $$("main [data-section][id]");
    if (sections.length < 3) return;

    var rail = document.createElement("nav");
    rail.className = "rail";
    rail.setAttribute("aria-label", "Sections on this page");

    var dots = sections.map(function (section) {
      var link = document.createElement("a");
      link.href = "#" + section.id;
      var label = document.createElement("span");
      label.textContent = section.dataset.section || section.id;
      link.appendChild(label);
      rail.appendChild(link);
      return link;
    });

    body.appendChild(rail);

    var update = rafThrottle(function () {
      rail.dataset.visible = window.scrollY > 240 ? "true" : "false";

      var marker = window.innerHeight * 0.4;
      var activeIndex = 0;

      sections.forEach(function (section, index) {
        if (section.getBoundingClientRect().top <= marker) activeIndex = index;
      });

      dots.forEach(function (dot, index) {
        if (index === activeIndex) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    });

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Timeline progress rail                                                 */
  /* ---------------------------------------------------------------------- */

  function initTimelineProgress() {
    var timeline = $(".timeline");
    if (!timeline) return;

    if (reduced()) {
      timeline.style.setProperty("--timeline-progress", "1");
      return;
    }

    var update = rafThrottle(function () {
      var rect = timeline.getBoundingClientRect();
      var anchor = window.innerHeight * 0.55;
      var progress = clamp((anchor - rect.top) / Math.max(rect.height, 1), 0, 1);
      timeline.style.setProperty("--timeline-progress", progress.toFixed(3));
    });

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Project filters                                                        */
  /* ---------------------------------------------------------------------- */

  function initFilters() {
    var bar = $("[data-filter-bar]");
    if (!bar) return;

    var buttons = $$("[data-filter]", bar);
    var projects = $$("[data-tags]");
    var empty = $("[data-filter-empty]");
    var status = $("[data-filter-status]");

    // Show how many projects sit behind each filter.
    buttons.forEach(function (button) {
      var key = button.dataset.filter;
      var count =
        key === "all"
          ? projects.length
          : projects.filter(function (project) {
              return project.dataset.tags.split(/\s+/).indexOf(key) !== -1;
            }).length;

      var badge = document.createElement("span");
      badge.className = "filter__count";
      badge.textContent = String(count);
      button.appendChild(badge);
    });

    function apply(key) {
      var shown = 0;

      projects.forEach(function (project) {
        var match = key === "all" || project.dataset.tags.split(/\s+/).indexOf(key) !== -1;
        if (match) shown += 1;

        if (match) {
          project.hidden = false;
          // Let the browser lay it out before fading it back in.
          requestAnimationFrame(function () {
            project.dataset.filtered = "in";
          });
        } else {
          project.dataset.filtered = "out";
          window.setTimeout(function () {
            if (project.dataset.filtered === "out") project.hidden = true;
          }, 380);
        }
      });

      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.filter === key));
      });

      if (empty) empty.hidden = shown > 0;
      if (status) {
        status.textContent =
          shown + (shown === 1 ? " project" : " projects") + (key === "all" ? "" : " tagged " + key);
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        apply(button.dataset.filter);
      });
    });

    apply("all");
  }

  /* ---------------------------------------------------------------------- */
  /* Contact form (composes a mailto — no backend, nothing stored)          */
  /* ---------------------------------------------------------------------- */

  function initContactForm() {
    var form = $("[data-mailto-form]");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var from = String(data.get("email") || "").trim();
      var subject = String(data.get("subject") || "").trim() || "Portfolio enquiry";
      var message = String(data.get("message") || "").trim();

      var bodyText = message + "\n\n—\n" + name + "\n" + from;
      var href =
        "mailto:" +
        SITE.email +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(bodyText);

      window.location.href = href;
      toast("Opening your email client…");
    });

    var copyButton = $("[data-copy-message]", form);
    if (!copyButton) return;

    copyButton.addEventListener("click", function () {
      var data = new FormData(form);
      var text =
        "To: " +
        SITE.email +
        "\nSubject: " +
        (String(data.get("subject") || "").trim() || "Portfolio enquiry") +
        "\n\n" +
        String(data.get("message") || "").trim();
      copyText(text, "Draft");
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Command palette                                                        */
  /* ---------------------------------------------------------------------- */

  function initPalette() {
    var dialog = document.createElement("dialog");
    dialog.className = "palette";
    dialog.setAttribute("aria-label", "Command palette");
    dialog.innerHTML =
      '<div class="palette__panel">' +
      '<div class="palette__search">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>' +
      '<input type="text" placeholder="Search pages and actions…" aria-label="Search pages and actions" ' +
      'autocomplete="off" spellcheck="false" />' +
      "<kbd>Esc</kbd>" +
      "</div>" +
      '<div class="palette__list" role="listbox" aria-label="Results"></div>' +
      '<div class="palette__foot">' +
      "<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>" +
      "<span><kbd>↵</kbd> select</span>" +
      "<span><kbd>⌘</kbd><kbd>K</kbd> toggle</span>" +
      "</div>" +
      "</div>";

    body.appendChild(dialog);

    var input = $("input", dialog);
    var list = $(".palette__list", dialog);

    function go(href) {
      window.location.href = href;
    }

    var commands = [
      { group: "Navigate", label: "Home", hint: "index.html", icon: "home", run: function () { go("index.html"); } },
      { group: "Navigate", label: "About", hint: "about.html", icon: "user", run: function () { go("about.html"); } },
      { group: "Navigate", label: "Projects", hint: "projects.html", icon: "grid", run: function () { go("projects.html"); } },
      { group: "Navigate", label: "Experience", hint: "experience.html", icon: "clock", run: function () { go("experience.html"); } },
      { group: "Navigate", label: "Contact", hint: "contact.html", icon: "mail", run: function () { go("contact.html"); } },
      {
        group: "Actions",
        label: "Download résumé (PDF)",
        icon: "download",
        run: function () {
          var link = document.createElement("a");
          link.href = SITE.resume;
          link.download = "";
          body.appendChild(link);
          link.click();
          body.removeChild(link);
          toast("Downloading résumé");
        }
      },
      {
        group: "Actions",
        label: "Copy email address",
        hint: SITE.email,
        icon: "copy",
        run: function () {
          copyText(SITE.email, "Email address");
        }
      },
      {
        group: "Actions",
        label: "Copy phone number",
        hint: SITE.phone,
        icon: "copy",
        run: function () {
          copyText(SITE.phone, "Phone number");
        }
      },
      {
        group: "Actions",
        label: "Toggle light / dark theme",
        icon: "theme",
        run: toggleTheme
      },
      {
        group: "Actions",
        label: "Print this page",
        icon: "printer",
        run: function () {
          window.print();
        }
      },
      {
        group: "Elsewhere",
        label: "GitHub — ritika-kulkarni",
        icon: "external",
        run: function () {
          window.open(SITE.github, "_blank", "noopener");
        }
      },
      {
        group: "Elsewhere",
        label: "LinkedIn — ritika-kulkarni",
        icon: "external",
        run: function () {
          window.open(SITE.linkedin, "_blank", "noopener");
        }
      }
    ];

    /** Subsequence match: "dlr" finds "Download résumé". */
    function score(query, text) {
      if (query === "") return 1;

      var haystack = text.toLowerCase();
      var needle = query.toLowerCase();

      var direct = haystack.indexOf(needle);
      if (direct !== -1) return 1000 - direct;

      var position = 0;
      for (var i = 0; i < needle.length; i += 1) {
        position = haystack.indexOf(needle[i], position);
        if (position === -1) return 0;
        position += 1;
      }
      return 1;
    }

    var results = [];
    var activeIndex = 0;

    function render() {
      var query = input.value.trim();

      results = commands
        .map(function (command) {
          return {
            command: command,
            score: score(query, command.label + " " + (command.hint || "") + " " + command.group)
          };
        })
        .filter(function (entry) {
          return entry.score > 0;
        })
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .map(function (entry) {
          return entry.command;
        });

      activeIndex = 0;
      list.innerHTML = "";

      if (results.length === 0) {
        var empty = document.createElement("p");
        empty.className = "palette__empty";
        empty.textContent = "No matches for “" + query + "”";
        list.appendChild(empty);
        return;
      }

      var lastGroup = null;

      results.forEach(function (command, index) {
        if (query === "" && command.group !== lastGroup) {
          lastGroup = command.group;
          var heading = document.createElement("p");
          heading.className = "palette__group";
          heading.textContent = command.group;
          list.appendChild(heading);
        }

        var item = document.createElement("button");
        item.type = "button";
        item.className = "palette__item";
        item.setAttribute("role", "option");
        item.dataset.index = String(index);
        item.innerHTML =
          icon(command.icon) +
          '<span class="palette__item-label"></span>' +
          (command.hint ? '<span class="palette__item-hint"></span>' : "");

        $(".palette__item-label", item).textContent = command.label;
        if (command.hint) $(".palette__item-hint", item).textContent = command.hint;

        item.addEventListener("click", function () {
          runIndex(index);
        });
        item.addEventListener("pointerenter", function () {
          setActive(index);
        });

        list.appendChild(item);
      });

      setActive(0);
    }

    function items() {
      return $$(".palette__item", list);
    }

    function setActive(index) {
      activeIndex = index;
      items().forEach(function (item) {
        var isActive = Number(item.dataset.index) === index;
        item.dataset.active = String(isActive);
        item.setAttribute("aria-selected", String(isActive));
        if (isActive) item.scrollIntoView({ block: "nearest" });
      });
    }

    function runIndex(index) {
      var command = results[index];
      if (!command) return;
      close();
      // Let the dialog finish closing before navigating or printing.
      window.setTimeout(command.run, 60);
    }

    function open() {
      if (dialog.open) return;
      input.value = "";
      render();
      dialog.showModal();
      input.focus();
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    input.addEventListener("input", render);

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault();
        if (results.length) setActive((activeIndex + 1) % results.length);
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault();
        if (results.length) setActive((activeIndex - 1 + results.length) % results.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        runIndex(activeIndex);
      }
    });

    // Click outside the panel closes.
    dialog.addEventListener("pointerdown", function (event) {
      if (event.target === dialog) close();
    });

    document.addEventListener("keydown", function (event) {
      var isToggle = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      var tag = document.activeElement ? document.activeElement.tagName : "";
      var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (isToggle) {
        event.preventDefault();
        if (dialog.open) close();
        else open();
        return;
      }

      if (event.key === "/" && !typing && !dialog.open) {
        event.preventDefault();
        open();
      }
    });

    $$("[data-palette-open]").forEach(function (trigger) {
      trigger.addEventListener("click", open);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Copy triggers anywhere in the page                                     */
  /* ---------------------------------------------------------------------- */

  function initCopyTriggers() {
    $$("[data-copy]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        copyText(trigger.dataset.copy, trigger.dataset.copyLabel || "Value");
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Boot                                                                   */
  /* ---------------------------------------------------------------------- */

  initPreloader();
  initTheme();
  initSpotlight();
  initHeader();
  initScrollProgress();
  initSplitText();
  initTilt();
  initMagnetic();
  initMarquee();
  initCounters();
  initGauges();
  initMeters();
  initSparkline();
  initBackToTop();
  initRail();
  initTimelineProgress();
  initFilters();
  initContactForm();
  initCopyTriggers();
  initPalette();

  // Reveal runs last so modules have registered their onReveal callbacks.
  initReveal();
})();
