'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../lib/api';

interface FaceEnrollmentProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
}

export const FaceEnrollment: React.FC<FaceEnrollmentProps> = ({
  userId,
  userName,
  isOpen,
  onClose,
  onEnrolled,
}) => {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('Initializing camera...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const REQUIRED_SAMPLES = 3;

  // Load vladmandic/face-api dynamically
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const initFaceApi = async () => {
      try {
        setEnrollmentStatus('Loading biometric AI models...');
        const apiModule = await import('@vladmandic/face-api');
        setFaceapi(apiModule);

        await Promise.all([
          apiModule.nets.tinyFaceDetector.loadFromUri('/models'),
          apiModule.nets.faceLandmark68Net.loadFromUri('/models'),
          apiModule.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        if (mounted) {
          setModelsLoaded(true);
          setEnrollmentStatus('AI Models loaded. Ready to start capture.');
        }
      } catch (err: any) {
        console.error('Error loading face-api models:', err);
        if (mounted) {
          setErrorMsg('Failed to load biometric recognition models. Please check your network.');
        }
      }
    };

    initFaceApi();
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
          setEnrollmentStatus('Please center your face inside the frame.');
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setErrorMsg('Camera permission denied or camera device not accessible.');
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      setStreamActive(false);
    };
  }, [isOpen, modelsLoaded]);

  // Capture single sample
  const captureFrame = async () => {
    if (!videoRef.current || !faceapi || isProcessing) return;

    if (!consentGiven) {
      toast.warning('Consent Required', 'Please confirm biometric consent before enrolling.');
      return;
    }

    setIsProcessing(true);
    setEnrollmentStatus('Detecting face geometry...');

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.warning('No Face Detected', 'Please look directly at the camera with clear lighting.');
        setEnrollmentStatus('No face detected. Please face the camera directly.');
        setIsProcessing(false);
        return;
      }

      const descriptorArray = Array.from(detection.descriptor) as number[];
      const updated = [...capturedDescriptors, descriptorArray];
      setCapturedDescriptors(updated);

      toast.success(
        `Sample Captured (${updated.length}/${REQUIRED_SAMPLES})`,
        'Slightly turn head or smile for diversity.'
      );

      if (updated.length >= REQUIRED_SAMPLES) {
        // Complete enrollment
        setEnrollmentStatus('Uploading biometric descriptor set...');
        const res: any = await api.employees.enrollFace(userId, {
          descriptors: updated,
          consentGiven: true,
        });

        if (res.success) {
          toast.success('Face Enrolled!', `Biometric template successfully linked to ${userName}.`);
          onEnrolled?.();
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          toast.error('Enrollment Failed', res.message || 'Could not save face template.');
        }
      } else {
        setEnrollmentStatus(`Sample ${updated.length} of ${REQUIRED_SAMPLES} captured. Keep facing the camera.`);
      }
    } catch (err: any) {
      console.error('Face capture error:', err);
      toast.error('Scan Error', err.message || 'Error processing facial features.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCapturedDescriptors([]);
    setEnrollmentStatus('Please center your face inside the frame.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-[var(--border)] overflow-hidden shadow-2xl bg-[var(--card)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-bold text-base text-[var(--foreground)]">Face Biometric Enrollment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 bg-blue-500/10 text-blue-400 p-2.5 rounded-xl border border-blue-500/20">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              Enrolling <strong>{userName}</strong>. Only 128-dimensional vector descriptors are stored. No photographic images are saved.
            </span>
          </div>

          {errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-black flex items-center justify-center border border-[var(--border)] shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

              {/* Viewfinder Target Ring */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`w-44 h-56 rounded-[40%] border-2 border-dashed transition-all duration-300 ${
                    capturedDescriptors.length === REQUIRED_SAMPLES
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-[var(--primary)]/70'
                  }`}
                />
              </div>

              {/* Progress counter */}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold text-white border border-white/10 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>
                  {capturedDescriptors.length} / {REQUIRED_SAMPLES} Samples
                </span>
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="text-center">
            <p className="text-xs font-medium text-[var(--foreground)]">{enrollmentStatus}</p>
          </div>

          {/* Biometric Privacy Consent Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[var(--muted-foreground)] p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span>
              I grant explicit consent to extract and record facial geometry feature descriptors for identity verification and time-tracking purposes.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--background)]">
          <button
            type="button"
            onClick={handleReset}
            disabled={capturedDescriptors.length === 0}
            className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Samples</span>
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-outline text-xs px-4 py-2">
              Cancel
            </button>
            <button
              type="button"
              onClick={captureFrame}
              disabled={isProcessing || !streamActive || !modelsLoaded || capturedDescriptors.length >= REQUIRED_SAMPLES}
              className="btn btn-primary text-xs px-4 py-2 font-semibold flex items-center gap-1.5 shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>
                    {capturedDescriptors.length === 0 ? 'Capture 1st Sample' : `Capture Sample #${capturedDescriptors.length + 1}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
