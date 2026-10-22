/**
 * 🎡 최고급 전통 카지노 룰렛 사운드 & 음성 엔진
 * Web Audio API를 활용한 실감 물리 사운드 합성 및 여성 딜러 음성 (Web Speech API)
 */

class RouletteAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.voiceEnabled = true;
        this.rollingOsc = null;
        this.rollingGain = null;
        this.rollingFilter = null;
        this.isRolling = false;
        this.synth = window.speechSynthesis || null;
        this.voices = [];
        this.femaleVoice = null;

        // 음성 목록 로드
        if (this.synth) {
            this.loadVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.loadVoices();
            }
        }
    }

    /**
     * Web Audio Context 초기화 (사용자 첫 인터랙션 시 자동 활성화)
     */
    initContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * 브라우저 TTS 음성 중 가장 자연스러운 한국어/영어 여성 딜러 목소리 탐색
     */
    loadVoices() {
        if (!this.synth) return;
        this.voices = this.synth.getVoices();
        // 최고급 영국식(en-GB) 또는 프리미엄 미국식(en-US) 여성 딜러 음성 우선 탐색
        this.dealerVoice = this.voices.find(v =>
            v.lang.startsWith('en-GB') && (v.name.includes('Female') || v.name.includes('Libby') || v.name.includes('Sonia') || v.name.includes('Victoria'))
        ) || this.voices.find(v =>
            v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Karen') || v.name.includes('Zira') || v.name.includes('Natural'))
        ) || this.voices.find(v => v.lang.startsWith('en-GB'))
            || this.voices.find(v => v.lang.startsWith('en'))
            || this.voices.find(v => v.lang.startsWith('ko'));
    }

    /**
     * 음소거 토글
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.isRolling) {
            this.stopBallRolling();
        }
        return this.isMuted;
    }

    /**
     * 칩을 테이블에 놓을 때의 찰진 세라믹 칩 사운드
     */
    playChipSound() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.Q.setValueAtTime(4, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * 딜러가 낙첨 칩들을 테이블 위에서 쓸어 담을 때의 세련된 칩 스위핑 사운드
     */
    playChipSweepSound() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                if (!this.ctx) return;
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1200 + Math.random() * 600, t);
                osc.frequency.exponentialRampToValueAtTime(250, t + 0.04);
                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.04);
            }, i * 35);
        }
    }

    /**
     * 크리스탈/유리구슬이 마호가니 원목 림 트랙을 타고 고속으로 질주하는 실감 나는 매끄러운 활주음
     */
    startBallRolling() {
        if (this.isMuted || this.isRolling) return;
        this.initContext();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        // 부드러운 핑크 노이즈 성분의 마찰음 생성
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            output[i] = (b0 + b1 + b2) * 0.18;
        }

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        // 크리스탈 휠 트랙 공명 필터 (듀얼 밴드패스)
        this.rollingFilter = this.ctx.createBiquadFilter();
        this.rollingFilter.type = 'bandpass';
        this.rollingFilter.frequency.setValueAtTime(1900, this.ctx.currentTime);
        this.rollingFilter.Q.setValueAtTime(10, this.ctx.currentTime);

        // 유리구슬 특유의 미세한 고음 공명 하모닉 오실레이터
        this.rollingHarmonic = this.ctx.createOscillator();
        this.rollingHarmonic.type = 'sine';
        this.rollingHarmonic.frequency.setValueAtTime(1100, this.ctx.currentTime);

        this.harmonicGain = this.ctx.createGain();
        this.harmonicGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

        this.rollingGain = this.ctx.createGain();
        this.rollingGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        this.rollingGain.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 0.6);

        noiseSource.connect(this.rollingFilter);
        this.rollingFilter.connect(this.rollingGain);

        this.rollingHarmonic.connect(this.harmonicGain);
        this.harmonicGain.connect(this.rollingGain);

        this.rollingGain.connect(this.ctx.destination);

        noiseSource.start();
        this.rollingHarmonic.start();
        this.rollingSource = noiseSource;
        this.isRolling = true;
    }

    /**
     * 구슬 속도 감속에 따른 회전음 피치/음량 실시간 조절
     * @param {number} speedNorm - 속도 비율 (1.0 -> 0.0)
     */
    updateRollingSpeed(speedNorm) {
        if (!this.isRolling || !this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const freq = 550 + Math.max(0, speedNorm) * 1450;
        const vol = Math.max(0, speedNorm) * 0.28;
        const harmFreq = 420 + Math.max(0, speedNorm) * 780;

        if (this.rollingFilter) this.rollingFilter.frequency.setTargetAtTime(freq, now, 0.08);
        if (this.rollingGain) this.rollingGain.gain.setTargetAtTime(vol, now, 0.08);
        if (this.rollingHarmonic) this.rollingHarmonic.frequency.setTargetAtTime(harmFreq, now, 0.08);
    }

    /**
     * 구슬 회전 소리 중지
     */
    stopBallRolling() {
        if (!this.isRolling) return;
        try {
            if (this.rollingGain && this.ctx) {
                this.rollingGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
            }
            setTimeout(() => {
                if (this.rollingSource) {
                    this.rollingSource.stop();
                    this.rollingSource.disconnect();
                }
                if (this.rollingHarmonic) {
                    this.rollingHarmonic.stop();
                    this.rollingHarmonic.disconnect();
                }
                this.isRolling = false;
            }, 150);
        } catch (e) {
            this.isRolling = false;
        }
    }

    /**
     * 크리스탈 유리구슬이 황동 포켓 격벽(Fret)에 부딪힐 때의 청아하고 맑은 핑(Crystal Bell Ping) 타격음
     */
    playBounce() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // 메인 크리스탈 톤
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();

        osc1.type = 'sine';
        const startFreq = 2600 + Math.random() * 600;
        osc1.frequency.setValueAtTime(startFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.045);

        gain1.gain.setValueAtTime(0.42, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.045);

        // 상위 하모닉 프리즘 핑
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(startFreq * 1.6, now);
        gain2.gain.setValueAtTime(0.18, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.03);
    }

    /**
     * 크리스탈 구슬이 최종 포켓 홈에 딸깍-착 안착하는 묵직하고 품격있는 사운드
     */
    playDrop() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // 1. 단단한 원목 포켓 착지음
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(360, now);
        osc1.frequency.exponentialRampToValueAtTime(75, now + 0.09);

        gain1.gain.setValueAtTime(0.55, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.09);

        // 2. 맑은 크리스탈 클릭음
        setTimeout(() => {
            if (!this.ctx) return;
            const clickNow = this.ctx.currentTime;
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(2400, clickNow);
            osc2.frequency.exponentialRampToValueAtTime(800, clickNow + 0.05);
            gain2.gain.setValueAtTime(0.35, clickNow);
            gain2.gain.exponentialRampToValueAtTime(0.001, clickNow + 0.05);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(clickNow);
            osc2.stop(clickNow + 0.05);
        }, 25);
    }

    /**
     * 당첨 번호 위에 황동 돌리(Dolly) 핀을 세울 때의 묵직한 황동 타격음
     */
    playDollySound() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * 승리 축하 팡파르 화음
     */
    playWinSound() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);
            }, idx * 80);
        });
    }

    /**
     * 세련된 정통 카지노 여성 딜러 영어 음성 멘트 재생 (Web Speech API)
     * @param {string} text - 음성 안내 문구
     */
    speak(text) {
        if (this.isMuted || !this.voiceEnabled || !this.synth) return;
        try {
            this.synth.cancel(); // 이전 음성 중단
            const utterance = new SpeechSynthesisUtterance(text);
            if (!this.dealerVoice) {
                this.loadVoices();
            }
            if (this.dealerVoice) {
                utterance.voice = this.dealerVoice;
                utterance.lang = this.dealerVoice.lang;
            } else {
                utterance.lang = 'en-US';
            }
            utterance.rate = 0.95; // 정통 카지노 딜러의 기품 있고 차분한 속도
            utterance.pitch = 1.05; // 세련되고 자연스러운 여성 톤
            utterance.volume = 1.0;
            this.synth.speak(utterance);
        } catch (e) {
            console.warn('TTS 음성 안내 오류:', e);
        }
    }

    /**
     * 딜러 멘트: 베팅 시작 (정통 카지노 스타일)
     */
    announcePlaceBets() {
        this.speak("Place your bets, please.");
    }

    /**
     * 딜러 멘트: 노 모어 벳 (더 이상 베팅할 수 없음)
     */
    announceNoMoreBets() {
        this.speak("No more bets, thank you.");
    }

    /**
     * 딜러 멘트: 당첨 번호 결과 발표 (세련된 영어 낭독)
     * @param {number} number - 당첨 번호 (0~36)
     * @param {string} color - 'red', 'black', 'green'
     */
    announceResult(number, color) {
        let colorEng = color === 'red' ? 'Red' : (color === 'black' ? 'Black' : 'Zero');
        let parityEng = "";
        if (number > 0) {
            parityEng = number % 2 === 0 ? ", Even" : ", Odd";
        }

        // 정통 카지노 낭독 스타일: "Number 17, Black, Odd."
        const phrase = `Number ${number}, ${colorEng}${parityEng}.`;
        this.speak(phrase);
    }

    /**
     * 딜러 멘트: 승리 축하
     */
    announceWin() {
        this.speak("Congratulations, winner!");
    }
}

// 글로벌 인스턴스
window.rouletteAudio = new RouletteAudio();
