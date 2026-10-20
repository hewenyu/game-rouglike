import type { Vec } from "./math";
export class Input {
  keys = new Set<string>();
  joy: Vec = { x: 0, y: 0 };
  pointer: number | null = null;
  origin: Vec = { x: 0, y: 0 };
  constructor(
    private pad: HTMLElement,
    private active: () => boolean,
    private gesture: () => void,
    private pause: () => void,
  ) {
    window.addEventListener("keydown", (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        ) &&
        active()
      )
        e.preventDefault();
      if (e.repeat) return;
      if (e.code === "Escape" || e.code === "KeyP") {
        pause();
        return;
      }
      if (active()) {
        this.keys.add(e.code);
        gesture();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    pad.addEventListener("pointerdown", (e) => {
      if (!active() || this.pointer !== null) return;
      e.preventDefault();
      this.pointer = e.pointerId;
      this.origin = { x: e.clientX, y: e.clientY };
      pad.setPointerCapture(e.pointerId);
      gesture();
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.pointer) return;
      const dx = e.clientX - this.origin.x,
        dy = e.clientY - this.origin.y,
        l = Math.hypot(dx, dy) || 1;
      this.joy = {
        x: (dx / l) * Math.min(1, l / 40),
        y: (dy / l) * Math.min(1, l / 40),
      };
      pad.style.setProperty("--jx", `${this.joy.x * 40}px`);
      pad.style.setProperty("--jy", `${this.joy.y * 40}px`);
    });
    window.addEventListener("pointerup", (e) => {
      if (e.pointerId === this.pointer) this.clear();
    });
    window.addEventListener("pointercancel", () => {
      this.clear();
      pause();
    });
    window.addEventListener("blur", () => this.clear());
  }
  clear() {
    this.keys.clear();
    this.pointer = null;
    this.joy = { x: 0, y: 0 };
    this.pad.style.setProperty("--jx", "0px");
    this.pad.style.setProperty("--jy", "0px");
  }
  read(): Vec {
    return {
      x:
        Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
        Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")) +
        this.joy.x,
      y:
        Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) -
        Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) +
        this.joy.y,
    };
  }
}
