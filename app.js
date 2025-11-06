// 个人英语学习助手 - 主应用逻辑

// IndexedDB存储管理类
class AudioStorage {
    constructor() {
        this.dbName = 'EnglishLearningDB';
        this.dbVersion = 1;
        this.storeName = 'recordings';
        this.db = null;
        this.retentionDays = 30; // 保留30天
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB打开失败:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB打开成功');
                // 启动时清理旧录音
                this.cleanOldRecordings();
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('text', 'text', { unique: false });
                }
            };
        });
    }
    
    async saveRecording(audioBlob, text, duration, recognizedText) {
        if (!this.db) {
            await this.init();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const recording = {
                audioBlob: audioBlob,
                text: text,
                recognizedText: recognizedText || '',
                duration: duration,
                timestamp: Date.now(),
                mimeType: audioBlob.type
            };
            
            const request = store.add(recording);
            
            request.onsuccess = () => {
                console.log('录音保存成功，ID:', request.result);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('录音保存失败:', request.error);
                reject(request.error);
            };
        });
    }
    
    async getLatestRecording() {
        if (!this.db) {
            await this.init();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            
            const request = index.openCursor(null, 'prev'); // 从最新开始
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    resolve(cursor.value);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async cleanOldRecordings() {
        if (!this.db) {
            await this.init();
        }
        
        const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoffTime);
            
            const request = index.openCursor(range);
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    if (deletedCount > 0) {
                        console.log(`清理了 ${deletedCount} 条旧录音`);
                    }
                    resolve(deletedCount);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async getAllRecordings() {
        if (!this.db) {
            await this.init();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            
            const recordings = [];
            const request = index.openCursor(null, 'prev');
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    recordings.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(recordings);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async getRecordingById(id) {
        if (!this.db) {
            await this.init();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

class EnglishLearningApp {
    constructor() {
        // DOM元素
        this.textInput = document.getElementById('textInput');
        this.textInputSection = document.getElementById('textInputSection');
        this.charCount = document.getElementById('charCount');
        this.clearBtn = document.getElementById('clearBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.fileInput = document.getElementById('fileInput');
        this.fileInputLabel = document.getElementById('fileInputLabel');
        this.showTextBtn = document.getElementById('showTextBtn');
        this.showTextLabel = document.getElementById('showTextLabel');
        this.recordingTextDisplay = document.getElementById('recordingTextDisplay');
        this.recordingTextContent = document.getElementById('recordingTextContent');
        
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.rateSlider = document.getElementById('rateSlider');
        this.rateValue = document.getElementById('rateValue');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.currentText = document.getElementById('currentText');
        
        this.recordBtn = document.getElementById('recordBtn');
        this.stopRecordBtn = document.getElementById('stopRecordBtn');
        this.playRecordBtn = document.getElementById('playRecordBtn');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recordTime = document.getElementById('recordTime');
        this.volumeBar = document.getElementById('volumeBar');
        
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.resultContent = document.getElementById('resultContent');
        
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.textHistoryTab = document.getElementById('textHistoryTab');
        this.audioHistoryTab = document.getElementById('audioHistoryTab');
        this.textHistoryPanel = document.getElementById('textHistoryPanel');
        this.audioHistoryPanel = document.getElementById('audioHistoryPanel');
        this.audioHistoryList = document.getElementById('audioHistoryList');
        this.browserTip = document.getElementById('browserTip');
        this.manualInputSection = document.getElementById('manualInputSection');
        this.manualRecognizedText = document.getElementById('manualRecognizedText');
        this.manualAnalyzeBtn = document.getElementById('manualAnalyzeBtn');
        
        // 设备检测
        this.isMobile = this.detectMobile();
        this.isSafari = this.detectSafari();
        this.hasSpeechRecognition = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
        
        // 状态变量
        this.synthesis = null;
        this.recognition = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordedAudio = null;
        this.recordedText = '';
        this.isRecording = false;
        this.isPlaying = false;
        this.recordStartTime = null;
        this.recordTimer = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.currentAudio = null; // 当前播放的音频对象
        this.currentRecordingId = null; // 当前录音的ID
        this.isTextShown = false; // 录音区域文本是否显示
        
        // 初始化存储
        this.audioStorage = new AudioStorage();
        
        // 初始化（异步，不阻塞）
        this.init().catch(error => {
            console.error('应用初始化失败:', error);
            alert('应用初始化失败，请刷新页面重试');
        });
    }
    
    async init() {
        try {
            console.log('开始初始化应用...');
            
            // 检查浏览器支持
            this.checkBrowserSupport();
            console.log('浏览器支持检查完成');
            
            // 更新浏览器提示
            this.updateBrowserTip();
            console.log('浏览器提示更新完成');
            
            // 初始化Web Speech API（优先，不依赖存储）
            this.initSpeechSynthesis();
            this.initSpeechRecognition();
            console.log('Web Speech API初始化完成');
            
            // 显示/隐藏手动输入备选方案
            this.toggleManualInput();
            console.log('手动输入备选方案设置完成');
            
            // 优化移动端体验
            this.optimizeMobileExperience();
            console.log('移动端优化完成');
            
            // 绑定事件（重要：必须执行）
            this.bindEvents();
            console.log('事件绑定完成');
            
            // 绑定录音历史事件（使用事件委托，只需绑定一次）
            this.bindAudioHistoryEvents();
            console.log('录音历史事件绑定完成');
            
            // 加载历史记录
            this.loadHistory();
            console.log('历史记录加载完成');
            
            // 加载录音历史（延迟加载，避免阻塞）
            setTimeout(() => {
                this.loadAudioHistory().catch(err => {
                    console.error('加载录音历史失败:', err);
                });
            }, 500);
            
            // 更新字符计数
            this.updateCharCount();
            console.log('字符计数更新完成');
            
            // 初始化IndexedDB（不阻塞其他功能，异步执行）
            setTimeout(() => {
                this.audioStorage.init().then(() => {
                    console.log('IndexedDB初始化成功');
                    // 尝试加载最新的录音
                    this.loadLatestRecording().catch(err => {
                        console.error('加载最新录音失败:', err);
                    });
                }).catch(error => {
                    console.error('IndexedDB初始化失败:', error);
                    // 不显示alert，避免干扰用户，只记录错误
                    console.warn('存储功能可能受限，但其他功能仍可使用');
                });
            }, 100); // 延迟100ms，确保其他功能先初始化
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化过程中出错:', error);
            alert('应用初始化失败，请刷新页面重试。错误：' + error.message);
        }
    }
    
    async loadLatestRecording() {
        try {
            const recording = await this.audioStorage.getLatestRecording();
            if (recording) {
                // 从Blob创建URL
                this.recordedAudio = URL.createObjectURL(recording.audioBlob);
                this.recordedText = recording.recognizedText || '';
                this.currentRecordingId = recording.id;
                this.playRecordBtn.disabled = false;
                console.log('加载最新录音成功');
            }
        } catch (error) {
            console.error('加载最新录音失败:', error);
        }
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }
    
    detectSafari() {
        const ua = navigator.userAgent.toLowerCase();
        return /safari/.test(ua) && !/chrome/.test(ua) && !/chromium/.test(ua);
    }
    
    updateBrowserTip() {
        if (this.isMobile) {
            if (this.isSafari) {
                this.browserTip.innerHTML = '💡 提示：Safari支持语音朗读和录音，但语音识别需要手动输入。建议使用Chrome浏览器获得完整功能。';
            } else if (this.hasSpeechRecognition) {
                this.browserTip.innerHTML = '💡 提示：移动端Chrome浏览器支持所有功能，体验最佳！';
            } else {
                this.browserTip.innerHTML = '💡 提示：建议使用Chrome浏览器获得最佳体验';
            }
        } else {
            if (!this.hasSpeechRecognition) {
                this.browserTip.innerHTML = '💡 提示：建议使用Chrome或Edge浏览器获得完整功能';
            }
        }
    }
    
    toggleManualInput() {
        // 如果浏览器不支持语音识别，显示手动输入备选方案
        if (!this.hasSpeechRecognition && this.manualInputSection) {
            this.manualInputSection.style.display = 'block';
        }
    }
    
    optimizeMobileExperience() {
        // 移动端优化：隐藏文件导入（移动端不太方便）
        if (this.isMobile && this.fileInputLabel) {
            // 保留功能，但可以添加提示
            // this.fileInputLabel.style.display = 'none';
        }
        
        // 移动端优化：防止iOS自动缩放
        if (this.isMobile && this.textInput) {
            this.textInput.style.fontSize = '16px';
        }
    }
    
    checkBrowserSupport() {
        if (!('speechSynthesis' in window)) {
            if (this.isMobile) {
                alert('您的浏览器不支持语音合成功能，请使用Chrome浏览器');
            } else {
                alert('您的浏览器不支持语音合成功能，请使用Chrome或Edge浏览器');
            }
        }
        
        if (!this.hasSpeechRecognition) {
            if (this.isSafari) {
                console.info('Safari不支持自动语音识别，已启用手动输入备选方案');
            } else {
                console.warn('您的浏览器不支持语音识别功能，发音纠错功能可能无法使用');
            }
        }
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (this.isMobile) {
                alert('您的浏览器不支持录音功能，请使用Chrome浏览器');
            } else {
                alert('您的浏览器不支持录音功能，请使用Chrome或Edge浏览器');
            }
        }
    }
    
    initSpeechSynthesis() {
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
        }
    }
    
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'en-US';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                this.recordedText = finalTranscript || interimTranscript;
            };
            
            this.recognition.onerror = (event) => {
                console.error('语音识别错误:', event.error);
            };
        }
    }
    
    bindEvents() {
        try {
            console.log('开始绑定事件...');
            
            // 文本输入相关
            if (this.textInput) {
                this.textInput.addEventListener('input', () => {
                    this.updateCharCount();
                    this.resetControls();
                });
                console.log('文本输入事件绑定完成');
            } else {
                console.error('textInput元素未找到');
            }
        
            if (this.clearBtn) {
                this.clearBtn.addEventListener('click', () => {
                    this.textInput.value = '';
                    this.updateCharCount();
                    this.resetControls();
                });
                console.log('清空按钮事件绑定完成');
            }
            
            if (this.pasteBtn) {
                this.pasteBtn.addEventListener('click', async () => {
                    try {
                        const text = await navigator.clipboard.readText();
                        this.textInput.value = text;
                        this.updateCharCount();
                    } catch (err) {
                        alert('无法读取剪贴板，请手动粘贴');
                    }
                });
                console.log('粘贴按钮事件绑定完成');
            }
            
            if (this.fileInput) {
                this.fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            this.textInput.value = event.target.result;
                            this.updateCharCount();
                        };
                        reader.readAsText(file);
                    }
                });
                console.log('文件输入事件绑定完成');
            }
            
            // 显示文本按钮（录音区域）
            if (this.showTextBtn) {
                const showTextHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleRecordingText();
                };
                this.showTextBtn.addEventListener('click', showTextHandler);
                this.showTextBtn.addEventListener('touchend', showTextHandler);
                console.log('显示文本按钮事件绑定完成');
            }
            
            // 文本输入时更新显示
            if (this.textInput) {
                this.textInput.addEventListener('input', () => {
                    if (this.isTextShown) {
                        this.updateRecordingText();
                    }
                });
            }
        
            // 播放控制（移动端添加触摸事件支持）
            if (this.playBtn) {
                // 同时绑定click和touchend事件，确保移动端可用
                const playHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.playText();
                };
                this.playBtn.addEventListener('click', playHandler);
                this.playBtn.addEventListener('touchend', playHandler);
                console.log('播放按钮事件绑定完成（支持触摸）');
            } else {
                console.error('playBtn元素未找到');
            }
            
            if (this.pauseBtn) {
                const pauseHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.pauseText();
                };
                this.pauseBtn.addEventListener('click', pauseHandler);
                this.pauseBtn.addEventListener('touchend', pauseHandler);
                console.log('暂停按钮事件绑定完成（支持触摸）');
            }
            
            if (this.stopBtn) {
                const stopHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.stopText();
                };
                this.stopBtn.addEventListener('click', stopHandler);
                this.stopBtn.addEventListener('touchend', stopHandler);
                console.log('停止按钮事件绑定完成（支持触摸）');
            }
        
            // 语速和音量控制
            if (this.rateSlider && this.rateValue) {
                this.rateSlider.addEventListener('input', (e) => {
                    this.rateValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
                });
                console.log('语速控制事件绑定完成');
            }
            
            if (this.volumeSlider && this.volumeValue) {
                this.volumeSlider.addEventListener('input', (e) => {
                    this.volumeValue.textContent = Math.round(e.target.value * 100) + '%';
                });
                console.log('音量控制事件绑定完成');
            }
        
            // 录音控制（移动端添加触摸事件支持）
            if (this.recordBtn) {
                const recordHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 录音时自动显示文本（如果未显示且是移动端）
                    if (!this.isTextShown && this.isMobile && this.textInput && this.textInput.value.trim()) {
                        this.showRecordingText();
                    }
                    this.startRecording();
                };
                this.recordBtn.addEventListener('click', recordHandler);
                this.recordBtn.addEventListener('touchend', recordHandler);
                console.log('录音按钮事件绑定完成（支持触摸）');
            } else {
                console.error('recordBtn元素未找到');
            }
            
            if (this.stopRecordBtn) {
                const stopRecordHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.stopRecording();
                };
                this.stopRecordBtn.addEventListener('click', stopRecordHandler);
                this.stopRecordBtn.addEventListener('touchend', stopRecordHandler);
                console.log('停止录音按钮事件绑定完成（支持触摸）');
            }
            
            if (this.playRecordBtn) {
                const playRecordHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.playRecording();
                };
                this.playRecordBtn.addEventListener('click', playRecordHandler);
                this.playRecordBtn.addEventListener('touchend', playRecordHandler);
                console.log('回放录音按钮事件绑定完成（支持触摸）');
            }
        
            // 分析按钮（移动端添加触摸事件支持）
            if (this.analyzeBtn) {
                const analyzeHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.analyzePronunciation();
                };
                this.analyzeBtn.addEventListener('click', analyzeHandler);
                this.analyzeBtn.addEventListener('touchend', analyzeHandler);
                console.log('分析按钮事件绑定完成（支持触摸）');
            }
            
            // 手动输入分析按钮
            if (this.manualAnalyzeBtn) {
                this.manualAnalyzeBtn.addEventListener('click', () => {
                    const manualText = this.manualRecognizedText.value.trim();
                    if (!manualText) {
                        alert('请输入您刚才朗读的内容');
                        return;
                    }
                    this.recordedText = manualText;
                    this.analyzePronunciation();
                });
                console.log('手动输入分析按钮事件绑定完成');
            }
        
            // 历史记录标签切换
            if (this.textHistoryTab) {
                const textTabHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.switchHistoryTab('text');
                };
                this.textHistoryTab.addEventListener('click', textTabHandler);
                this.textHistoryTab.addEventListener('touchend', textTabHandler);
                console.log('文本历史标签事件绑定完成');
            }
            
            if (this.audioHistoryTab) {
                const audioTabHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.switchHistoryTab('audio');
                };
                this.audioHistoryTab.addEventListener('click', audioTabHandler);
                this.audioHistoryTab.addEventListener('touchend', audioTabHandler);
                console.log('录音历史标签事件绑定完成');
            }
            
            // 历史记录
            if (this.clearHistoryBtn) {
                this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
                console.log('清空历史按钮事件绑定完成');
            }
            
            console.log('所有事件绑定完成');
        } catch (error) {
            console.error('事件绑定过程中出错:', error);
            alert('事件绑定失败，请刷新页面重试。错误：' + error.message);
        }
    }
    
    updateCharCount() {
        const count = this.textInput.value.length;
        this.charCount.textContent = count;
    }
    
    resetControls() {
        this.stopText();
        this.recordedAudio = null;
        this.recordedText = '';
        this.analyzeBtn.disabled = true;
        this.playRecordBtn.disabled = true;
    }
    
    // TTS语音朗读功能
    playText() {
        const text = this.textInput.value.trim();
        if (!text) {
            alert('请输入英文文本');
            return;
        }
        
        if (!this.synthesis) {
            alert('您的浏览器不支持语音合成功能');
            return;
        }
        
        // 停止之前的播放
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = parseFloat(this.rateSlider.value);
        utterance.volume = parseFloat(this.volumeSlider.value);
        utterance.pitch = 1;
        
        // 高亮当前朗读的文本
        let charIndex = 0;
        const sentences = text.split(/([.!?]\s+)/);
        let currentSentenceIndex = 0;
        
        utterance.onboundary = (event) => {
            if (event.name === 'sentence') {
                const sentence = sentences[currentSentenceIndex];
                if (sentence) {
                    this.currentText.innerHTML = `<p>正在朗读：<span class="highlight">${this.escapeHtml(sentence)}</span></p>`;
                    currentSentenceIndex++;
                }
            }
        };
        
        utterance.onstart = () => {
            this.isPlaying = true;
            this.playBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.stopBtn.disabled = false;
            this.currentText.innerHTML = '<p>开始朗读...</p>';
        };
        
        utterance.onend = () => {
            this.isPlaying = false;
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.currentText.innerHTML = '<p>朗读完成</p>';
        };
        
        utterance.onerror = (event) => {
            console.error('语音合成错误:', event);
            alert('语音播放出错，请重试');
            this.isPlaying = false;
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
        };
        
        this.synthesis.speak(utterance);
    }
    
    pauseText() {
        if (this.synthesis) {
            this.synthesis.pause();
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
        }
    }
    
    stopText() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isPlaying = false;
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.currentText.innerHTML = '<p>准备朗读...</p>';
        }
    }
    
    // 录音功能
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // 设置音频分析（用于显示音量条）
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            // 检测浏览器支持的音频格式
            let mimeType = 'audio/webm';
            const supportedTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/mpeg',
                'audio/wav'
            ];
            
            // 找到第一个支持的格式
            for (const type of supportedTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    console.log('使用音频格式:', mimeType);
                    break;
                }
            }
            
            // 保存mimeType以便在onstop中使用
            const finalMimeType = mimeType;
            
            // 如果都不支持，使用默认值
            let options = {};
            if (mimeType) {
                options = { mimeType: mimeType };
            }
            
            // 开始录音
            try {
                this.mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                // 如果指定格式失败，使用默认格式
                console.warn('使用指定格式失败，使用默认格式:', e);
                this.mediaRecorder = new MediaRecorder(stream);
            }
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log('收到音频数据块，大小:', event.data.size);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                console.log('录音停止，音频块数量:', this.audioChunks.length);
                
                if (this.audioChunks.length === 0) {
                    alert('录音失败：没有录制到音频数据');
                    return;
                }
                
                // 根据实际使用的格式创建Blob
                const blobType = finalMimeType.split(';')[0]; // 移除codecs参数
                const audioBlob = new Blob(this.audioChunks, { type: blobType });
                console.log('创建音频Blob，类型:', blobType, '大小:', audioBlob.size);
                
                if (audioBlob.size === 0) {
                    alert('录音失败：音频文件为空');
                    return;
                }
                
                // 计算录音时长
                const duration = Math.floor((Date.now() - this.recordStartTime) / 1000);
                
                // 保存到IndexedDB
                try {
                    const recordingId = await this.audioStorage.saveRecording(
                        audioBlob,
                        this.textInput.value.trim(),
                        duration,
                        this.recordedText
                    );
                    this.currentRecordingId = recordingId;
                    console.log('录音已保存到IndexedDB，ID:', recordingId);
                } catch (error) {
                    console.error('保存录音到IndexedDB失败:', error);
                    alert('录音保存失败，但可以临时使用');
                }
                
                // 释放旧的URL（如果有）
                if (this.recordedAudio) {
                    URL.revokeObjectURL(this.recordedAudio);
                }
                
                // 创建新的URL用于播放
                this.recordedAudio = URL.createObjectURL(audioBlob);
                console.log('录音URL创建成功:', this.recordedAudio);
                
                this.playRecordBtn.disabled = false;
                this.analyzeBtn.disabled = false;
                
                // 停止所有音频轨道
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder错误:', event);
                alert('录音过程中出错，请重试');
            };
            
            // 设置时间片，确保数据及时保存
            this.mediaRecorder.start(100); // 每100ms保存一次数据
            this.isRecording = true;
            
            // 更新UI
            this.recordBtn.disabled = true;
            this.stopRecordBtn.disabled = false;
            this.recordingIndicator.style.display = 'flex';
            this.recordStartTime = Date.now();
            
            // 开始计时
            this.startRecordTimer();
            
            // 开始音量监测
            this.startVolumeMonitoring();
            
            // 开始语音识别（如果支持）
            if (this.recognition) {
                this.recognition.start();
            }
            
        } catch (error) {
            console.error('录音启动失败:', error);
            alert('无法启动录音，请检查麦克风权限');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // 停止语音识别
            if (this.recognition) {
                this.recognition.stop();
            }
            
            // 停止计时
            this.stopRecordTimer();
            
            // 停止音量监测
            this.stopVolumeMonitoring();
            
            // 更新UI
            this.recordBtn.disabled = false;
            this.stopRecordBtn.disabled = true;
            this.recordingIndicator.style.display = 'none';
            this.volumeBar.style.width = '0%';
            
            // 如果不支持语音识别，启用手动输入分析
            if (!this.hasSpeechRecognition && this.manualInputSection) {
                this.manualInputSection.style.display = 'block';
                this.analyzeBtn.disabled = true; // 禁用自动分析按钮
            } else {
                this.analyzeBtn.disabled = false;
            }
        }
    }
    
    startRecordTimer() {
        this.recordTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.recordTime.textContent = 
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }
    
    stopRecordTimer() {
        if (this.recordTimer) {
            clearInterval(this.recordTimer);
            this.recordTimer = null;
        }
    }
    
    startVolumeMonitoring() {
        const updateVolume = () => {
            if (this.isRecording && this.analyser && this.dataArray) {
                this.analyser.getByteFrequencyData(this.dataArray);
                const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
                const percentage = Math.min(100, (average / 255) * 100);
                this.volumeBar.style.width = percentage + '%';
                
                if (this.isRecording) {
                    requestAnimationFrame(updateVolume);
                }
            }
        };
        updateVolume();
    }
    
    stopVolumeMonitoring() {
        this.volumeBar.style.width = '0%';
    }
    
    playRecording() {
        if (!this.recordedAudio) {
            alert('没有录音可以播放，请先录音');
            return;
        }
        
        // 如果正在播放，先停止
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        try {
            console.log('开始播放录音，URL:', this.recordedAudio);
            
            // 创建新的Audio对象
            const audio = new Audio(this.recordedAudio);
            
            // 设置音频属性
            audio.preload = 'auto';
            audio.volume = 1.0;
            
            // 添加加载事件
            audio.onloadedmetadata = () => {
                console.log('音频元数据加载完成，时长:', audio.duration);
            };
            
            audio.onloadeddata = () => {
                console.log('音频数据加载完成');
            };
            
            audio.oncanplay = () => {
                console.log('音频可以播放');
            };
            
            // 添加错误处理
            audio.onerror = (e) => {
                console.error('音频播放错误:', e, audio.error);
                let errorMsg = '播放失败';
                if (audio.error) {
                    switch(audio.error.code) {
                        case audio.error.MEDIA_ERR_ABORTED:
                            errorMsg = '播放被中止';
                            break;
                        case audio.error.MEDIA_ERR_NETWORK:
                            errorMsg = '网络错误';
                            break;
                        case audio.error.MEDIA_ERR_DECODE:
                            errorMsg = '音频格式不支持，请尝试重新录音';
                            break;
                        case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMsg = '音频格式不支持，请尝试重新录音';
                            break;
                    }
                }
                alert(errorMsg);
                this.playRecordBtn.disabled = false;
                this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
            };
            
            // 添加播放事件
            audio.onplay = () => {
                console.log('音频开始播放');
                this.playRecordBtn.disabled = true;
                this.playRecordBtn.innerHTML = '<span class="icon">⏸️</span> 播放中...';
            };
            
            // 添加结束事件
            audio.onended = () => {
                console.log('音频播放结束');
                this.playRecordBtn.disabled = false;
                this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
                this.currentAudio = null;
            };
            
            // 添加暂停事件
            audio.onpause = () => {
                console.log('音频暂停');
                this.playRecordBtn.disabled = false;
                this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
            };
            
            // 添加等待事件（缓冲中）
            audio.onwaiting = () => {
                console.log('音频缓冲中...');
                this.playRecordBtn.innerHTML = '<span class="icon">⏳</span> 加载中...';
            };
            
            // 保存audio引用以便后续控制
            this.currentAudio = audio;
            
            // 先加载音频
            audio.load();
            
            // 等待音频可以播放后再播放
            const tryPlay = () => {
                if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
                    // 播放音频（移动端需要用户交互）
                    const playPromise = audio.play();
                    
                    // 处理播放Promise（移动端可能返回Promise）
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                // 播放成功
                                console.log('音频播放成功');
                            })
                            .catch((error) => {
                                console.error('音频播放失败:', error);
                                let errorMsg = '无法播放录音';
                                if (error.name === 'NotAllowedError') {
                                    errorMsg = '浏览器阻止了自动播放，请点击播放按钮重试';
                                } else if (error.name === 'NotSupportedError') {
                                    errorMsg = '音频格式不支持，请尝试重新录音';
                                }
                                alert(errorMsg);
                                this.playRecordBtn.disabled = false;
                                this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
                            });
                    }
                } else {
                    // 如果还没准备好，等待一下再试
                    setTimeout(tryPlay, 100);
                }
            };
            
            // 等待音频加载完成
            audio.addEventListener('canplay', tryPlay, { once: true });
            
            // 如果已经可以播放，立即尝试
            if (audio.readyState >= 2) {
                tryPlay();
            }
            
        } catch (error) {
            console.error('播放录音时出错:', error);
            alert('播放失败：' + error.message);
            this.playRecordBtn.disabled = false;
            this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
        }
    }
    
    // 发音纠错功能
    async analyzePronunciation() {
        const originalText = this.textInput.value.trim().toLowerCase();
        if (!originalText) {
            alert('请先输入英文文本');
            return;
        }
        
        // 如果没有识别结果，检查是否有手动输入
        if (!this.recordedText || this.recordedText.trim() === '') {
            if (this.manualRecognizedText && this.manualRecognizedText.value.trim()) {
                // 使用手动输入的文本
                this.recordedText = this.manualRecognizedText.value.trim();
            } else if (this.recordedAudio) {
                if (!this.hasSpeechRecognition) {
                    alert('请使用手动输入功能，输入您刚才朗读的内容');
                    return;
                } else {
                    alert('正在分析录音，请稍候...');
                    // 这里可以集成Whisper或其他STT服务
                    this.showResult(originalText, this.recordedText || '未识别到语音');
                    return;
                }
            } else {
                alert('请先录音');
                return;
            }
        }
        
        const recognizedText = this.recordedText.trim().toLowerCase();
        this.showResult(originalText, recognizedText);
        
        // 保存到历史记录
        this.saveToHistory(originalText, recognizedText);
        
        // 清空手动输入框
        if (this.manualRecognizedText) {
            this.manualRecognizedText.value = '';
        }
    }
    
    showResult(originalText, recognizedText) {
        // 计算准确度
        const accuracy = this.calculateAccuracy(originalText, recognizedText);
        
        // 对比文本
        const comparison = this.compareTexts(originalText, recognizedText);
        
        // 显示结果
        let accuracyClass = 'high';
        let accuracyText = '优秀';
        if (accuracy < 60) {
            accuracyClass = 'low';
            accuracyText = '需改进';
        } else if (accuracy < 80) {
            accuracyClass = 'medium';
            accuracyText = '良好';
        }
        
        this.resultContent.innerHTML = `
            <div class="result-item">
                <h3>📊 分析结果</h3>
                <div class="accuracy ${accuracyClass}">
                    准确度: ${accuracy.toFixed(1)}% - ${accuracyText}
                </div>
                <div class="comparison">
                    <div class="comparison-row">
                        <div class="comparison-label">原文：</div>
                        <div class="comparison-text">${this.formatComparisonText(originalText, comparison.original)}</div>
                    </div>
                    <div class="comparison-row">
                        <div class="comparison-label">识别：</div>
                        <div class="comparison-text">${this.formatComparisonText(recognizedText, comparison.recognized)}</div>
                    </div>
                </div>
                ${comparison.errors.length > 0 ? `
                    <div style="margin-top: 15px;">
                        <h4>⚠️ 错误提示：</h4>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            ${comparison.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                ` : '<p style="margin-top: 15px; color: var(--success-color);">✅ 发音准确，继续加油！</p>'}
            </div>
        `;
    }
    
    calculateAccuracy(original, recognized) {
        if (!recognized || recognized.length === 0) {
            return 0;
        }
        
        // 简单的编辑距离算法
        const words1 = original.split(/\s+/).filter(w => w.length > 0);
        const words2 = recognized.split(/\s+/).filter(w => w.length > 0);
        
        if (words1.length === 0) return 0;
        if (words2.length === 0) return 0;
        
        // 计算匹配的单词数
        let matches = 0;
        const maxLen = Math.max(words1.length, words2.length);
        
        for (let i = 0; i < Math.min(words1.length, words2.length); i++) {
            if (words1[i] === words2[i]) {
                matches++;
            } else {
                // 部分匹配（考虑拼写错误）
                const similarity = this.wordSimilarity(words1[i], words2[i]);
                if (similarity > 0.7) {
                    matches += similarity;
                }
            }
        }
        
        return (matches / maxLen) * 100;
    }
    
    wordSimilarity(word1, word2) {
        // 简单的Levenshtein距离相似度
        const len1 = word1.length;
        const len2 = word2.length;
        const matrix = [];
        
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (word1[i - 1] === word2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j - 1] + 1
                    );
                }
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        return 1 - (distance / maxLen);
    }
    
    compareTexts(original, recognized) {
        const words1 = original.split(/\s+/).filter(w => w.length > 0);
        const words2 = recognized.split(/\s+/).filter(w => w.length > 0);
        const errors = [];
        
        const result = {
            original: [],
            recognized: [],
            errors: []
        };
        
        const maxLen = Math.max(words1.length, words2.length);
        
        for (let i = 0; i < maxLen; i++) {
            const word1 = words1[i] || '';
            const word2 = words2[i] || '';
            
            if (word1 === word2) {
                result.original.push({ word: word1, correct: true });
                result.recognized.push({ word: word2, correct: true });
            } else {
                result.original.push({ word: word1, correct: false });
                result.recognized.push({ word: word2, correct: false });
                
                if (word1 && word2) {
                    errors.push(`"${word1}" 可能发音不准确，识别为 "${word2}"`);
                } else if (word1 && !word2) {
                    errors.push(`"${word1}" 可能未正确发音`);
                } else if (!word1 && word2) {
                    errors.push(`识别到额外的词: "${word2}"`);
                }
            }
        }
        
        return result;
    }
    
    formatComparisonText(text, words) {
        return words.map(item => {
            if (item.correct) {
                return `<span class="correct-word">${this.escapeHtml(item.word)}</span>`;
            } else {
                return `<span class="error-word">${this.escapeHtml(item.word)}</span>`;
            }
        }).join(' ');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 历史记录功能
    saveToHistory(originalText, recognizedText) {
        const history = this.getHistory();
        const accuracy = this.calculateAccuracy(originalText, recognizedText);
        
        const record = {
            id: Date.now(),
            date: new Date().toLocaleString('zh-CN'),
            originalText: originalText.substring(0, 100), // 限制长度
            recognizedText: recognizedText.substring(0, 100),
            accuracy: accuracy.toFixed(1)
        };
        
        history.unshift(record);
        
        // 只保留最近50条记录
        if (history.length > 50) {
            history.pop();
        }
        
        localStorage.setItem('englishLearningHistory', JSON.stringify(history));
        this.loadHistory();
    }
    
    getHistory() {
        const historyStr = localStorage.getItem('englishLearningHistory');
        return historyStr ? JSON.parse(historyStr) : [];
    }
    
    loadHistory() {
        const history = this.getHistory();
        
        if (history.length === 0) {
            this.historyList.innerHTML = '<p class="placeholder">暂无练习记录</p>';
            return;
        }
        
        this.historyList.innerHTML = history.map(record => {
            let accuracyClass = 'high';
            if (parseFloat(record.accuracy) < 60) {
                accuracyClass = 'low';
            } else if (parseFloat(record.accuracy) < 80) {
                accuracyClass = 'medium';
            }
            
            return `
                <div class="history-item" onclick="app.loadHistoryItem(${record.id})">
                    <div class="history-item-header">
                        <span class="history-item-date">${record.date}</span>
                        <span class="history-item-accuracy accuracy ${accuracyClass}">${record.accuracy}%</span>
                    </div>
                    <div class="history-item-text">${this.escapeHtml(record.originalText)}</div>
                </div>
            `;
        }).join('');
    }
    
    loadHistoryItem(id) {
        const history = this.getHistory();
        const record = history.find(r => r.id.toString() === id.toString());
        if (record) {
            this.textInput.value = record.originalText;
            this.updateCharCount();
            this.showResult(record.originalText, record.recognizedText);
            // 滚动到结果区域
            this.resultContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    clearHistory() {
        if (confirm('确定要清空所有历史记录吗？')) {
            localStorage.removeItem('englishLearningHistory');
            this.loadHistory();
        }
    }
    
    // 录音区域文本显示功能
    toggleRecordingText() {
        if (this.isTextShown) {
            this.hideRecordingText();
        } else {
            this.showRecordingText();
        }
    }
    
    showRecordingText() {
        if (!this.textInput || !this.textInput.value.trim()) {
            alert('请先输入文本');
            return;
        }
        
        this.isTextShown = true;
        
        // 更新按钮状态
        if (this.showTextBtn) {
            this.showTextBtn.classList.add('active');
            if (this.showTextLabel) {
                this.showTextLabel.textContent = '隐藏文本';
            }
        }
        
        // 显示文本区域
        if (this.recordingTextDisplay) {
            this.recordingTextDisplay.style.display = 'block';
        }
        
        // 更新文本内容
        this.updateRecordingText();
        
        console.log('录音区域文本已显示');
    }
    
    hideRecordingText() {
        this.isTextShown = false;
        
        // 更新按钮状态
        if (this.showTextBtn) {
            this.showTextBtn.classList.remove('active');
            if (this.showTextLabel) {
                this.showTextLabel.textContent = '显示文本';
            }
        }
        
        // 隐藏文本区域
        if (this.recordingTextDisplay) {
            this.recordingTextDisplay.style.display = 'none';
        }
        
        console.log('录音区域文本已隐藏');
    }
    
    updateRecordingText() {
        if (this.recordingTextContent && this.textInput) {
            const text = this.textInput.value.trim();
            if (text) {
                // 显示完整文本，不截断
                this.recordingTextContent.textContent = text;
            } else {
                this.recordingTextContent.textContent = '暂无文本';
            }
        }
    }
    
    // 录音历史功能
    switchHistoryTab(tab) {
        if (tab === 'text') {
            this.textHistoryTab.classList.add('active');
            this.audioHistoryTab.classList.remove('active');
            this.textHistoryPanel.classList.add('active');
            this.audioHistoryPanel.classList.remove('active');
        } else if (tab === 'audio') {
            this.audioHistoryTab.classList.add('active');
            this.textHistoryTab.classList.remove('active');
            this.audioHistoryPanel.classList.add('active');
            this.textHistoryPanel.classList.remove('active');
            // 切换到录音历史时刷新列表
            this.loadAudioHistory();
        }
    }
    
    async loadAudioHistory() {
        try {
            const recordings = await this.audioStorage.getAllRecordings();
            
            if (!recordings || recordings.length === 0) {
                this.audioHistoryList.innerHTML = '<p class="placeholder">暂无录音记录</p>';
                return;
            }
            
            this.audioHistoryList.innerHTML = recordings.map(recording => {
                const date = new Date(recording.timestamp);
                const dateStr = date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const duration = recording.duration || 0;
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                const durationStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                const textPreview = recording.text ? 
                    (recording.text.length > 50 ? recording.text.substring(0, 50) + '...' : recording.text) : 
                    '无文本';
                
                return `
                    <div class="audio-history-item" data-id="${recording.id}">
                        <div class="audio-history-item-header">
                            <span class="audio-history-item-date">${dateStr}</span>
                            <span class="audio-history-item-duration">⏱️ ${durationStr}</span>
                        </div>
                        <div class="audio-history-item-text">${this.escapeHtml(textPreview)}</div>
                        <div class="audio-history-item-actions">
                            <button class="btn-play-audio" data-id="${recording.id}" data-action="play">
                                <span class="icon">▶️</span> 回放
                            </button>
                            <button class="btn-analyze-audio" data-id="${recording.id}" data-action="analyze">
                                <span class="icon">🔍</span> 分析
                            </button>
                            <button class="btn-delete-audio" data-id="${recording.id}" data-action="delete">
                                <span class="icon">🗑️</span> 删除
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // 不需要重新绑定事件，因为已经在init中绑定了（使用事件委托）
            
            console.log(`加载了 ${recordings.length} 条录音记录`);
        } catch (error) {
            console.error('加载录音历史失败:', error);
            this.audioHistoryList.innerHTML = '<p class="placeholder" style="color: var(--error-color);">加载录音历史失败</p>';
        }
    }
    
    bindAudioHistoryEvents() {
        // 使用事件委托，避免每次重新绑定
        if (this.audioHistoryList) {
            this.audioHistoryList.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    const id = parseInt(button.getAttribute('data-id'));
                    const action = button.getAttribute('data-action');
                    
                    if (action === 'play') {
                        this.playHistoryRecording(id);
                    } else if (action === 'analyze') {
                        this.analyzeHistoryRecording(id);
                    } else if (action === 'delete') {
                        this.deleteRecording(id);
                    }
                }
            });
            
            // 移动端触摸支持
            this.audioHistoryList.addEventListener('touchend', (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = parseInt(button.getAttribute('data-id'));
                    const action = button.getAttribute('data-action');
                    
                    if (action === 'play') {
                        this.playHistoryRecording(id);
                    } else if (action === 'analyze') {
                        this.analyzeHistoryRecording(id);
                    } else if (action === 'delete') {
                        this.deleteRecording(id);
                    }
                }
            });
        }
    }
    
    async playHistoryRecording(id) {
        try {
            const recordings = await this.audioStorage.getAllRecordings();
            const recording = recordings.find(r => r.id === id);
            
            if (!recording) {
                alert('录音不存在');
                return;
            }
            
            // 释放旧的URL
            if (this.recordedAudio) {
                URL.revokeObjectURL(this.recordedAudio);
            }
            
            // 创建新的URL
            this.recordedAudio = URL.createObjectURL(recording.audioBlob);
            this.recordedText = recording.recognizedText || '';
            this.currentRecordingId = recording.id;
            
            // 播放录音
            this.playRecording();
            
            console.log('播放历史录音，ID:', id);
        } catch (error) {
            console.error('播放历史录音失败:', error);
            alert('播放失败：' + error.message);
        }
    }
    
    async analyzeHistoryRecording(id) {
        try {
            const recordings = await this.audioStorage.getAllRecordings();
            const recording = recordings.find(r => r.id === id);
            
            if (!recording) {
                alert('录音不存在');
                return;
            }
            
            // 加载录音到当前状态
            if (this.recordedAudio) {
                URL.revokeObjectURL(this.recordedAudio);
            }
            
            this.recordedAudio = URL.createObjectURL(recording.audioBlob);
            this.recordedText = recording.recognizedText || '';
            this.currentRecordingId = recording.id;
            
            // 加载文本到输入框
            if (recording.text) {
                this.textInput.value = recording.text;
                this.updateCharCount();
            }
            
            // 执行分析
            if (this.recordedText) {
                this.analyzePronunciation();
            } else {
                // 如果没有识别文本，提示用户
                if (this.hasSpeechRecognition) {
                    alert('该录音没有识别文本，请使用手动输入功能');
                } else {
                    // 显示手动输入框
                    if (this.manualInputSection) {
                        this.manualInputSection.style.display = 'block';
                        if (this.manualRecognizedText) {
                            this.manualRecognizedText.focus();
                        }
                    }
                }
            }
            
            // 切换到文本历史标签，显示分析结果
            this.switchHistoryTab('text');
            
            console.log('分析历史录音，ID:', id);
        } catch (error) {
            console.error('分析历史录音失败:', error);
            alert('分析失败：' + error.message);
        }
    }
    
    async deleteRecording(id) {
        if (!confirm('确定要删除这条录音吗？')) {
            return;
        }
        
        try {
            if (!this.audioStorage.db) {
                await this.audioStorage.init();
            }
            
            const transaction = this.audioStorage.db.transaction([this.audioStorage.storeName], 'readwrite');
            const store = transaction.objectStore(this.audioStorage.storeName);
            
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('删除录音成功，ID:', id);
                // 如果删除的是当前录音，清空状态
                if (this.currentRecordingId === id) {
                    if (this.recordedAudio) {
                        URL.revokeObjectURL(this.recordedAudio);
                    }
                    this.recordedAudio = null;
                    this.recordedText = '';
                    this.currentRecordingId = null;
                    this.playRecordBtn.disabled = true;
                    this.analyzeBtn.disabled = true;
                }
                // 刷新列表
                this.loadAudioHistory();
            };
            
            request.onerror = () => {
                console.error('删除录音失败:', request.error);
                alert('删除失败，请重试');
            };
        } catch (error) {
            console.error('删除录音时出错:', error);
            alert('删除失败：' + error.message);
        }
    }
}

// 初始化应用
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new EnglishLearningApp();
});

