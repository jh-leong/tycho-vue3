let p = Promise.resolve();
export function nextTick(fn?: () => void) {
  return fn ? p.then(fn) : p;
}

const queue: (undefined | (() => void))[] = [];

export function queueJobs(job: () => void) {
  if (queue.includes(job)) return;
  queue.push(job);
  queueFlush();
}

let isFlushPending = false;
function queueFlush() {
  if (isFlushPending) return;
  isFlushPending = true;
  nextTick(flushJobs);
}

function flushJobs() {
  let job: typeof queue[number];
  while ((job = queue.shift())) job();
  isFlushPending = false;
}
