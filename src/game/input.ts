export interface InputSnapshot {
  moveX: -1 | 0 | 1;
  upHeld: boolean;
  downHeld: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  attackPressed: boolean;
  attackHeld: boolean;
  attackReleased: boolean;
  dashPressed: boolean;
  healPressed: boolean;
  pausePressed: boolean;
  mapPressed: boolean;
  floatPressed: boolean;
  interactPressed: boolean;
  inventoryPressed: boolean;
  specialAttackPressed: boolean;
  cycleStylePressed: boolean;
  selectStyleIndex: number | null;
  comboStyleKeyIndex: number | null;
  walkHeld: boolean;
}

export type VirtualAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'attack'
  | 'special'
  | 'dash'
  | 'heal'
  | 'interact';

export class InputHandler {
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();
  private virtualHeld = new Set<VirtualAction>();
  private prevVirtualHeld = new Set<VirtualAction>();
  private targetEl: HTMLElement | Window | null = null;

  public setVirtualAction(action: VirtualAction, active: boolean): void {
    if (active) {
      this.virtualHeld.add(action);
    } else {
      this.virtualHeld.delete(action);
    }
  }

  private resolveKeyCode(e: KeyboardEvent): string {
    if (e.code) return e.code;
    const k = e.key.toLowerCase();
    const map: Record<string, string> = {
      w: 'KeyW',
      a: 'KeyA',
      s: 'KeyS',
      d: 'KeyD',
      j: 'KeyJ',
      x: 'KeyX',
      v: 'KeyV',
      u: 'KeyU',
      k: 'KeyK',
      c: 'KeyC',
      l: 'KeyL',
      z: 'KeyZ',
      f: 'KeyF',
      h: 'KeyH',
      q: 'KeyQ',
      r: 'KeyR',
      g: 'KeyG',
      b: 'KeyB',
      y: 'KeyY',
      n: 'KeyN',
      e: 'KeyE',
      t: 'KeyT',
      m: 'KeyM',
      i: 'KeyI',
      p: 'KeyP',
      '1': 'Digit1',
      '2': 'Digit2',
      '3': 'Digit3',
      '4': 'Digit4',
      '5': 'Digit5',
      '6': 'Digit6',
      '7': 'Digit7',
      ' ': 'Space',
      arrowup: 'ArrowUp',
      arrowdown: 'ArrowDown',
      arrowleft: 'ArrowLeft',
      arrowright: 'ArrowRight',
      enter: 'Enter',
      escape: 'Escape',
      tab: 'Tab',
      shift: 'ShiftLeft',
    };
    return map[k] ?? e.key;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = this.resolveKeyCode(e);
    if (
      code === 'Space' ||
      code === 'Tab' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }
    if (!this.held.has(code)) {
      this.justPressed.add(code);
    }
    this.held.add(code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const code = this.resolveKeyCode(e);
    if (this.held.has(code)) {
      this.justReleased.add(code);
    }
    this.held.delete(code);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.justPressed.add('MouseLeft');
      this.held.add('MouseLeft');
    } else if (e.button === 2) {
      this.justPressed.add('MouseRight');
      this.held.add('MouseRight');
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.held.delete('MouseLeft');
      this.justReleased.add('MouseLeft');
    } else if (e.button === 2) {
      this.held.delete('MouseRight');
      this.justReleased.add('MouseRight');
    }
  };

  private onBlur = () => {
    this.held.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    this.virtualHeld.clear();
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.onBlur();
    }
  };

  public attach(canvasEl: HTMLCanvasElement): void {
    this.targetEl = canvasEl;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    canvasEl.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.targetEl && this.targetEl instanceof HTMLCanvasElement) {
      this.targetEl.removeEventListener('mousedown', this.onMouseDown);
    }
    window.removeEventListener('mouseup', this.onMouseUp);
    this.onBlur();
  }

  private anyHeld(codes: string[]): boolean {
    for (const c of codes) {
      if (this.held.has(c)) return true;
    }
    return false;
  }

  private anyPressed(codes: string[]): boolean {
    for (const c of codes) {
      if (this.justPressed.has(c)) return true;
    }
    return false;
  }

  private anyReleased(codes: string[]): boolean {
    for (const c of codes) {
      if (this.justReleased.has(c)) return true;
    }
    return false;
  }

  private vPressed(action: VirtualAction): boolean {
    return this.virtualHeld.has(action) && !this.prevVirtualHeld.has(action);
  }

  private vReleased(action: VirtualAction): boolean {
    return !this.virtualHeld.has(action) && this.prevVirtualHeld.has(action);
  }

  public consumeFrame(): InputSnapshot {
    const left = this.anyHeld(['KeyA', 'ArrowLeft']) || this.virtualHeld.has('left');
    const right = this.anyHeld(['KeyD', 'ArrowRight']) || this.virtualHeld.has('right');
    const moveX: -1 | 0 | 1 = left && !right ? -1 : right && !left ? 1 : 0;

    const attackCodes = ['KeyJ', 'KeyX', 'MouseLeft'];
    const specialCodes = ['KeyV', 'MouseRight'];
    const dashCodes = ['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyC', 'KeyL'];
    const healCodes = ['KeyF', 'KeyH'];

    let selectStyleIndex: number | null = null;
    for (let i = 0; i < 7; i++) {
      if (this.justPressed.has(`Digit${i + 1}`)) {
        selectStyleIndex = i;
        break;
      }
    }

    const comboLetterCodes = ['KeyQ', 'KeyR', 'KeyG', 'KeyB', 'KeyY', 'KeyU', 'KeyN'];
    let comboStyleKeyIndex: number | null = null;
    for (let i = 0; i < comboLetterCodes.length; i++) {
      if (this.justPressed.has(comboLetterCodes[i])) {
        comboStyleKeyIndex = i;
        break;
      }
    }

    const snapshot: InputSnapshot = {
      moveX,
      upHeld: this.anyHeld(['KeyW', 'ArrowUp']) || this.virtualHeld.has('up'),
      downHeld: this.anyHeld(['KeyS', 'ArrowDown']) || this.virtualHeld.has('down'),
      jumpHeld: this.anyHeld(['Space', 'KeyZ']) || this.virtualHeld.has('jump'),
      jumpPressed: this.anyPressed(['Space', 'KeyZ']) || this.vPressed('jump'),
      jumpReleased: this.anyReleased(['Space', 'KeyZ']) || this.vReleased('jump'),
      attackPressed: this.anyPressed(attackCodes) || this.vPressed('attack'),
      attackHeld: this.anyHeld(attackCodes) || this.virtualHeld.has('attack'),
      attackReleased: this.anyReleased(attackCodes) || this.vReleased('attack'),
      dashPressed: this.anyPressed(dashCodes) || this.vPressed('dash'),
      healPressed: this.anyPressed(healCodes) || this.vPressed('heal'),
      pausePressed: this.anyPressed(['Escape', 'KeyP']),
      mapPressed: this.anyPressed(['KeyM', 'Tab']),
      floatPressed: false,
      interactPressed: this.anyPressed(['KeyE', 'Enter']) || this.vPressed('interact'),
      inventoryPressed: this.anyPressed(['KeyI']),
      specialAttackPressed: this.anyPressed(specialCodes) || this.vPressed('special'),
      cycleStylePressed: this.anyPressed(['KeyT']),
      selectStyleIndex,
      comboStyleKeyIndex,
      walkHeld: this.anyHeld(['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']),
    };

    this.justPressed.clear();
    this.justReleased.clear();
    this.prevVirtualHeld = new Set(this.virtualHeld);
    return snapshot;
  }
}
