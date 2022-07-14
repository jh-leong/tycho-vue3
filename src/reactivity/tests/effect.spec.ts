import { effect, stop } from '../effect';
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

    tycho.power++;
    expect(tychoPlus).toBe(101);
  });

  it('should return a runner when call effect', () => {
    let foo = 0;
    const runner = effect(() => {
      foo++;
      return 'foo';
    });

    expect(foo).toBe(1);
    const res = runner();
    expect(foo).toBe(2);
    expect(res).toBe('foo');
  });

  it('scheduler', () => {
    let dummy;
    let run: any;

    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );

    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // should not run yet
    expect(dummy).toBe(1);
    // manually run
    run();
    // should have run
    expect(dummy).toBe(2);
  });

  it('stop', () => {
    let dummy;
    const obj = reactive({ prop: 1 });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    obj.prop = 2;
    expect(dummy).toBe(2);
    stop(runner);

    obj.prop++;
    // obj.prop = 3;
    expect(dummy).toBe(2);

    // stopped effect should still be manually callable
    runner();
    expect(dummy).toBe(3);
  });

  it('onStop', () => {
    const obj = reactive({ foo: 1 });
    const onStop = jest.fn();

    let dummy;
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { onStop }
    );

    stop(runner);
    expect(onStop).toBeCalledTimes(1);
  });
});
