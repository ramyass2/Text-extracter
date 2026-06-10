import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  Table as TableIcon, 
  Download, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Camera, 
  X, 
  Settings, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  ChevronRight
} from "lucide-react";

interface ExtractionResult {
  documentType: string;
  columns: string[];
  rows: string[][];
}

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Extraction & Processing states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Custom camera scanner modal states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<number | null>(null);

  // Load available camera devices when scanner is opened
  useEffect(() => {
    if (isCameraOpen) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setAvailableDevices(videoDevices);
          if (videoDevices.length > 0 && !selectedDeviceId) {
            // Try to find a back camera first if available
            const backCamera = videoDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('environment')
            );
            setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
          }
        })
        .catch(err => {
          console.error("Error listing cameras:", err);
        });
    }
  }, [isCameraOpen]);

  // Start video stream when camera modal opens or camera changes
  useEffect(() => {
    if (isCameraOpen && selectedDeviceId) {
      startCameraStream(selectedDeviceId);
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraOpen, selectedDeviceId]);

  const startCameraStream = async (deviceId: string) => {
    stopCameraStream();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: deviceId ? undefined : "environment"
        }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera stream direct access error:", err);
      setCameraError("Could not access camera. Please confirm frame permissions are granted or use your standard file upload.");
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL and save
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setPreviewUrl(dataUrl);
        
        // Create matching mock file
        const blob = dataURLtoBlob(dataUrl);
        const file = new File([blob], "scanned_doc_capture.jpg", { type: "image/jpeg" });
        setImageFile(file);
        
        setError(null);
        setResult(null);
        setIsCameraOpen(false);
        stopCameraStream();
      }
    } catch (err: any) {
      console.error("Capture capturePhoto error:", err);
      setError("Failed to freeze snapshot frame. Please try standard file selection.");
    }
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/jpg"];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".heic")) {
      setError("Supported file types are JPG, JPEG, PNG, or WEBP images.");
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setResult(null);
  };

  const extractData = async () => {
    if (!previewUrl || !imageFile) return;

    setLoading(true);
    setProgress(5);
    setProgressStatus("Uploading image raw buffer...");
    setError(null);
    setResult(null);

    // Dynamic simulated incremental progress bar
    let currentProgress = 5;
    const intervalTime = 180;
    
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
    }

    progressTimerRef.current = window.setInterval(() => {
      currentProgress += Math.floor(Math.random() * 6) + 3;
      if (currentProgress >= 96) {
        currentProgress = 96;
        if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      }
      
      setProgress(currentProgress);

      if (currentProgress < 25) {
        setProgressStatus("Reading handwritten & typed pixels...");
      } else if (currentProgress < 55) {
        setProgressStatus("Extracting content segments & attributes...");
      } else if (currentProgress < 78) {
        setProgressStatus("Generating dynamic Excel columns content...");
      } else {
        setProgressStatus("Mapping values horizontally into row form...");
      }
    }, intervalTime);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: previewUrl,
          mimeType: imageFile.type || "image/jpeg",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze document");
      }

      // Finish animation smoothly
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
      setProgress(100);
      setProgressStatus("Processing complete! Structured layout built.");
      
      // Delay briefly to allow user to see 100% progress success
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 500);

    } catch (err: any) {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
      setError(err.message || "An error occurred during data processing.");
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!result) return;
    
    // Create CSV content with correct delimiter escaping
    const headerRow = result.columns.map(col => `"${col.replace(/"/g, '""')}"`).join(",");
    const dataRows = result.rows.map(row => 
      row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    const csvContent = `${headerRow}\n${dataRows}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${(result.documentType || "extracted_table").replace(/\s+/g, "_").toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Header element rebranded to TextExtractor */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl shadow-md">
              <FileText className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                TextExtractor
                <span className="text-[10px] bg-indigo-50 font-semibold px-2 py-0.5 rounded-full text-indigo-600 border border-indigo-100">AI PRO</span>
              </h1>
            </div>
          </div>
          {previewUrl && (
            <button
              onClick={reset}
              className="text-xs font-semibold text-slate-500 hover:text-slate-950 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Intro hero banner */}
        <div className="mb-8 text-center md:text-left max-w-3xl">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Turn complex document images into clean spreadsheets
          </h2>
          <p className="mt-2.5 text-base text-slate-500">
            Upload photos of receipts, invoices, student cards or tables. Our AI generates matching column attributes and structures values cleanly into row formats ready for Excel.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input Options / Preview Panel */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {!previewUrl ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 flex flex-col gap-5">
                
                {/* Drag-and-drop file uploader block */}
                <div
                  className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-400 transition-all h-[240px]"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-indigo-50 p-3 rounded-full mb-3.5 text-indigo-600">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Drag and Drop Document</h3>
                  <p className="text-xs text-slate-500 max-w-[240px] mb-4">
                    Or click here to browse files on your device.
                  </p>
                  
                  {/* Specified supported file formats as requested in prompt */}
                  <span className="inline-block text-[11px] font-medium text-indigo-600 bg-indigo-50/60 px-3 py-1 rounded-full">
                    Supports JPG, JPEG, PNG, WEBP, or HEIC
                  </span>
                  
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Separator */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <span className="relative bg-white px-3 text-xs text-slate-400 font-medium tracking-wide uppercase">Or Capture Photo</span>
                </div>

                {/* Instant Scanner Actions */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Browser Live modal Camera Scanner */}
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 bg-white rounded-xl text-center transition-all group"
                  >
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Live Web Scanner</span>
                  </button>

                  {/* Native direct phone camera trigger using input capture */}
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 bg-white rounded-xl text-center transition-all group"
                  >
                    <div className="p-2.5 bg-violet-50 text-violet-600 rounded-lg group-hover:scale-105 transition-transform">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Phone Camera</span>
                  </button>
                  
                  {/* Native Hidden Camera Handler */}
                  <input
                    type="file"
                    className="hidden"
                    ref={nativeCameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                  />
                </div>

              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" /> Image Document Attached
                  </h3>
                  <button 
                    onClick={reset}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Clear Action
                  </button>
                </div>
                
                <div className="bg-slate-900/5 p-4 flex items-center justify-center min-h-[280px] overflow-hidden max-h-[360px]">
                  <img
                    src={previewUrl}
                    alt="Loaded document preview"
                    className="max-h-[300px] object-contain rounded-lg shadow-sm border border-slate-200/40 bg-white"
                  />
                </div>
                
                {/* Dedicated START button for process block layout */}
                {!result && !loading && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={extractData}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.99]"
                    >
                      <Sparkles className="w-5 h-5 text-indigo-200" />
                      Start Process Extraction
                    </button>
                    <p className="text-[11px] text-center text-slate-400 mt-2">
                      Click start to begin AI structural extraction of variables & data.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div className="text-sm">
                  <h4 className="font-bold mb-0.5">Execution Interrupted</h4>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Progress & Results Panel */}
          <div className="md:col-span-7">
            {loading ? (
              <div className="h-full min-h-[380px] bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
                
                {/* Real-time Loader animation */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-50 scale-150"></div>
                  <div className="relative bg-white border border-slate-100 p-5 rounded-full shadow-md text-indigo-600">
                    <Loader2 className="w-10 h-10 animate-spin" />
                  </div>
                </div>

                <div className="max-w-sm w-full">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Processing and Extrapolating Data</h3>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-5">
                    {progressStatus}
                  </p>

                  {/* Fully functional premium progress bar requested */}
                  <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 mb-2 overflow-hidden border border-slate-200">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-violet-600 h-2 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>Extracting...</span>
                    <span>{progress}%</span>
                  </div>
                </div>

              </div>
            ) : result ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Header of results updated as requested: "Extracted Table" & removed word "Detected Type" */}
                <div className="p-5 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-slate-50/80">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       Extracted Table
                    </h2>
                    
                    {/* Badge showing detected document type - simple word description, "Detected Type" removed */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md text-xs tracking-wide uppercase">
                        {result.documentType || "Structured Document"}
                      </span>
                    </div>
                  </div>

                  {/* Excel export action */}
                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-100 hover:shadow-emerald-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Download className="w-4 h-4" /> Export CSV for Excel
                  </button>
                </div>
                
                {/* Table Layout Render */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {result.columns.map((col, idx) => (
                          <th 
                            key={idx} 
                            className="px-6 py-4.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase bg-slate-100/50 whitespace-nowrap border-r border-slate-200 last:border-r-0"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/40 transition-colors">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-6 py-4 text-sm font-medium text-slate-700 align-middle border-r border-slate-100 last:border-r-0">
                              {cell || <span className="text-slate-300 font-normal">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {result.rows.length === 0 && (
                        <tr>
                          <td colSpan={result.columns.length} className="px-6 py-12 text-center text-slate-400">
                            No row data captured. Try uploading again.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Spreadsheet layout bottom status */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto flex flex-wrap gap-2 items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Ready for Excel import: <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">YES</span>
                  </span>
                  
                  {/* Highlighted additional Download action at bottom */}
                  <button
                    onClick={downloadCSV}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline px-2 py-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Spreadsheet
                  </button>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[380px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100 mb-4 text-slate-300">
                  <TableIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1.5">No Structured Table Built Yet</h3>
                <p className="text-slate-500 max-w-sm text-xs leading-relaxed">
                  Provide an image document using any of the upload options on the left, then click <strong>"Start Process Extraction"</strong> to create your custom horizontal data rows.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Web Camera Scanner Overlay view modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-950 text-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full border border-slate-800">
            
            {/* Header of live scanner */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Live Web Scanner Active</h3>
              </div>
              <button 
                onClick={() => {
                  setIsCameraOpen(false);
                  stopCameraStream();
                }}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"
                title="Close camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated target overlay scanner box inside video viewpoint */}
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              
              {cameraError ? (
                <div className="p-6 text-center max-w-xs">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                  <p className="text-xs text-slate-300 mb-4">{cameraError}</p>
                  <button 
                    onClick={() => {
                      setIsCameraOpen(false);
                      stopCameraStream();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg font-semibold"
                  >
                    Close Scanner
                  </button>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                    muted
                  />
                  
                  {/* Virtual scanner frame overlays for scanning realism */}
                  <div className="absolute inset-6 border-2 border-dashed border-indigo-400 rounded-xl pointer-events-none opacity-60"></div>
                  
                  {/* Scanner moving green line overlay */}
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[bounce_3s_infinite] pointer-events-none"></div>
                  
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-[10px] text-indigo-300 font-semibold px-3 py-1.5 rounded-lg border border-indigo-500/30 whitespace-nowrap">
                    Align your document with the boundary box
                  </div>
                </>
              )}
            </div>

            {/* Video Selector & Capturing action footer */}
            {!cameraError && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
                
                {/* Camera options */}
                {availableDevices.length > 1 && (
                  <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select 
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="bg-transparent text-xs text-slate-300 focus:outline-none w-full"
                    >
                      {availableDevices.map((device, idx) => (
                        <option key={device.deviceId} value={device.deviceId} className="bg-slate-900 text-slate-300">
                          {device.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCameraOpen(false);
                      stopCameraStream();
                    }}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capturePhoto}
                    disabled={!cameraStream}
                    className="w-2/3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1"
                  >
                    <Camera className="w-4 h-4" />
                    Capture & Align
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
