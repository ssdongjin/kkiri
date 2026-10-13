const assert = require("node:assert/strict");
const esbuild = require("esbuild");

async function check() {
  const build = await esbuild.build({ entryPoints: ["src/lib/geolocation.ts"], bundle: true, platform: "node", format: "cjs", write: false });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", build.outputFiles[0].text)(require, loaded, loaded.exports);
  const { requestDeviceLocation, readLocationPermission } = loaded.exports;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const setNavigator = (value) => Object.defineProperty(globalThis, "navigator", { configurable: true, value });
  const setSecure = (value) => Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: value } });
  const point = { coords: { latitude: 37.481223, longitude: 126.9527151, accuracy: 25 }, timestamp: 1000 };
  const failure = (code) => (error) => error.code === code;

  try {
    setSecure(true);
    let options;
    setNavigator({ geolocation: { getCurrentPosition: (success, error, value) => { options = value; success(point); } }, permissions: { query: async () => ({ state: "granted" }) } });
    const current = await requestDeviceLocation();
    assert.equal(current.latitude, point.coords.latitude);
    assert.equal(current.longitude, point.coords.longitude);
    assert.equal(current.accuracy, 25);
    assert.equal(options.maximumAge, 0, "Request a fresh location, not the previous cached position");
    assert.equal(options.enableHighAccuracy, true);
    assert.equal(await readLocationPermission(), "granted");
    await requestDeviceLocation({ highAccuracy: false });
    assert.equal(options.enableHighAccuracy, false, "Allow a lower-accuracy retry when GPS is unavailable");

    for (const [nativeCode, expected] of [[1, "permission-denied"], [2, "unavailable"], [3, "timeout"]]) {
      setNavigator({ geolocation: { getCurrentPosition: (success, error) => error({ code: nativeCode }) } });
      await assert.rejects(requestDeviceLocation(), failure(expected));
    }
    setNavigator({});
    await assert.rejects(requestDeviceLocation(), failure("unsupported"));
    assert.equal(await readLocationPermission(), "unsupported");
    setSecure(false);
    await assert.rejects(requestDeviceLocation(), failure("insecure"));
    setSecure(true);

    setNavigator({ geolocation: { getCurrentPosition: (success) => success({ ...point, coords: { ...point.coords, latitude: NaN } }) } });
    await assert.rejects(requestDeviceLocation(), failure("unavailable"));

    let requested = false, lateSuccess;
    setNavigator({ geolocation: { getCurrentPosition: (success) => { requested = true; lateSuccess = success; } } });
    const alreadyCancelled = new AbortController(); alreadyCancelled.abort();
    await assert.rejects(requestDeviceLocation({ signal: alreadyCancelled.signal }), failure("cancelled"));
    assert.equal(requested, false, "A cancelled request must never request device location");
    const controller = new AbortController();
    const pending = requestDeviceLocation({ signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, failure("cancelled"));
    lateSuccess(point); // Late callbacks cannot restore a cancelled lookup.

    setNavigator({ geolocation: { getCurrentPosition: () => {} } });
    await assert.rejects(requestDeviceLocation({ timeoutMs: 1 }), failure("timeout"));
    console.log("Location checks passed: fresh coordinates, permission denial, unavailable GPS, timeout, retry, unsupported browser, HTTPS, cancellation.");
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator); else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else delete globalThis.window;
  }
}
check().catch((error) => { console.error(error); process.exitCode = 1; });
