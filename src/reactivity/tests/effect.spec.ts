import { effect } from '../effect';
import { reactive } from '../reactive';

describe('effect', () => {
  it('happy path', () => {
    const tycho = reactive({
      power: 99,
    });

    let tychoPlus;
    effect(() => {
      tychoPlus = tycho.power + 1;
    });

    expect(tychoPlus).toBe(100);

    // update
    tycho.power++;
    expect(tychoPlus).toBe(101);
  });
});
