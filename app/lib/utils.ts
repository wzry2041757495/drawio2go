export type DebouncedFunction<Args extends unknown[]> = ((
  ...args: Args
) => void) & {
  flush: () => void;
  cancel: () => void;
};

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait = 300,
): DebouncedFunction<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const debounced = (...args: Args) => {
    lastArgs = args;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) {
        fn(...lastArgs);
      }
    }, wait);
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  return debounced as DebouncedFunction<Args>;
}
