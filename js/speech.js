// Text to speech with the voices of the browser, British English preferred. Browser only.
(function (root) {
  "use strict";
  const supported = "speechSynthesis" in root && "SpeechSynthesisUtterance" in root;
  // Button put next to every English sentence; it is empty when the browser cannot speak.
  const buttonHTML = supported ? `<button class="say" type="button" title="Escuchar" aria-label="Escuchar en inglés">🔊</button>` : "";
  let voice = null, playing = null;

  function pickVoice() {
    const voices = speechSynthesis.getVoices(), lang = v => v.lang.replace("_", "-");
    voice = voices.find(v => lang(v) === "en-GB") || voices.find(v => /^en/i.test(lang(v))) || null;
  }

  function stop() {
    if (!supported) return;
    speechSynthesis.cancel();
    if (playing) { playing.classList.remove("playing"); playing.textContent = "🔊"; playing = null; }
  }

  // Reads the English sentence that sits before the button; pressing the same button again stops it.
  function speak(btn) {
    const same = playing === btn;
    stop();
    if (same) return;
    const u = new SpeechSynthesisUtterance(btn.parentElement.firstChild.textContent);
    u.lang = "en-GB"; u.rate = 0.9;
    if (voice) u.voice = voice;
    const reset = () => { if (playing === btn) stop(); };
    u.onend = reset;
    u.onerror = ev => {
      reset();
      // "canceled"/"interrupted" are normal (another button was pressed); anything else means the device cannot speak English
      if (ev.error && ev.error !== "canceled" && ev.error !== "interrupted") {
        btn.textContent = "⚠"; btn.title = "Este dispositivo no tiene una voz en inglés disponible";
        setTimeout(() => { btn.textContent = "🔊"; btn.title = "Escuchar"; }, 3000);
      }
    };
    playing = btn; btn.classList.add("playing"); btn.textContent = "⏹";
    speechSynthesis.speak(u);
  }

  if (supported) { pickVoice(); speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  root.EVM = root.EVM || {};
  root.EVM.speech = { supported, buttonHTML, speak, stop };
})(window);
