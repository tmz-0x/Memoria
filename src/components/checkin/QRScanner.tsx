import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, RefreshCw, Video, ShieldAlert } from 'lucide-react';

interface QRScannerProps {
  onScanResult: (decodedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanResult }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = 'html5-qrcode-reader';
  const isComponentMounted = useRef(true);

  // Map browser camera error objects into intuitive, actionable user feedback
  const mapCameraError = (err: any): string => {
    const errName = err?.name || '';
    const errMsg = String(err?.message || err || '').toLowerCase();

    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.includes('permission denied')) {
      setPermissionState('denied');
      return 'Camera permission was denied. Please allow camera access in your browser address bar/settings and click retry.';
    }
    if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errMsg.includes('not found') || errMsg.includes('no camera')) {
      return 'No camera hardware detected on this device. Use manual verification entry below.';
    }
    if (errName === 'NotReadableError' || errName === 'TrackStartError' || errMsg.includes('in use') || errMsg.includes('could not start')) {
      return 'The camera is currently being used by another application or tab. Please close other camera apps and retry.';
    }
    if (errName === 'OverconstrainedError' || errMsg.includes('overconstrained')) {
      return 'Requested video constraints are not supported by your camera hardware. Attempting fallback mode...';
    }
    if (errName === 'SecurityError' || errMsg.includes('secure context') || errMsg.includes('https')) {
      return 'Camera access requires a secure HTTPS connection. Please open the secure HTTPS version of this portal.';
    }
    if (errName === 'AbortError') {
      return 'Camera initialization was aborted. Please try starting the scanner again.';
    }
    return err?.message || 'Unable to initialize optical camera. Please verify device permissions.';
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.warn('Error during scanner stop:', e);
      }
    }
    if (isComponentMounted.current) {
      setIsScanning(false);
    }
  }, []);

  const startScannerWithDeviceId = useCallback(
    async (deviceId?: string) => {
      setCameraError(null);
      setIsInitializing(true);

      // Verify Secure Context (HTTPS or localhost)
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        setIsInsecureContext(true);
        setCameraError('Camera access requires a secure HTTPS connection. Please open this application over HTTPS or use manual entry.');
        setIsInitializing(false);
        return;
      }

      // Check mediaDevices API availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('MediaDevices camera API is not supported by your browser. Please upgrade your browser.');
        setIsInitializing(false);
        return;
      }

      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(readerId, { verbose: false });
        } else if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }

        // Camera config & constraints
        const cameraConfig = deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'environment' };

        const qrConfig = {
          fps: 12,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scannerRef.current.start(
          cameraConfig,
          qrConfig,
          (decodedText: string) => {
            onScanResult(decodedText);
            stopScanner();
          },
          () => {} // Frame-level decode failure is ignored during scanning
        );

        if (isComponentMounted.current) {
          setIsScanning(true);
          setPermissionState('granted');
          setCameraError(null);
        }
      } catch (err: any) {
        console.error('Camera startup failure:', err);
        // Fallback: If environment camera failed due to OverconstrainedError on desktop webcams, try default user-facing / first available
        if (err?.name === 'OverconstrainedError' && !deviceId && cameras.length > 0) {
          try {
            await scannerRef.current?.start(
              cameras[0].id,
              { fps: 10, qrbox: { width: 250, height: 250 } },
              (decodedText: string) => {
                onScanResult(decodedText);
                stopScanner();
              },
              () => {}
            );
            if (isComponentMounted.current) {
              setIsScanning(true);
              setPermissionState('granted');
              setSelectedCameraId(cameras[0].id);
              setCameraError(null);
              setIsInitializing(false);
              return;
            }
          } catch (fallbackErr: any) {
            setCameraError(mapCameraError(fallbackErr));
          }
        } else {
          setCameraError(mapCameraError(err));
        }
        if (isComponentMounted.current) {
          setIsScanning(false);
        }
      } finally {
        if (isComponentMounted.current) {
          setIsInitializing(false);
        }
      }
    },
    [cameras, onScanResult, stopScanner]
  );

  // Discover available camera devices on mount
  useEffect(() => {
    isComponentMounted.current = true;

    // Check secure context
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      setIsInsecureContext(true);
      setCameraError('Camera access requires a secure HTTPS connection. Please use manual entry or switch to HTTPS.');
    }

    // Enumerate cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isComponentMounted.current) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/rear camera if available on mobile devices
          const rearCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedCameraId(rearCam ? rearCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        // Will prompt when user clicks "Start Camera"
        console.log('Initial camera enumeration awaiting permission:', err?.message);
      });

    return () => {
      isComponentMounted.current = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            try {
              scannerRef.current?.clear();
            } catch {}
          });
        } else {
          try {
            scannerRef.current.clear();
          } catch {}
        }
      }
    };
  }, []);

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    if (isScanning) {
      await startScannerWithDeviceId(newId);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-lg flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-blue-400" />
          Optical Gate Camera
        </span>
        {isScanning ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Active Scanner
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">
            {permissionState === 'granted' ? 'Permission Granted' : 'Standby'}
          </span>
        )}
      </div>

      {/* Multiple Camera Device Selector */}
      {cameras.length > 1 && (
        <div className="w-full max-w-sm mb-3 flex items-center gap-2">
          <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedCameraId}
            onChange={handleCameraChange}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {cameras.map((c, i) => (
              <option key={c.id} value={c.id}>
                {c.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Camera Video Target Container */}
      <div
        id={readerId}
        className="w-full max-w-sm aspect-square bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 flex items-center justify-center relative shadow-inner"
      >
        {!isScanning && (
          <div className="text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 max-w-[220px] mx-auto">
              Hold physical attendee QR code inside view frame to automatically verify.
            </p>
            <button
              type="button"
              disabled={isInitializing || isInsecureContext}
              onClick={() => startScannerWithDeviceId(selectedCameraId)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isInitializing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Starting Camera...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      {cameraError && (
        <div className="w-full max-w-sm mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <p>{cameraError}</p>
            {permissionState === 'denied' && (
              <button
                type="button"
                onClick={() => startScannerWithDeviceId(selectedCameraId)}
                className="text-[11px] underline text-rose-200 hover:text-white"
              >
                Retry Camera Permission
              </button>
            )}
          </div>
        </div>
      )}

      {/* Insecure Context Warning */}
      {isInsecureContext && (
        <div className="w-full max-w-sm mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Insecure HTTP detected. Browsers restrict optical camera access on non-HTTPS origins.</span>
        </div>
      )}

      {/* Scanner Controls */}
      {isScanning && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={stopScanner}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CameraOff className="w-4 h-4 text-slate-400" />
            <span>Pause Camera</span>
          </button>
        </div>
      )}
    </div>
  );
};
