// @ts-nocheck
import * as bufferModule from "buffer";
import * as cryptoModule from "crypto-browserify";

Object.defineProperty(globalThis, "__MzPlayerBufferModule", {
  configurable: false,
  value: Object.freeze(bufferModule),
  writable: false,
});

Object.defineProperty(globalThis, "__MzPlayerCryptoModule", {
  configurable: false,
  value: Object.freeze(cryptoModule),
  writable: false,
});
