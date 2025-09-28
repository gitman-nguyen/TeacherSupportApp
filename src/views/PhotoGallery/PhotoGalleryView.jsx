import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- SVG Icons for UI ---
const FolderIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
);
const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
);
const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
);
const CheckCircleIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
);
const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

// --- Icons for Fullscreen Viewer ---
const FullscreenCloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const FullscreenPrevIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
);
const FullscreenNextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);

// --- Date Range Picker Component (using flatpickr) ---
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

function DateRangePicker({ startDate, endDate, onRangeChange }) {
    const inputRef = useRef(null);
    const flatpickrInstance = useRef(null);

    useEffect(() => {
        const loadFlatpickr = () => {
            if (inputRef.current && window.flatpickr && !flatpickrInstance.current) {
                flatpickrInstance.current = window.flatpickr(inputRef.current, {
                    mode: 'range',
                    dateFormat: "Y-m-d",
                    altInput: true,
                    altFormat: "d/m/Y",
                    conjunction: " đến ",
                    defaultDate: [startDate, endDate].filter(Boolean),
                    onChange: (selectedDates) => {
                        const formatDate = (date) => {
                            if (!date) return '';
                            const d = new Date(date);
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        };
                        
                        if (selectedDates.length === 2) {
                            onRangeChange(formatDate(selectedDates[0]), formatDate(selectedDates[1]));
                        } else if (selectedDates.length === 0) {
                            onRangeChange('', '');
                        }
                    },
                });
            }
        };

        const cssId = 'flatpickr-css';
        if (!document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
            document.head.appendChild(link);
        }

        if (!window.flatpickr) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
            script.onload = loadFlatpickr;
            document.body.appendChild(script);
        } else {
            loadFlatpickr();
        }

        return () => {
            if (flatpickrInstance.current) {
                flatpickrInstance.current.destroy();
                flatpickrInstance.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (flatpickrInstance.current) {
            flatpickrInstance.current.setDate([startDate, endDate].filter(Boolean));
        }
    }, [startDate, endDate]);

    return (
        <div className="relative">
            <CalendarIcon />
            <input
                ref={inputRef}
                type="text"
                placeholder="Lọc theo khoảng thời gian..."
                className="border border-gray-300 rounded-md py-1.5 px-2 pl-10 text-sm focus:ring-blue-500 focus:border-blue-500 w-64 cursor-pointer bg-white"
            />
        </div>
    );
}

// --- Fullscreen Viewer Component ---
function FullscreenViewer({ file, onClose, onPrev, onNext }) {
    const [mediaUrl, setMediaUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isHighResLoaded, setIsHighResLoaded] = useState(false);

    useEffect(() => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setMediaUrl(null);
        setIsHighResLoaded(false);

        if (file.mimeType.startsWith('image/') && file.thumbnailLink) {
            const lowResUrl = `${file.thumbnailLink.split('=')[0]}=s400`;
            const highResUrl = `${file.thumbnailLink.split('=')[0]}=s2048`;
            
            setMediaUrl(lowResUrl);
            setIsLoading(false);

            const highResImg = new Image();
            highResImg.src = highResUrl;
            highResImg.onload = () => {
                setMediaUrl(highResUrl);
                setIsHighResLoaded(true);
            };
            highResImg.onerror = () => {
                // Don't set an error, just stick with the low-res image
                console.error("Could not load high-resolution image.");
            };
        } 
        else if (file.mimeType.startsWith('video/')) {
            // Đối với video, chúng ta chỉ cần biết đó là video. Iframe sẽ xử lý việc tải.
            setIsLoading(false);
        }
        else {
             setError("Không thể hiển thị loại tệp này.");
             setIsLoading(false);
        }

    }, [file]);
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev]);

    if (!file) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={onClose}>
            <button className="absolute top-4 right-4 text-white hover:text-gray-300 z-50" onClick={onClose}><FullscreenCloseIcon /></button>
            <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2" onClick={(e) => { e.stopPropagation(); onPrev(); }}><FullscreenPrevIcon /></button>
            
            <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {isLoading && <p className="text-white">Đang tải...</p>}
                {error && !isLoading && <p className="text-red-400 p-4 bg-white rounded">{error}</p>}
                
                {/* Logic hiển thị ảnh giữ nguyên */}
                {mediaUrl && file.mimeType.startsWith('image/') && !error && (
                    <img 
                        src={mediaUrl} 
                        alt={file.name} 
                        className={`max-w-[90vw] max-h-[90vh] object-contain transition-all duration-300 ${isHighResLoaded ? 'blur-0' : 'blur-md'}`} 
                    />
                )}

                {/* [SỬA ĐỔI] Logic hiển thị video giờ là một iframe đơn giản */}
                {file.mimeType.startsWith('video/') && !error && (
                    // [SỬA ĐỔI] Tự tạo link nhúng từ file ID theo cú pháp chuẩn
                    <iframe
                        src={`https://drive.google.com/file/d/${file.id}/preview`}
                        className="w-[90vw] h-[90vh] max-w-[1600px] max-h-[900px] bg-black border-none"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        title={file.name}
                    ></iframe>
                )}
            </div>

            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2" onClick={(e) => { e.stopPropagation(); onNext(); }}><FullscreenNextIcon /></button>
        </div>
    );
}

