export type LocationFailure = "permission-denied" | "unavailable" | "timeout" | "unsupported" | "insecure" | "cancelled";

export class LocationRequestError extends Error {
  constructor(public readonly code: LocationFailure, message: string) { super(message); this.name = "LocationRequestError"; }
}

export interface DeviceLocation { latitude: number; longitude: number; accuracy?: number; capturedAt: number; }
export interface LocationRequestOptions { signal?: AbortSignal; highAccuracy?: boolean; timeoutMs?: number; }

export async function readLocationPermission(): Promise<PermissionState | "unsupported"> {
  try { return (await navigator.permissions.query({ name: "geolocation" })).state; }
  catch { return "unsupported"; }
}

export function requestDeviceLocation({ signal, highAccuracy = true, timeoutMs = 15000 }: LocationRequestOptions = {}): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    const cancelled = () => new LocationRequestError("cancelled", "위치 불러오기를 취소했어요.");
    if (signal?.aborted) { reject(cancelled()); return; }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      reject(new LocationRequestError("insecure", "위치를 불러오려면 HTTPS 실행 링크에서 앱을 열어 주세요.")); return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new LocationRequestError("unsupported", "이 브라우저는 위치 불러오기를 지원하지 않아요. Chrome이나 Safari에서 열거나 동네 이름으로 검색해 주세요.")); return;
    }

    let settled = false;
    const finish = (value?: DeviceLocation, error?: LocationRequestError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error); else resolve(value!);
    };
    const onAbort = () => finish(undefined, cancelled());
    // The browser may leave its permission prompt open; also bound waiting on our side.
    const timer = setTimeout(() => finish(undefined, new LocationRequestError("timeout", "위치 확인에 시간이 오래 걸려요. 위치 허용 창과 기기의 위치 서비스를 확인해 주세요.")), timeoutMs + 1000);
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          finish(undefined, new LocationRequestError("unavailable", "기기에서 유효한 위치를 받지 못했어요. 다시 시도하거나 동네 이름으로 검색해 주세요.")); return;
        }
        finish({ latitude, longitude, accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : undefined, capturedAt: position.timestamp || Date.now() });
      }, (error) => {
        const failures: Record<number, [LocationFailure, string]> = {
          1: ["permission-denied", "위치 권한이 차단되어 있어요. 아래 안내에 따라 위치를 허용한 뒤 다시 불러와 주세요."],
          2: ["unavailable", "기기에서 현재 위치를 찾지 못했어요. 위치 서비스를 켜거나 대략적인 위치로 다시 시도해 주세요."],
          3: ["timeout", "위치 확인에 시간이 오래 걸려요. 다시 시도하거나 대략적인 위치로 찾아보세요."],
        };
        const [code, message] = failures[error.code] || failures[2];
        finish(undefined, new LocationRequestError(code, message));
      }, { enableHighAccuracy: highAccuracy, maximumAge: 0, timeout: timeoutMs });
    } catch { finish(undefined, new LocationRequestError("unavailable", "위치 불러오기를 시작하지 못했어요. 브라우저와 기기의 위치 설정을 확인해 주세요.")); }
  });
}
