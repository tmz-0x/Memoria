import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScanResult: (decodedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanResult }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = 'html5-qrcode-reader';

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScanResult(decodedText);
          stopScanner();
        },
        () => {} // frame scan failure ignored
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError('Camera access not permitted or unavailable on this device.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setIsScanning(false);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-lg flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-blue-400" />
          Optical Gate Camera
        </span>
        {isScanning && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold animate-pulse">
            ● Active Scanner
          </span>
        )}
      </div>

      {/* Camera Video Target Container */}
      <div
        id={readerId}
        className="w-full max-w-sm aspect-square bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 flex items-center justify-center relative"
      >
        {!isScanning && (
          <div className="text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400">
              Point physical ticket QR code in front of camera to verify.
            </p>
            <button
              type="button"
              onClick={startScanner}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Start Camera
            </button>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{cameraError} (Use the Manual Entry below)</span>
        </div>
      )}

      {isScanning && (
        <button
          type="button"
          onClick={stopScanner}
          className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
        >
          <CameraOff className="w-4 h-4" />
          <span>Pause Camera</span>
        </button>
      )}
    </div>
  );
};
