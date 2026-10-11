import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

const storageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

const ls = storageMock();
const ss = storageMock();
Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true, writable: true });
Object.defineProperty(window, "localStorage", { value: ls, configurable: true, writable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: ss, configurable: true, writable: true });
Object.defineProperty(window, "sessionStorage", { value: ss, configurable: true, writable: true });
