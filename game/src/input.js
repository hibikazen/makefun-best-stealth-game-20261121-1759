// Keyboard input for Shadow Line. WASD or arrows move, Shift runs (loud),
// C or Control crouches (slow and quiet), P pauses, R restarts, Enter starts.

export function createInput() {
  const held = new Set();
  const pressed = new Set();

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
  });

  function axis(negatives, positives) {
    let value = 0;
    for (const code of negatives) if (held.has(code)) value -= 1;
    for (const code of positives) if (held.has(code)) value += 1;
    return value;
  }

  return {
    moveVector() {
      const x = axis(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']);
      const y = axis(['ArrowUp', 'KeyW'], ['ArrowDown', 'KeyS']);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    crouching() {
      return held.has('KeyC') || held.has('ControlLeft') || held.has('ControlRight');
    },
    // True once for the frame the key went down; the game loop drains it.
    wasPressed(code) {
      return pressed.has(code);
    },
    endFrame() {
      pressed.clear();
    },
  };
}
