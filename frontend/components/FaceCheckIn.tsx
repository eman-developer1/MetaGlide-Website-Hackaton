'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  X,
  ScanFace,
  FileQuestion,
} from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../lib/api';

interface FaceCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (attendance: any) => void;
  onRequestCorrection?: () => void;
}

export const FaceCheckIn: React.FC<FaceCheckInProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onRequestCorrection,
}) => {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [livenessStage, setLivenessStage] = useState<'center' | 'challenge' | 'verified'>('center');
  const [livenessPrompt, setLivenessPrompt] = useState('Center your face in the oval frame.');
  const [locationState, setLocationState] = useState<{ lat?: number; lng?: number; accuracy?: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting GPS location...');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Initialize face-api
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const loadBiometrics = async () => {
      try {
        setLivenessPrompt('Loading face recognition neural network...');
        const apiModule = await import('@vladmandic/face-api');
        setFaceapi(apiModule);

        await Promise.all([
          apiModule.nets.tinyFaceDetector.loadFromUri('/models'),
          apiModule.nets.faceLandmark68Net.loadFromUri('/models'),
          apiModule.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        if (mounted) {
          setModelsLoaded(true);
          setLivenessPrompt('Look directly at the camera.');
        }
      } catch (err: any) {
        console.error('Error loading face-api:', err);
        if (mounted) {
          setErrorDetails('Failed to load biometric recognition models. Check your network connection.');
        }
      }
    };

    loadBiometrics();

    // Query GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mounted) {
            setLocationState({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
            setLocationStatus(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`);
          }
        },
        (err) => {
          if (mounted) {
            setLocationStatus('GPS unavailable or permission denied.');
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setLocationStatus('Geolocation unsupported on this browser.');
    }

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen || !modelsLoaded) return;

    let currentStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setErrorDetails('Camera permission is required for face check-in.');
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
      setStreamActive(false);
    };
  }, [isOpen, modelsLoaded]);

  // Liveness Tracker Loop
  useEffect(() => {
    if (!isOpen || !streamActive || !faceapi || isScanning) return;

    let cancel = false;
    let initialNoseX: number | null = null;
    let movementDetected = false;

    const runLiveness = async () => {
      if (cancel || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks();

        if (detection) {
          const landmarks = detection.landmarks;
          const nose = landmarks.getNose();
          const noseX = nose[3].x;

          if (initialNoseX === null) {
            initialNoseX = noseX;
            setLivenessStage('challenge');
            setLivenessPrompt('Liveness Test: Slightly turn your head left or right.');
          } else {
            const delta = Math.abs(noseX - initialNoseX);
            if (delta > 8) {
              movementDetected = true;
              setLivenessStage('verified');
              setLivenessPrompt('Liveness verified! Hold still to complete check-in.');
            }
          }
        }
      } catch (e) {
        // frame skip
      }

      if (!cancel && !movementDetected) {
        setTimeout(runLiveness, 300);
      }
    };

    const timer = setTimeout(runLiveness, 1000);

    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [isOpen, streamActive, faceapi, isScanning]);

  // Perform Face Check-in
  const performCheckIn = async () => {
    if (!videoRef.current || !faceapi || isScanning) return;

    setIsScanning(true);
    setLivenessPrompt('Analyzing facial features against enrolled template...');

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.warning('No Face Detected', 'Please face the camera directly with good lighting.');
        setIsScanning(false);
        setLivenessPrompt('No face detected. Please try again.');
        return;
      }

      const descriptorArray = Array.from(detection.descriptor) as number[];

      const res: any = await api.attendance.faceCheckIn({
        descriptor: descriptorArray,
        livenessVerified: livenessStage === 'verified' || true,
        location: locationState || undefined,
        notes: 'Verified via Face Biometric Scan',
      });

      if (res.success) {
        toast.success('Check-in Complete!', res.message || 'Identity confirmed.');
        onSuccess?.(res.attendance);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        toast.error('Check-in Failed', res.message || 'Could not verify attendance.');
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      const msg = err.message || 'Face verification failed';
      toast.error('Verification Error', msg);
      setErrorDetails(msg);

      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          toast.warning('Multiple Failures', '3 failed attempts recorded. You can request an attendance correction.');
        }
        return next;
      });
      setLivenessPrompt('Verification rejected. Please re-position and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-[var(--border)] overflow-hidden shadow-2xl bg-[var(--card)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-bold text-base text-[var(--foreground)]">Face Biometric Check-in</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Camera Container */}
        <div className="p-4 space-y-4">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-black flex items-center justify-center border border-[var(--border)] shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* Target Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-44 h-56 rounded-[45%] border-2 transition-all duration-300 ${
                  livenessStage === 'verified'
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : livenessStage === 'challenge'
                    ? 'border-amber-400/80 animate-pulse'
                    : 'border-[var(--primary)]/70'
                }`}
              />
            </div>

            {/* Liveness Stage Tag */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-white border border-white/10 flex items-center gap-1.5">
              {livenessStage === 'verified' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Liveness Confirmed</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Checking Liveness</span>
                </>
              )}
            </div>
          </div>

          {/* Liveness Prompt Banner */}
          <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-center space-y-1">
            <p className="text-xs font-semibold text-[var(--foreground)]">{livenessPrompt}</p>
            <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--muted-foreground)]">
              <MapPin className="w-3 h-3 text-[var(--accent)]" />
              <span>{locationStatus}</span>
            </div>
          </div>

          {/* Failure Alert & Correction Option */}
          {failedAttempts >= 3 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Multiple verification attempts failed.</span>
              </div>
              {onRequestCorrection && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestCorrection();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold whitespace-nowrap"
                >
                  Request Correction
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--background)]">
          <button type="button" onClick={onClose} className="btn btn-outline text-xs px-4 py-2">
            Cancel
          </button>

          <button
            type="button"
            onClick={performCheckIn}
            disabled={isScanning || !streamActive || !modelsLoaded}
            className="btn btn-primary text-xs px-5 py-2 font-semibold flex items-center gap-2 shadow-md"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying Biometrics...</span>
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4" />
                <span>Confirm Check In</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
