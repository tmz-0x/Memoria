import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, RefreshCw, Video, ShieldAlert, Upload, Image as ImageIcon } from 'lucide-react';

interface QRScannerProps {
  onScanResult: (decodedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanResult }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [fileScanning, setFileScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerId = 'html5-qrcode-reader';
  const isComponentMounted = useRef(true);
  const hasScanned = useRef(false);

  // Map browser camera error objects into intuitive, actionable user feedback
  const mapCameraError = (err: any): string => {
    const errName = err?.name || '';
    const errMsg = String(err?.message || err || '').toLowerCase();

    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.includes('permission denied')) {
      setPermissionState('denied');
      return 'Camera permission was denied. Please allow camera access in your browser address bar/settings and click retry.';
    }
    if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errMsg.includes('not found') || errMsg.includes('no camera')) {
      return 'No camera hardware detected on this device. Use manual verification entry or snap a photo below.';
    }
    if (errName === 'NotReadableError' || errName === 'TrackStartError' || errMsg.includes('in use') || errMsg.includes('could not start')) {
      return 'The camera is currently in use by another application. Please close other camera tabs/apps and retry.';
    }
    if (errName === 'OverconstrainedError' || errMsg.includes('overconstrained')) {
      return 'Requested video constraints are not supported by your camera hardware. Attempting fallback mode...';
    }
    if (errName === 'SecurityError' || errMsg.includes('secure context') || errMsg.includes('https')) {
      return 'Camera streaming requires HTTPS or localhost. If on a local network, please use the Snap Photo / Upload option below.';
    }
    if (errName === 'AbortError') {
      return 'Camera initialization was interrupted. Please click Start Camera again.';
    }
    return err?.message || 'Unable to open camera. Please check browser permissions or snap a photo of the QR code below.';
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
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }

    const container = document.getElementById(readerId);
    if (container) {
      container.innerHTML = '';
    }

    if (isComponentMounted.current) {
      setIsScanning(false);
    }
  }, []);

  const startScanner = useCallback(
    async (explicitDeviceId?: string) => {
      setCameraError(null);
      setIsInitializing(true);
      hasScanned.current = false;

      // Clean up any existing scanner instance completely
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch {}
        try {
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }

      // Ensure the container element is completely empty before Html5Qrcode mounts
      const container = document.getElementById(readerId);
      if (container) {
        container.innerHTML = '';
      }

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.floor(minEdge * 0.75));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      const handleScanSuccess = (decodedText: string) => {
        if (hasScanned.current) return;
        hasScanned.current = true;
        stopScanner();
        onScanResult(decodedText);
      };

      // Helper to attempt starting with a given camera constraint
      const tryConstraint = async (constraint: any): Promise<boolean> => {
        try {
          // Verify container exists in DOM
          const target = document.getElementById(readerId);
          if (!target) return false;
          target.innerHTML = '';

          const scanner = new Html5Qrcode(readerId, { verbose: false });
          await scanner.start(constraint, qrConfig, handleScanSuccess, () => {});

          if (isComponentMounted.current) {
            scannerRef.current = scanner;
            setIsScanning(true);
            setPermissionState('granted');
            setCameraError(null);
            return true;
          } else {
            try {
              scanner.stop().catch(() => {});
            } catch {}
            return false;
          }
        } catch (err: any) {
          console.warn('Camera constraint attempt failed:', constraint, err?.message || err);
          return false;
        }
      };

      try {
        let started = false;

        // Attempt 1: Explicit user-selected device ID
        if (explicitDeviceId) {
          started = await tryConstraint(explicitDeviceId);
        }

        // Attempt 2: Rear / environment camera (ideal for smartphones scanning tickets)
        if (!started) {
          started = await tryConstraint({ facingMode: 'environment' });
        }

        // Attempt 3: User / front camera (laptops, webcams)
        if (!started) {
          started = await tryConstraint({ facingMode: 'user' });
        }

        // Attempt 4: Enumerate device IDs and try first available device
        if (!started) {
          try {
            const available = await Html5Qrcode.getCameras();
            if (available && available.length > 0) {
              if (isComponentMounted.current) {
                setCameras(available);
              }
              started = await tryConstraint(available[0].id);
              if (started && isComponentMounted.current) {
                setSelectedCameraId(available[0].id);
              }
            }
          } catch (enumErr) {
            console.warn('Enumerating cameras failed:', enumErr);
          }
        }

        // Attempt 5: Simple boolean video constraint
        if (!started) {
          started = await tryConstraint({ video: true });
        }

        if (!started) {
          throw new Error(
            'Unable to access camera feed. If prompted, please allow camera permission in your browser, or use the "Snap Photo / Upload" button below.'
          );
        }

        // Refresh camera dropdown devices once permission is granted
        try {
          const freshCameras = await Html5Qrcode.getCameras();
          if (isComponentMounted.current && freshCameras.length > 0) {
            setCameras(freshCameras);
            if (!selectedCameraId) {
              const rear = freshCameras.find((d) => /back|rear|environment/i.test(d.label));
              setSelectedCameraId(rear ? rear.id : freshCameras[0].id);
            }
          }
        } catch {}
      } catch (err: any) {
        console.error('All camera startup attempts failed:', err);
        if (isComponentMounted.current) {
          setCameraError(mapCameraError(err));
          setIsScanning(false);
        }
      } finally {
        if (isComponentMounted.current) {
          setIsInitializing(false);
        }
      }
    },
    [onScanResult, stopScanner, selectedCameraId]
  );

  // Auto-start camera on initial mount so gate staff doesn't need to manually click
  useEffect(() => {
    isComponentMounted.current = true;

    // Discover camera devices
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isComponentMounted.current) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const rearCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedCameraId(rearCam ? rearCam.id : devices[0].id);
        }
      })
      .catch(() => {});

    // Trigger auto-start with a short tick to ensure DOM is fully ready
    const timer = setTimeout(() => {
      if (isComponentMounted.current && !isScanning && !scannerRef.current) {
        startScanner();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      isComponentMounted.current = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {}
        try {
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    await startScanner(newId);
  };

  // Handle Photo / File QR decode fallback
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanning(true);
    setCameraError(null);

    try {
      // Create a dedicated scanner instance for file decoding
      const fileScanner = new Html5Qrcode('html5-qrcode-file-temp', { verbose: false });
      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      onScanResult(decodedText);
    } catch (err: any) {
      console.warn('File QR scan failed:', err);
      setCameraError('Could not detect a valid QR code in the selected photo. Please ensure the QR code is clearly visible and well-lit.');
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-lg flex flex-col items-center">
      {/* Hidden container for file-based decoding */}
      <div id="html5-qrcode-file-temp" className="hidden" />

      {/* Hidden file input for native camera snap / gallery upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

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
            {permissionState === 'granted' ? 'Camera Ready' : 'Standby'}
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

      {/* 
        Camera Video Target Container.
        CRITICAL: The div with id={readerId} MUST NEVER have React children.
        Html5Qrcode inserts video elements directly into it.
        All React UI overlays are rendered as absolute-positioned siblings.
      */}
      <div className="relative w-full max-w-sm aspect-square bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 flex items-center justify-center shadow-inner">
        {/* Isolated DOM node for Html5Qrcode video stream */}
        <div
          id={readerId}
          className="w-full h-full [&_video]:w-full! [&_video]:h-full! [&_video]:object-cover! [&_video]:rounded-lg! [&_img]:hidden!"
        />

        {/* Standby / Permission Overlay (Shown when camera is not running) */}
        {!isScanning && !isInitializing && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 max-w-[220px] mx-auto">
              Hold physical attendee QR code inside view frame to automatically verify.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button
                type="button"
                onClick={() => startScanner(selectedCameraId)}
                className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileScanning}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Snap / Upload Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* Initializing / Loading Spinner Overlay */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-xs text-slate-300 font-medium">Opening optical camera...</p>
            <span className="text-[11px] text-slate-500">Please grant camera permission if prompted</span>
          </div>
        )}

        {/* File scanning loading overlay */}
        {fileScanning && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-300 font-medium">Decoding ticket QR photo...</p>
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      {cameraError && (
        <div className="w-full max-w-sm mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1.5 flex-1">
            <p className="leading-relaxed">{cameraError}</p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => startScanner(selectedCameraId)}
                className="text-[11px] font-semibold text-rose-200 hover:text-white underline"
              >
                Retry Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-blue-300 hover:text-white underline inline-flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Snap Photo Instead</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Active Controls */}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Snap a photo using native phone camera"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Photo Fallback</span>
          </button>
        </div>
      )}
    </div>
  );
};
