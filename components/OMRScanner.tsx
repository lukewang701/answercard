'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Camera, Upload, RefreshCw } from 'lucide-react';

export function OMRScanner({ onScanComplete }: { onScanComplete: (result: any) => void }) {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [status, setStatus] = useState('等待影像...');
  const [error, setError] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus('請將答案卡對準畫面...');
      }
    } catch (err) {
      setError('無法存取攝影機，請確認權限或使用圖片上傳');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => processImage(img);
    img.src = URL.createObjectURL(file);
    setStatus('正在處理圖片...');
  };

  const processImage = (imageSource: HTMLImageElement | HTMLVideoElement) => {
    if (!cvLoaded || !window.cv) {
      setError('OpenCV 尚未載入');
      return;
    }

    try {
      setStatus('辨識中...');
      const cv = window.cv;
      
      // 1. Read image to Mat
      let src;
      if (imageSource instanceof HTMLVideoElement) {
        // Draw video frame to canvas first
        const canvas = document.createElement('canvas');
        canvas.width = imageSource.videoWidth;
        canvas.height = imageSource.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
        src = cv.imread(canvas);
      } else {
        src = cv.imread(imageSource);
      }

      // Draw original for preview
      if (canvasRef.current) {
        cv.imshow(canvasRef.current, src);
      }

      // TODO: Implement actual OMR logic here
      // For now, we simulate a successful result
      setTimeout(() => {
        onScanComplete({
          success: true,
          // Simulated data
          studentInfo: { year: '113', class: '1', seatNumber: '01', name: '王小明' },
          answers: Array.from({ length: 75 }, (_, i) => ({
            number: i + 1,
            selectedAnswers: ['A']
          }))
        });
        src.delete();
      }, 1000);

    } catch (err) {
      console.error(err);
      setError('影像辨識失敗，請確保答案卡四角完整入鏡');
      setStatus('請重試');
    }
  };

  return (
    <div className="card max-w-2xl mx-auto w-full">
      <Script 
        src="https://docs.opencv.org/4.8.0/opencv.js" 
        onLoad={() => setCvLoaded(true)}
      />

      <div className="flex justify-between items-center mb-4">
        <h3>掃描答案卡</h3>
        <div className={`px-2 py-1 rounded text-sm ${cvLoaded ? 'bg-success' : 'bg-warning'}`}>
          {cvLoaded ? '辨識引擎就緒' : '載入引擎中...'}
        </div>
      </div>

      {error && <div className="p-3 bg-danger text-white rounded mb-4 text-sm">{error}</div>}

      <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center mb-4" style={{ minHeight: '300px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: videoRef.current?.srcObject ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        
        {!videoRef.current?.srcObject && !canvasRef.current?.width && (
          <div className="text-center opacity-50 flex flex-col items-center">
            <Camera size={48} className="mb-2" />
            <p>{status}</p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={startCamera} 
          className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={!cvLoaded}
        >
          <Camera size={20} /> 開啟相機
        </button>

        <button 
          onClick={() => {
            if (videoRef.current?.srcObject) {
              processImage(videoRef.current);
            }
          }} 
          className="btn btn-success flex-1 flex items-center justify-center gap-2"
          disabled={!cvLoaded}
        >
          <RefreshCw size={20} /> 拍照辨識
        </button>
        
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="btn btn-secondary flex items-center justify-center gap-2"
          disabled={!cvLoaded}
        >
          <Upload size={20} /> 上傳圖片
        </button>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    cv: any;
  }
}