// --- Gallery Item Component with Lazy Loading ---
function GalleryItem({ file, onSelect, onOpen, isSelected }) {
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const imgRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (file.thumbnailLink) {
                            const optimizedThumbUrl = `${file.thumbnailLink.split('=')[0]}=s320`;
                            setThumbnailUrl(optimizedThumbUrl);
                        }
                        observer.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: '200px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            if (imgRef.current) {
                observer.unobserve(imgRef.current);
            }
        };
    }, [file]);

    return (
        <div ref={imgRef} className="relative group aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-sm">
            {thumbnailUrl ? (
                <img 
                    src={thumbnailUrl} 
                    alt={file.name} 
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={onOpen}
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full bg-gray-200"></div>
            )}
            <div 
                className={`absolute inset-0 transition-all pointer-events-none
                ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
                ${file.isSelected ? 'border-4 border-yellow-400' : ''}`}
            ></div>
            <div className="absolute top-2 right-2 cursor-pointer" onClick={onSelect}>
                {isSelected ? (
                    <CheckCircleIcon className="w-6 h-6 text-blue-500 bg-white rounded-full"/>
                ) : (
                    <div className="w-6 h-6 bg-black bg-opacity-20 border-2 border-white rounded-full group-hover:bg-opacity-40"></div>
                )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate pointer-events-none">
                {file.name}
            </div>
        </div>
    );
}

// --- Re-authentication Component ---
const ReAuthComponent = ({ getDriveToken }) => (
    <div className="w-full h-full flex items-center justify-center p-4">
        <div className='max-w-md text-center p-6 bg-red-50 border border-red-300 rounded-lg shadow-md'>
             <h3 className='text-xl font-bold text-red-800 mb-2'>Yêu cầu xác thực</h3>
             <p className='text-red-700 mb-4'>
                Phiên truy cập Google Drive của bạn đã hết hạn hoặc không hợp lệ. Vui lòng cấp lại quyền để tiếp tục.
            </p>
            <button 
                onClick={getDriveToken} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg text-base transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
                Cấp lại quyền truy cập
            </button>
        </div>
    </div>
);

