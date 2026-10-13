/* =========================================================
   A. Freda Merlin — Portfolio interactions (vanilla JS)
   ========================================================= */
(function () {
  "use strict";

  /* ------------------------------------------------------
     EDIT THESE
     ------------------------------------------------------ */
  var RESUME_PATH = "assets/resume/A_Freda_Merlin_Resume.pdf"; // put your PDF here
  var PROFILE_IMAGE_PATH = "assets/images/profile.jpg";        // optional permanent photo
  var CONTACT_EMAIL = "fredamerlinamulraj@gmail.com";
  var MAX_PHOTO_BYTES = 3 * 1024 * 1024;                       // 3 MB

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  document.documentElement.classList.remove("no-js");

  /* ---------- Toast ---------- */
  var toastEl = $("#toast");
  var toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    // force reflow so the transition runs
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () { toastEl.hidden = true; }, 300);
    }, 4200);
  }

  /* ---------- Footer year ---------- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky header state ---------- */
  var header = $("#siteHeader");
  function onScrollHeader() { header.classList.toggle("scrolled", window.scrollY > 12); }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Mobile menu ---------- */
  var navToggle = $("#navToggle");
  var navMenu = $("#navMenu");

  function setMenu(open) {
    navMenu.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  navToggle.addEventListener("click", function () {
    setMenu(navToggle.getAttribute("aria-expanded") !== "true");
  });
  $$("a", navMenu).forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      navToggle.focus();
    }
  });
  window.addEventListener("resize", function () { if (window.innerWidth > 860) setMenu(false); });

  /* ---------- Active nav link on scroll ---------- */
  var navLinks = $$(".nav-link");
  var sections = navLinks
    .map(function (l) { return $(l.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) {
            var active = l.getAttribute("href") === "#" + entry.target.id;
            l.classList.toggle("active", active);
            if (active) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- Placeholder links ----------
     Any link with class "is-placeholder" and href="#" shows a hint instead of jumping.
     Once you replace href with a real URL, remove the "is-placeholder" class (or the
     script will do it for you on load). */
  $$("a.is-placeholder").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href && href !== "#") {
      a.classList.remove("is-placeholder");
      a.removeAttribute("data-placeholder");
      return;
    }
    a.addEventListener("click", function (e) {
      e.preventDefault();
      toast((a.dataset.placeholder || "This") + " link is a placeholder. Replace its href in index.html with your real URL.");
    });
  });

  /* ---------- Resume download ----------
     Checks the PDF exists (when served over http/https) so the button never fails silently. */
  $$(".js-resume").forEach(function (a) {
    a.setAttribute("href", RESUME_PATH);
    a.addEventListener("click", function (e) {
      if (location.protocol === "file:") return; // can't pre-check from file://, let the browser handle it
      e.preventDefault();
      fetch(RESUME_PATH, { method: "HEAD" })
        .then(function (res) {
          if (!res.ok) throw new Error("missing");
          var tmp = document.createElement("a");
          tmp.href = RESUME_PATH;
          tmp.download = RESUME_PATH.split("/").pop();
          document.body.appendChild(tmp);
          tmp.click();
          tmp.remove();
        })
        .catch(function () {
          toast("Resume not found. Add your PDF at " + RESUME_PATH + " and refresh.");
        });
    });
  });

  /* ---------- Profile photo upload + preview ---------- */
  var photoInput = $("#photoInput");
  var profileImg = $("#profileImg");
  var portrait = $("#portrait");
  var photoActions = $("#photoActions");
  var photoHint = $("#photoHint");
  var photoRemove = $("#photoRemove");
  var objectUrl = null;
  var defaultHint = photoHint.textContent;

  function setHint(msg, type) {
    photoHint.textContent = msg;
    photoHint.className = "photo-hint" + (type ? " " + type : "");
  }

  function showPhoto(src) {
    profileImg.src = src;
    profileImg.hidden = false;
    portrait.classList.add("has-photo");
    photoActions.hidden = false;
  }

  function clearPhoto() {
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    profileImg.removeAttribute("src");
    profileImg.hidden = true;
    portrait.classList.remove("has-photo");
    photoActions.hidden = true;
    photoInput.value = "";
    setHint(defaultHint);
  }

  photoInput.addEventListener("change", function () {
    var file = photoInput.files && photoInput.files[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      setHint("Please choose an image file (JPG, PNG, WebP or GIF).", "error");
      photoInput.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setHint("That image is too large. Please choose one under 3 MB.", "error");
      photoInput.value = "";
      return;
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    showPhoto(objectUrl);
    setHint("Photo preview updated. To keep it permanently, save it as " + PROFILE_IMAGE_PATH + ".", "ok");
  });

  photoRemove.addEventListener("click", clearPhoto);

  // Allow keyboard activation of the upload overlay label
  $("#uploadOverlay").setAttribute("tabindex", "0");
  $("#uploadOverlay").addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); photoInput.click(); }
  });

  // Use a saved profile image if one exists (silently ignored if not)
  (function loadSavedPhoto() {
    var probe = new Image();
    probe.onload = function () { if (!objectUrl) { showPhoto(PROFILE_IMAGE_PATH); photoActions.hidden = true; setHint("JPG, PNG, WebP or GIF · up to 3 MB"); } };
    probe.src = PROFILE_IMAGE_PATH;
  })();

  /* ---------- Contact form (mailto-based, client-side validation) ---------- */
  var form = $("#contactForm");
  var statusEl = $("#formStatus");

  var rules = {
    name: function (v) { return v.trim().length >= 2 ? "" : "Please enter your name."; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email address."; },
    subject: function (v) { return v.trim().length >= 3 ? "" : "Please add a short subject."; },
    message: function (v) { return v.trim().length >= 10 ? "" : "Your message should be at least 10 characters."; }
  };

  function validateField(input) {
    var field = input.closest(".field");
    var err = $(".field-error", field);
    var msg = rules[input.name](input.value);
    err.textContent = msg;
    field.classList.toggle("invalid", !!msg);
    field.classList.toggle("valid", !msg && input.value.trim() !== "");
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  function showStatus(type, message) {
    statusEl.className = "form-status " + type;
    statusEl.textContent = message;
    statusEl.hidden = false;
  }

  $$("input, textarea", form).forEach(function (input) {
    input.addEventListener("blur", function () { validateField(input); });
    input.addEventListener("input", function () {
      if (input.closest(".field").classList.contains("invalid")) validateField(input);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.hidden = true;

    var inputs = $$("input, textarea", form);
    var firstInvalid = null;
    inputs.forEach(function (input) {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      showStatus("error", "Please fix the highlighted fields and try again.");
      return;
    }

    var data = new FormData(form);
    var body =
      "Hi Freda,\n\n" + data.get("message").trim() +
      "\n\n— " + data.get("name").trim() + "\n" + data.get("email").trim();
    var href = "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(data.get("subject").trim()) +
      "&body=" + encodeURIComponent(body);

    showStatus("success", "Your email app should now open with the message ready. Nothing has been sent yet. Press send there to deliver it.");
    window.location.href = href;
  });
})();
