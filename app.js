// 个人英语学习助手 - 主应用逻辑

class EnglishLearningApp {
    constructor() {
        // DOM元素
        this.textInput = document.getElementById('textInput');
        this.charCount = document.getElementById('charCount');
        this.clearBtn = document.getElementById('clearBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.fileInput = document.getElementById('fileInput');
        this.fileInputLabel = document.getElementById('fileInputLabel');
        
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
        
        // 初始化
        this.init();
    }
    
    init() {
        // 检查浏览器支持
        this.checkBrowserSupport();
        
        // 更新浏览器提示
        this.updateBrowserTip();
        
        // 初始化Web Speech API
        this.initSpeechSynthesis();
        this.initSpeechRecognition();
        
        // 显示/隐藏手动输入备选方案
        this.toggleManualInput();
        
        // 优化移动端体验
        this.optimizeMobileExperience();
        
        // 绑定事件
        this.bindEvents();
        
        // 加载历史记录
        this.loadHistory();
        
        // 更新字符计数
        this.updateCharCount();
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
        // 文本输入相关
        this.textInput.addEventListener('input', () => {
            this.updateCharCount();
            this.resetControls();
        });
        
        this.clearBtn.addEventListener('click', () => {
            this.textInput.value = '';
            this.updateCharCount();
            this.resetControls();
        });
        
        this.pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                this.textInput.value = text;
                this.updateCharCount();
            } catch (err) {
                alert('无法读取剪贴板，请手动粘贴');
            }
        });
        
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
        
        // 播放控制
        this.playBtn.addEventListener('click', () => this.playText());
        this.pauseBtn.addEventListener('click', () => this.pauseText());
        this.stopBtn.addEventListener('click', () => this.stopText());
        
        // 语速和音量控制
        this.rateSlider.addEventListener('input', (e) => {
            this.rateValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
        });
        
        this.volumeSlider.addEventListener('input', (e) => {
            this.volumeValue.textContent = Math.round(e.target.value * 100) + '%';
        });
        
        // 录音控制
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
        this.playRecordBtn.addEventListener('click', () => this.playRecording());
        
        // 分析按钮
        this.analyzeBtn.addEventListener('click', () => this.analyzePronunciation());
        
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
        }
        
        // 历史记录
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
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
            
            this.mediaRecorder.onstop = () => {
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
                
                // 释放旧的URL（如果有）
                if (this.recordedAudio) {
                    URL.revokeObjectURL(this.recordedAudio);
                }
                
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
}

// 初始化应用
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new EnglishLearningApp();
});
        this.loadHistory();
        
        // 更新字符计数
        this.updateCharCount();
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
        // 文本输入相关
        this.textInput.addEventListener('input', () => {
            this.updateCharCount();
            this.resetControls();
        });
        
        this.clearBtn.addEventListener('click', () => {
            this.textInput.value = '';
            this.updateCharCount();
            this.resetControls();
        });
        
        this.pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                this.textInput.value = text;
                this.updateCharCount();
            } catch (err) {
                alert('无法读取剪贴板，请手动粘贴');
            }
        });
        
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
        
        // 播放控制
        this.playBtn.addEventListener('click', () => this.playText());
        this.pauseBtn.addEventListener('click', () => this.pauseText());
        this.stopBtn.addEventListener('click', () => this.stopText());
        
        // 语速和音量控制
        this.rateSlider.addEventListener('input', (e) => {
            this.rateValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
        });
        
        this.volumeSlider.addEventListener('input', (e) => {
            this.volumeValue.textContent = Math.round(e.target.value * 100) + '%';
        });
        
        // 录音控制
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
        this.playRecordBtn.addEventListener('click', () => this.playRecording());
        
        // 分析按钮
        this.analyzeBtn.addEventListener('click', () => this.analyzePronunciation());
        
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
        }
        
        // 历史记录
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
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
            
            // 开始录音
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.recordedAudio = URL.createObjectURL(audioBlob);
                this.playRecordBtn.disabled = false;
                this.analyzeBtn.disabled = false;
                
                // 停止所有音频轨道
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
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
            alert('没有录音可以播放');
            return;
        }
        
        try {
            // 创建新的Audio对象
            const audio = new Audio(this.recordedAudio);
            
            // 添加错误处理
            audio.onerror = (e) => {
                console.error('音频播放错误:', e);
                alert('播放失败，请重试');
            };
            
            // 添加播放事件
            audio.onplay = () => {
                this.playRecordBtn.disabled = true;
                this.playRecordBtn.innerHTML = '<span class="icon">⏸️</span> 播放中...';
            };
            
            // 添加结束事件
            audio.onended = () => {
                this.playRecordBtn.disabled = false;
                this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
            };
            
            // 添加暂停事件
            audio.onpause = () => {
                this.playRecordBtn.disabled = false;
                this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
            };
            
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
                        alert('无法播放录音，请检查浏览器权限或重试');
                        this.playRecordBtn.disabled = false;
                        this.playRecordBtn.innerHTML = '<span class="icon">▶️</span> 回放录音';
                    });
            }
            
            // 保存audio引用以便后续控制
            this.currentAudio = audio;
            
        } catch (error) {
            console.error('播放录音时出错:', error);
            alert('播放失败：' + error.message);
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
}

// 初始化应用
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new EnglishLearningApp();
});
