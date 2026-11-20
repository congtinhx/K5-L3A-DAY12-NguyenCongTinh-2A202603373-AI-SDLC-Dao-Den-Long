import type { InputFrame, InputState } from './types.ts';
import { emptyInput } from './sim.ts';

/** Áp các frame theo đúng contract: frame có tick == k đổi các trường có mặt; trường vắng giữ nguyên. */
export class InputTimeline {
  private i = 0;
  readonly state: InputState = emptyInput();
  private readonly frames: InputFrame[];
  constructor(frames: InputFrame[]) { this.frames = frames; }
  at(k: number): InputState {
    while (this.i < this.frames.length && this.frames[this.i].tick <= k) {
      const f = this.frames[this.i++];
      if (f.move) this.state.move = [f.move[0], f.move[1]];
      if (f.cam_yaw_deg !== undefined) this.state.cam_yaw_deg = f.cam_yaw_deg;
      if (f.jump !== undefined) this.state.jump = f.jump;
      if (f.interact !== undefined) this.state.interact = f.interact;
      if (f.pulse !== undefined) this.state.pulse = f.pulse;
      if (f.dash !== undefined) this.state.dash = f.dash;
      if (f.pause !== undefined) this.state.pause = f.pause;
    }
    return this.state;
  }
}