// --- Main Gallery View Component ---
function PhotoGalleryView({ accessToken, apiKey, sourceFolderId, log, getVideoCreationTime, getDriveToken, onAuthError }) {
    const [tree, setTree] = useState({});
    const [expandedFolders, setExpandedFolders] = useState([]);
    const [currentFiles, setCurrentFiles] = useState([]);
    const [allLoadedFiles, setAllLoadedFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [activeClass, setActiveClass] = useState(null);
    const [error, setError] = useState(null);
    const [fullscreenIndex, setFullscreenIndex] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentClassInfo, setCurrentClassInfo] = useState(null);

    const getFolderIdFromInput = (input) => {
        if (!input) return null;
        const match = input.match(/[-\w]{25,}/);
        if (match) return match[0];
        return input;
    };

    const driveApi = useCallback(async (path, options = {}) => {
        if (!accessToken || !apiKey) {
            throw new Error("Access Token hoặc API Key không hợp lệ.");
        }
        const url = `https://www.googleapis.com/drive/v3/${path}${path.includes('?') ? '&' : '?'}key=${apiKey}`;
        const defaultOptions = {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        };
        const response = await fetch(url, { ...defaultOptions, ...options });
        if (!response.ok) {
            if (response.status === 401 && onAuthError) {
                onAuthError();
            }
            const errorData = await response.json().catch(() => ({ error: { message: 'Lỗi không xác định từ Google Drive API.' } }));
            throw new Error(errorData.error.message);
        }
        if (options.responseType === 'blob') {
            return response.blob();
        }
        return response.json();
    }, [accessToken, apiKey, onAuthError]);

    useEffect(() => {
        const fetchFolderTree = async () => {
            if (!accessToken) {
                setIsLoading(false);
                return;
            }
            setError(null);
            setTree({});
            setIsLoading(true);
            const actualFolderId = getFolderIdFromInput(sourceFolderId);

            if (!actualFolderId) {
                const errorMessage = "Chưa cấu hình Thư mục nguồn hoặc URL không hợp lệ. Vui lòng kiểm tra trong mục Cài đặt.";
                setError(errorMessage); log(errorMessage, 'error'); setIsLoading(false); return;
            }
            
            log('Đang tải cấu trúc thư mục từ Google Drive...', 'info');
            try {
                const params = new URLSearchParams({
                    q: `'${actualFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'files(id, name)', pageSize: 1000,
                });
                const res = await driveApi(`files?${params.toString()}`);
                const folderTree = {};
                if (res.files) {
                    res.files.forEach(folder => {
                        const parts = folder.name.split(' - ');
                        if (parts.length === 2) {
                            const [school, className] = parts;
                            if (!folderTree[school]) folderTree[school] = [];
                            folderTree[school].push({ id: folder.id, name: className });
                        }
                    });
                }
                setTree(folderTree);
                if (!res.files || res.files.length === 0) {
                    log('Không tìm thấy thư mục con nào trong thư mục nguồn.', 'warn');
                } else {
                    log('Tải cấu trúc thư mục thành công.', 'success');
                }
            } catch (error) {
                if (error.message.includes('token')) return;
                const errorMessage = `Lỗi tải thư mục: ${error.message}`;
                log(errorMessage, 'error'); setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFolderTree();
    }, [accessToken, apiKey, sourceFolderId, log, driveApi]);

    const handleClassClick = (className, classId) => {
        setCurrentClassInfo({ name: className, id: classId });
        setActiveClass(classId);
    };

    useEffect(() => {
        const fetchAndEnrichFiles = async () => {
            if (!currentClassInfo || !accessToken) return;

            const { name: className, id: classId } = currentClassInfo;
            log(`Đang tải ảnh cho lớp: ${className}...`, 'info');
            
            setIsLoading(true);
            setAllLoadedFiles([]);
            setCurrentFiles([]);
            setSelectedFiles(new Set());
            setError(null);
            
            try {
                const listFiles = async (folderId, fields) => {
                    const params = new URLSearchParams({
                        q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed=false`,
                        // [SỬA LỖI] Sửa lại cú pháp của 'fields' để đảm bảo chính xác và tránh lỗi 400
                        fields: `files(${fields},createdTime,imageMediaMetadata(time))`,
                        pageSize: 1000,
                    });
                    const res = await driveApi(`files?${params.toString()}`);
                    return res.files || [];
                };

                const findSelectedFolderId = async (parentId) => {
                    const params = new URLSearchParams({
                        q: `'${parentId}' in parents and name='Selected Items' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                        fields: 'files(id)', pageSize: 1,
                    });
                    const res = await driveApi(`files?${params.toString()}`);
                    return res.files.length > 0 ? res.files[0].id : null;
                };

                // [SỬA LỖI] Yêu cầu các trường cần thiết, bao gồm 'embedLink' cho video.
                const fields = 'id, name, thumbnailLink, mimeType';
                const classFilesPromise = listFiles(classId, fields);
                const selectedFolderId = await findSelectedFolderId(classId);
                const selectedFilesPromise = selectedFolderId ? listFiles(selectedFolderId, fields) : Promise.resolve([]);

                const [classFiles, selectedFilesResult] = await Promise.all([classFilesPromise, selectedFilesPromise]);
                
                const selectedFileIds = new Set(selectedFilesResult.map(f => f.id));
                const rawFiles = [
                    ...selectedFilesResult.map(f => ({ ...f, isSelected: true })),
                    ...classFiles.filter(f => !selectedFileIds.has(f.id)).map(f => ({...f, isSelected: false}))
                ];
                
                setAllLoadedFiles(rawFiles);
                setIsLoading(false);
                log(`Tìm thấy ${rawFiles.length} tệp. Bắt đầu xử lý metadata...`, 'success');

                if (typeof getVideoCreationTime === 'function') {
                    const videoFiles = rawFiles.filter(f => f.mimeType.startsWith('video/'));
                    if (videoFiles.length > 0) {
                        log(`Đang lấy metadata cho ${videoFiles.length} video...`, 'info');
                        const CONCURRENCY_LIMIT = 5;
                        for (let i = 0; i < videoFiles.length; i += CONCURRENCY_LIMIT) {
                            const batch = videoFiles.slice(i, i + CONCURRENCY_LIMIT);
                            await Promise.all(batch.map(async (videoFile) => {
                                const videoTime = await getVideoCreationTime(videoFile.id);
                                if (videoTime) {
                                    setAllLoadedFiles(prevFiles => 
                                        prevFiles.map(f => 
                                            f.id === videoFile.id ? { ...f, videoCreationTime: videoTime } : f
                                        )
                                    );
                                }
                            }));
                        }
                        log('Lấy metadata video hoàn tất.', 'success');
                    }
                }
            } catch (error) {
                if (error.message.includes('token')) return;
                const errorMessage = `Lỗi tải ảnh: ${error.message}`;
                log(errorMessage, 'error');
                setError(errorMessage);
                setIsLoading(false);
            }
        };

        fetchAndEnrichFiles();
    }, [currentClassInfo, driveApi, log, getVideoCreationTime, accessToken]);

    useEffect(() => {
        let filesToFilter = [...allLoadedFiles];
        
        if (startDate || endDate) {
            filesToFilter = filesToFilter.filter(file => {
                let fileDateStr;
                if (file.mimeType.startsWith('video/')) {
                    fileDateStr = file.videoCreationTime || file.createdTime;
                } else {
                    fileDateStr = file.imageMediaMetadata?.time?.replace(/(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3') || file.createdTime;
                }

                if (!fileDateStr) return false;
                
                const fileDate = new Date(fileDateStr);
                if (isNaN(fileDate.getTime())) return false;

                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    if (fileDate < start) return false;
                }
                
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (fileDate > end) return false;
                }
                return true;
            });
        }
        
        setCurrentFiles(filesToFilter);

    }, [allLoadedFiles, startDate, endDate]);


    const toggleFileSelection = (fileId) => {
        setSelectedFiles(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(fileId)) newSelection.delete(fileId);
            else newSelection.add(fileId);
            return newSelection;
        });
    };

    const handleOpenFile = (index) => {
        const fileIdToFind = currentFiles[index].id;
        const indexInMasterList = allLoadedFiles.findIndex(file => file.id === fileIdToFind);
        setFullscreenIndex(indexInMasterList);
    };
    const handleCloseFullscreen = () => {
        setFullscreenIndex(null);
    };
    const handleNext = () => {
        if (fullscreenIndex !== null) {
            setFullscreenIndex((prevIndex) => (prevIndex + 1) % allLoadedFiles.length);
        }
    };
    const handlePrev = () => {
        if (fullscreenIndex !== null) {
            setFullscreenIndex((prevIndex) => (prevIndex - 1 + allLoadedFiles.length) % allLoadedFiles.length);
        }
    };
    
    const handleDownload = async () => {
        if (selectedFiles.size === 0) return;
        log(`Bắt đầu tải ${selectedFiles.size} tệp...`, 'info');
        setIsDownloading(true);

        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            document.body.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }

        const zip = new window.JSZip();
        const filesToDownload = currentFiles.filter(f => selectedFiles.has(f.id));
        try {
            await Promise.all(filesToDownload.map(async (file) => {
                 log(`Đang tải: ${file.name}`, 'info');
                 const response = await driveApi(`files/${file.id}?alt=media`, { responseType: 'blob' });
                 zip.file(file.name, response);
            }));
            log('Đang nén file...', 'info');
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `download_${new Date().getTime()}.zip`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            log('Tải xuống thành công!', 'success');
        } catch(error) {
            log(`Lỗi trong quá trình tải: ${error.message}`, 'error');
        } finally {
             setIsDownloading(false);
        }
    };
    
    const toggleFolder = (schoolName) => {
        setExpandedFolders(prev => prev.includes(schoolName) ? prev.filter(s => s !== schoolName) : [...prev, schoolName]);
    };
    
    const handleRangeChange = (start, end) => {
        setStartDate(start || '');
        setEndDate(end || '');
    };

    if (!accessToken) {
        return <ReAuthComponent getDriveToken={getDriveToken} />;
    }

    return (
        <>
            {fullscreenIndex !== null && (
                <FullscreenViewer
                    file={allLoadedFiles[fullscreenIndex]}
                    onClose={handleCloseFullscreen}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
            <div className="flex flex-col md:flex-row gap-8 h-[calc(100vh-200px)]">
                <div className="w-full md:w-1/4 lg:w-1/5 bg-white p-4 rounded-lg shadow-md overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">Các Lớp học</h2>
                    {isLoading && Object.keys(tree).length === 0 && !error ? (<p className="text-sm text-gray-500">Đang tải...</p>) : 
                    Object.keys(tree).length > 0 ? (
                        Object.keys(tree).sort().map(schoolName => (
                            <div key={schoolName} className="mb-2">
                                <button onClick={() => toggleFolder(schoolName)} className="w-full flex items-center justify-between text-left font-semibold text-gray-700 hover:bg-gray-100 p-2 rounded-md">
                                    <span>{schoolName}</span>
                                    {expandedFolders.includes(schoolName) ? <ChevronDownIcon/> : <ChevronRightIcon/>}
                                </button>
                                {expandedFolders.includes(schoolName) && (
                                    <ul className="pl-4 mt-1 border-l-2 border-gray-200">
                                        {tree[schoolName].map(cls => (
                                            <li key={cls.id}>
                                                <button onClick={() => handleClassClick(cls.name, cls.id)} className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 ${activeClass === cls.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>
                                                    <FolderIcon className="w-4 h-4 text-gray-500" /> {cls.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))
                    ) : !error ? (<p className="text-sm text-gray-500">Không tìm thấy thư mục.</p>) : null}
                </div>

                <div className="w-full md:w-3/4 lg:w-4/5 bg-white p-4 rounded-lg shadow-md flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-2 mb-4 gap-4">
                        <h2 className="text-xl font-bold self-start sm:self-center">Thư viện ảnh</h2>
                        
                        <DateRangePicker 
                            startDate={startDate}
                            endDate={endDate}
                            onRangeChange={handleRangeChange}
                        />

                        <button onClick={handleDownload} disabled={selectedFiles.size === 0 || isDownloading} className="flex items-center bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors self-end sm:self-center">
                            <DownloadIcon/>
                            {isDownloading ? 'Đang xử lý...' : `Tải ${selectedFiles.size} tệp`}
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {error ? (<div className="flex-grow flex flex-col items-center justify-center text-red-600 bg-red-50 p-4 rounded-lg"><ErrorIcon /><p className="font-semibold text-center">{error}</p></div>) : 
                        isLoading ? (<div className="flex-grow flex items-center justify-center"><p>Đang tải...</p></div>) : 
                        currentFiles.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {currentFiles.map((file, index) => (
                                    <GalleryItem 
                                        key={file.id} 
                                        file={file}
                                        onSelect={() => toggleFileSelection(file.id)}
                                        onOpen={() => handleOpenFile(index)}
                                        isSelected={selectedFiles.has(file.id)}
                                    />
                                ))}
                            </div>
                        ) : (<div className="flex-grow flex items-center justify-center"><p className="text-gray-500">Chọn một lớp để xem ảnh, hoặc không có tệp nào khớp với bộ lọc ngày.</p></div>)}
                    </div>
                </div>
            </div>
        </>
    );
}

export default PhotoGalleryView;

