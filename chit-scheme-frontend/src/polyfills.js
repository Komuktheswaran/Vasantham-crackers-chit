// Polyfills for Vite support (replacing react-scripts polyfills)
import { Buffer } from "buffer";

window.global = window;
window.process = window.process || {};
window.process.env = window.process.env || {};
window.Buffer = Buffer;
