// Tiny synthesized sound for Shadow Line: soft footstep taps that get
// louder when you run, and a short alarm sting when a guard spots you.
// Everything is made with WebAudio oscillators — no audio files, no network.
// Sound starts only after the player first presses a key, so browsers that
// block autoplay stay silent instead of erroring.

export function createAudio() {
  let ctx = null;
  let alarmOn = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, gain) {
    const ac = ensure();
    if (!ac || ac.state === 'suspended') return;
    try {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch {
      // Sound is garnish; a failure here must never break the game.
    }
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    },
    footstep(loud) {
      blip(loud ? 150 : 110, 0.07, loud ? 0.05 : 0.025);
    },
    // A rising two-note sting the first moment a guard's suspicion peaks.
    alarm() {
      if (alarmOn) return;
      alarmOn = true;
      blip(660, 0.18, 0.06);
      setTimeout(() => blip(880, 0.25, 0.06), 140);
      setTimeout(() => {
        alarmOn = false;
      }, 900);
    },
  };
}
