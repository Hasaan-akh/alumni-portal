// landing.js - rotating quotes for index.html
// Quotes fade out, the text is swapped with textContent, then the next one fades in. Loops forever.

(function () {
  "use strict";

  var QUOTES = [
    "Once a UBITian, always a UBITian. This portal is how we stay in touch.",
    "Your batchmates are now engineers, founders and teachers. Find them here.",
    "Every job posted here is a hand extended to the next graduate.",
    "Mentorship starts with one message. Send yours today.",
    "The department gave us a start. The alumni network gives us a future.",
    "Reconnect with the people who sat beside you in the lab.",
    "Share what you know. Someone in your department is looking for it.",
    "A strong department is built by the graduates who come back to it.",
    "Hiring? Look for talent in your own alumni community first.",
    "Your story could be the reason a student chooses their path."
  ];

  var SHOW_MS = 5500;   // how long each quote stays on screen
  var FADE_MS = 700;    // must match the transition time in landing.css

  var el = document.getElementById("quoteText");
  if (!el) return;

  var index = 0;
  var timer = null;

  function showNext() {
    el.classList.add("is-fading");

    setTimeout(function () {
      index = (index + 1) % QUOTES.length;
      el.textContent = QUOTES[index];
      el.classList.remove("is-fading");
    }, FADE_MS);
  }

  function start() {
    if (timer === null) timer = setInterval(showNext, SHOW_MS);
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Pause while the tab is hidden so quotes do not pile up
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  el.textContent = QUOTES[0];
  start();
})();