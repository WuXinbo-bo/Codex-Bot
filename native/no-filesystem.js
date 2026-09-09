// Shared state machines run in memory; all persistence goes through scoped Rust IPC.
export const StringDecoder = class {
  write() {
    throw new Error("Use native log reads");
  }
};
export default {};
