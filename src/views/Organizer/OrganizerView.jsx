import React, { useState, useEffect, useRef } from 'react';

// === CÁC HÀM TIỆN ÍCH (HELPERS) CHO XỬ LÝ ẢNH CLIENT-SIDE ===
const hammingDistance = (hash1, hash2) => {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return null;
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
};

const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const loadScript = (src, id) => {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            console.log(`[DEBUG] Script đã được tải từ trước: ${id}`);
            resolve();
            return;
        }
        console.log(`[DEBUG] Bắt đầu tải script: ${src}`);
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.crossOrigin = "anonymous";
        script.onload = () => {
            console.log(`[DEBUG] Tải thành công script: ${src}`);
            resolve();
        };
        script.onerror = (errorEvent) => {
            console.error(`[DEBUG] Sự kiện lỗi khi tải script ${src}:`, errorEvent);
            reject(new Error(`Không thể tải được script: ${src}`)); 
        };
        document.body.appendChild(script);
    });
};

function OrganizerView({ 
    settings,
    timeField, setTimeField,
    removeDuplicates, setRemoveDuplicates,
    similarityThreshold, setSimilarityThreshold,
    filterUnclearSubject, setFilterUnclearSubject,
    filterDarkFace, setFilterDarkFace,
    isProcessing, progress, currentUser,
    organizePhotos, 
    logs, logContainerRef, renderLog,
    concurrencyLevel, setConcurrencyLevel,
    isSignedIn,
    getDriveToken,
    onAnalyzerReady,
    isAnalyzerReady,
}) {
    const canvasRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [modelLoadingError, setModelLoadingError] = useState(null);

    useEffect(() => {
        const toGrayscale = (imageData) => {
            const grayData = new Uint8ClampedArray(imageData.width * imageData.height);
            for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
                const r = imageData.data[i], g = imageData.data[i + 1], b = imageData.data[i + 2];
                grayData[j] = 0.299 * r + 0.587 * g + 0.114 * b;
            }
            return { data: grayData, width: imageData.width, height: imageData.height };
        };

        const calculateSharpness = (imageData) => {
            const gray = toGrayscale(imageData);
            const { data, width, height } = gray;
            const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
            let convoluted = [], mean = 0;
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const pixelIndex = (y + ky) * width + (x + kx);
                            if (pixelIndex >= 0 && pixelIndex < data.length) {
                                sum += data[pixelIndex] * kernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                    }
                    convoluted.push(sum);
                    mean += sum;
                }
            }
            if (convoluted.length === 0) return 0;
            mean /= convoluted.length;
            return convoluted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / convoluted.length;
        };

        const analyzeImage = async (imageBlob, fileName) => {
            // SỬA LỖI: Thêm bước kiểm tra để đảm bảo fileName hợp lệ
            let processedBlob = imageBlob;
            if (fileName && (fileName.toLowerCase().endsWith('.heic') || imageBlob.type === 'image/heic')) {
                if (!window.heic2any) {
                    console.error("Thư viện heic2any chưa được tải.");
                    return { error: `Không thể xử lý file HEIC: ${fileName}` };
                }
                try {
                    console.log(`[DEBUG] Đang chuyển đổi file HEIC: ${fileName}`);
                    processedBlob = await window.heic2any({
                        blob: imageBlob,
                        toType: "image/jpeg",
                        quality: 0.8,
                    });
                } catch (err) {
                    console.error(`Lỗi chuyển đổi HEIC: ${err.message}`);
                    return { error: `Không thể xử lý file HEIC: ${fileName}` };
                }
            }

            const img = new Image();
            img.crossOrigin = "anonymous";
            const url = URL.createObjectURL(processedBlob);
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    resolve();
                };
                img.onerror = (err) => {
                    URL.revokeObjectURL(url);
                    reject(err);
                };
                img.src = url;
            });

            const canvas = canvasRef.current;
            if (!canvas) return { error: 'Canvas not available' };

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const detections = await window.faceapi.detectAllFaces(img, new window.faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true);
            if (detections.length === 0) return { error: 'No face detected' };
            
            const face = detections[0];
            const box = face.detection.box;

            const hash = await window.pHash.get(img);
            
            const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
            let totalLuminance = 0, totalSaturation = 0;
            const luminances = [];

            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                totalLuminance += luminance;
                luminances.push(luminance);
                totalSaturation += rgbToHsv(r, g, b).s;
            }

            const brightness = totalLuminance / (img.width * img.height);
            const saturation = totalSaturation / (img.width * img.height);
            const contrast = Math.sqrt(luminances.reduce((acc, lum) => acc + Math.pow(lum - brightness, 2), 0) / luminances.length);
            
            const faceImageData = ctx.getImageData(box.x, box.y, box.width, box.height);
            const sharpness = calculateSharpness(faceImageData);
            
            let smileScore = 0;
            const landmarks = face.landmarks;
            const mouth = landmarks.getMouth();
            if (mouth && mouth.length >= 7) {
                 const jaw = landmarks.getJawOutline();
                 if (jaw && jaw.length >= 17) {
                    const mouthWidth = jaw[16].x - jaw[0].x;
                    const smileWidth = Math.sqrt(Math.pow(mouth[6].x - mouth[0].x, 2) + Math.pow(mouth[6].y - mouth[0].y, 2));
                    if (mouthWidth > 0 && (smileWidth / mouthWidth) > 0.45) smileScore = 1;
                 }
            }
            
            return {
                hash,
                sharpness: parseFloat(sharpness.toFixed(2)),
                brightness: parseFloat(brightness.toFixed(2)),
                contrast: parseFloat(contrast.toFixed(2)),
                saturation: parseFloat(saturation.toFixed(2)),
                smile: smileScore,
            };
        };

        const loadModels = async () => {
            try {
                console.log("[DEBUG] Bắt đầu tải các thư viện AI...");
                await Promise.all([
                    loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js', 'face-api-script'),
                    loadScript('https://cdn.jsdelivr.net/npm/phash-js@0.3.0/dist/phash.min.js', 'phash-script'),
                    loadScript('https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js', 'heic2any-script')
                ]);
                
                console.log("[DEBUG] Các thư viện đã tải xong, chờ khởi tạo global variable...");
                await new Promise((resolve, reject) => {
                    let checks = 0;
                    const interval = setInterval(() => {
                        if (window.faceapi && window.pHash && window.heic2any) {
                            clearInterval(interval);
                            console.log("[DEBUG] window.faceapi, window.pHash, và window.heic2any đã sẵn sàng.");
                            resolve();
                        }
                        checks++;
                        if (checks > 100) { 
                           clearInterval(interval);
                           reject(new Error("Tải thư viện AI thất bại (timeout)."));
                        }
                    }, 100);
                });

                const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
                console.log(`[DEBUG] Bắt đầu tải các model AI từ: ${MODEL_URL}`);
                await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                console.log("[DEBUG] Đã tải xong model tinyFaceDetector.");
                await window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
                console.log("[DEBUG] Đã tải xong model faceLandmark68TinyNet.");

                setModelsLoaded(true);
                if (typeof onAnalyzerReady === 'function') {
                    console.log("[DEBUG] Model đã sẵn sàng. Gọi onAnalyzerReady.");
                    onAnalyzerReady(analyzeImage);
                }
            } catch (error) {
                console.error('--- LỖI CHI TIẾT KHI TẢI MODEL ---');
                console.error('Error object:', error);
                if (error instanceof Error) {
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                }
                console.error('------------------------------------');

                setModelLoadingError(`Lỗi tải model AI: ${error.message}. Vui lòng kiểm tra console (F12).`);
            }
        };

        loadModels();
    }, [onAnalyzerReady]);
    
    // --- PHẦN LOGIC GỐC CỦA COMPONENT ---
    if (!settings) {
        return (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                <p className="font-bold">Đang tải thông tin cài đặt...</p>
                <p>Vui lòng đợi hoặc quay lại trang Cài đặt để kiểm tra.</p>
            </div>
        );
    }
    
    const sourceFolderId = settings.source_folder_id;
    const isCurrentUserExist = !!currentUser;
    const isDisabled = isProcessing || !sourceFolderId || !isCurrentUserExist || !isSignedIn || !isAnalyzerReady;
    
    const handleOrganizeClick = () => {
        if (typeof organizePhotos === 'function') {
            try {
                organizePhotos();
            } catch (error) {
                console.error("OrganizerView: LỖI XẢY RA KHI GỌI organizePhotos:", error);
            }
        } else {
            console.error("OrganizerView: LỖI - Hàm organizePhotos KHÔNG TỒN TẠI (undefined) hoặc không phải là một hàm!");
        }
    };

    const handleGetDriveToken = () => {
        if (typeof getDriveToken === 'function') {
            getDriveToken();
        } else {
            console.error("OrganizerView Prop Error: Hàm getDriveToken không tồn tại.");
        }
    };
    
    return (
       <div className="space-y-8">
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Cài đặt Sắp xếp</h2>
                <div className="mb-6">
                    <label htmlFor="timeFieldSelect" className="block text-lg font-medium text-gray-700 mb-2">Lọc ảnh theo</label>
                    <select id="timeFieldSelect" value={timeField} onChange={(e) => setTimeField(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                        <option value="exifTime">Ngày chụp (EXIF) / Ngày quay (Video)</option>
                        <option value="createdTime">Ngày tạo (Created Time)</option>
                        <option value="modifiedTime">Ngày chỉnh sửa (Modified Time)</option>
                    </select>
                </div>
                 <div className="mb-6">
                    <label htmlFor="concurrencyLevel" className="block text-lg font-medium text-gray-700 mb-2">Số luồng xử lý đồng thời: <span className="font-bold">{concurrencyLevel}</span></label>
                    <input type="range" id="concurrencyLevel" min="1" max="20" value={concurrencyLevel} onChange={(e) => setConcurrencyLevel(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                </div>
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-700 mb-3 mt-6">Bộ lọc Nâng cao (AI)</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-center">
                            <input type="checkbox" id="removeDuplicates" checked={removeDuplicates} onChange={(e) => setRemoveDuplicates(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                            <label htmlFor="removeDuplicates" className="ml-2 block">Loại bỏ ảnh trùng lặp/tương tự</label>
                        </div>
                         {removeDuplicates && (
                          <div className="pl-6 pt-2">
                            <label htmlFor="similarityThreshold" className="block text-sm font-medium text-gray-600">Ngưỡng tương đồng (càng nhỏ càng chặt): <span className="font-bold">{similarityThreshold}</span></label>
                            <input type="range" id="similarityThreshold" min="0" max="15" value={similarityThreshold} onChange={(e) => setSimilarityThreshold(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                          </div>
                        )}
                        <div className="flex items-center">
                            <input type="checkbox" id="filterUnclearSubject" checked={filterUnclearSubject} onChange={(e) => setFilterUnclearSubject(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" disabled/>
                            <label htmlFor="filterUnclearSubject" className="ml-2 block text-gray-400">Lọc ảnh có chủ thể không rõ nét (Sắp có)</label>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" id="filterDarkFace" checked={filterDarkFace} onChange={(e) => setFilterDarkFace(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                            <label htmlFor="filterDarkFace" className="ml-2 block">Lọc ảnh bị tối/sấp bóng mặt chủ thể</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Bắt đầu Sắp xếp</h2>
                {!isSignedIn && (
                    <div className='mb-4 p-4 border border-red-400 bg-red-50 rounded-lg'>
                        <p className='text-red-700 font-semibold mb-3'>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-2 align-text-bottom" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-12a1 1 0 102 0V8a1 1 0 10-2 0V6zm0 5a1 1 0 102 0v4a1 1 0 10-2 0v-4z" clipRule="evenodd" />
                            </svg>
                            Bạn cần cấp quyền truy cập Google Drive để bắt đầu.
                        </p>
                        <button onClick={handleGetDriveToken} disabled={isProcessing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                            Cấp quyền truy cập Google Drive
                        </button>
                    </div>
                )}

                 <button onClick={handleOrganizeClick} disabled={isDisabled} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {isProcessing ? <div className="loader w-5 h-5 rounded-full border-2 border-gray-200 mr-2"></div> : 'Bắt đầu Sắp xếp'}
                </button>
                {isProcessing && (
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
                        <div className="progress-bar-fill bg-blue-600 h-4 rounded-full text-xs text-center text-white" style={{ width: `${progress}%` }}>{progress}%</div>
                    </div>
                )}

                {modelLoadingError && <p className="text-center text-sm text-red-600 mt-2 font-semibold">{modelLoadingError}</p>}
                {!isAnalyzerReady && !modelLoadingError && isSignedIn && (
                    <p className="text-center text-sm text-yellow-600 mt-2 font-semibold animate-pulse">Đang tải model AI, vui lòng đợi...</p>
                )}
                {(!sourceFolderId && isCurrentUserExist) && (
                  <p className="text-center text-sm text-yellow-600 mt-2 font-semibold">Vui lòng nhập ID Thư mục Nguồn trong Cài đặt (Admin) để kích hoạt.</p>
                )}
                 {(isSignedIn && sourceFolderId && !isProcessing && isAnalyzerReady) && (
                    <p className="text-center text-sm text-green-600 mt-2 font-semibold">Sẵn sàng để sắp xếp. Nhấp 'Bắt đầu Sắp xếp'.</p>
                )}
            </div>
            
             <div className="bg-white p-6 rounded-lg shadow-md mt-8">
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Nhật ký Hoạt động</h2>
              <div ref={logContainerRef} className="w-full h-64 bg-gray-900 text-white p-4 rounded-lg overflow-y-auto">
                  {logs && logs.length > 0 ? renderLog() : <p className="text-gray-400">Nhật ký sẽ hiển thị ở đây...</p>}
              </div>
          </div>
       </div>
    );
}

export default OrganizerView;

