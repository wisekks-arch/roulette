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
     * [업그레이드] 실제 카지노 룰렛 세라믹 구슬이 원목 림 트랙을 타고 고속 활주하는 물리 마찰 롤링음
     */
    startBallRolling() {
        if (this.isMuted || this.isRolling) return;
        this.initContext();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // 정밀 핑크 노이즈 (원목 표면 마찰 텍스처)
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            output[i] = (b0 + b1 + b2) * 0.22;
        }

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        // 원목 볼 트랙 대역 밴드패스 필터
        this.rollingFilter = this.ctx.createBiquadFilter();
        this.rollingFilter.type = 'bandpass';
        this.rollingFilter.frequency.setValueAtTime(1750, this.ctx.currentTime);
        this.rollingFilter.Q.setValueAtTime(8, this.ctx.currentTime);

        // 원목 바디 저역 공명 필터 (깊은 룰렛 보울 통울림)
        this.bodyFilter = this.ctx.createBiquadFilter();
        this.bodyFilter.type = 'lowpass';
        this.bodyFilter.frequency.setValueAtTime(420, this.ctx.currentTime);

        // 세라믹 구슬 특유의 맑고 매끄러운 고주파 활주 하모닉
        this.rollingHarmonic = this.ctx.createOscillator();
        this.rollingHarmonic.type = 'sine';
        this.rollingHarmonic.frequency.setValueAtTime(980, this.ctx.currentTime);

        // 볼 회전 주기적 진동 변조 LFO (트레몰로, 구슬이 한 바퀴 돌 때마다 미세한 압력 변화 재현)
        this.rollingLfo = this.ctx.createOscillator();
        this.rollingLfo.frequency.setValueAtTime(12, this.ctx.currentTime);
        this.rollingLfoGain = this.ctx.createGain();
        this.rollingLfoGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

        this.harmonicGain = this.ctx.createGain();
        this.harmonicGain.gain.setValueAtTime(0.018, this.ctx.currentTime);

        this.rollingGain = this.ctx.createGain();
        this.rollingGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        this.rollingGain.gain.linearRampToValueAtTime(0.32, this.ctx.currentTime + 0.5);

        // 연결 체인 구성
        noiseSource.connect(this.rollingFilter);
        this.rollingFilter.connect(this.rollingGain);

        noiseSource.connect(this.bodyFilter);
        this.bodyFilter.connect(this.rollingGain);

        this.rollingHarmonic.connect(this.harmonicGain);
        this.harmonicGain.connect(this.rollingGain);

        this.rollingLfo.connect(this.rollingLfoGain);
        this.rollingLfoGain.connect(this.rollingGain.gain);

        this.rollingGain.connect(this.ctx.destination);

        noiseSource.start();
        this.rollingHarmonic.start();
        this.rollingLfo.start();

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
        const freq = 520 + Math.max(0, speedNorm) * 1400;
        const vol = Math.max(0, speedNorm) * 0.32;
        const harmFreq = 380 + Math.max(0, speedNorm) * 720;
        const lfoFreq = 4 + Math.max(0, speedNorm) * 10;

        if (this.rollingFilter) this.rollingFilter.frequency.setTargetAtTime(freq, now, 0.08);
        if (this.rollingGain) this.rollingGain.gain.setTargetAtTime(vol, now, 0.08);
        if (this.rollingHarmonic) this.rollingHarmonic.frequency.setTargetAtTime(harmFreq, now, 0.08);
        if (this.rollingLfo) this.rollingLfo.frequency.setTargetAtTime(lfoFreq, now, 0.08);
    }

    /**
     * 구슬 회전 소리 중지
     */
    stopBallRolling() {
        if (!this.isRolling) return;
        try {
            if (this.rollingGain && this.ctx) {
                this.rollingGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
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
                if (this.rollingLfo) {
                    this.rollingLfo.stop();
                    this.rollingLfo.disconnect();
                }
                this.isRolling = false;
            }, 120);
        } catch (e) {
            this.isRolling = false;
        }
    }

    /**
     * [업그레이드] 세라믹 볼이 황동 디플렉터(핀) 및 포켓 격벽(Fret)에 부딪힐 때의 리얼 메탈릭 튕김음
     */
    playBounce() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. 임팩트 순간의 날카로운 트랜지언트 틱
        const oscTick = this.ctx.createOscillator();
        const gainTick = this.ctx.createGain();
        oscTick.type = 'triangle';
        oscTick.frequency.setValueAtTime(3400 + Math.random() * 400, now);
        oscTick.frequency.exponentialRampToValueAtTime(800, now + 0.025);
        gainTick.gain.setValueAtTime(0.45, now);
        gainTick.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        oscTick.connect(gainTick);
        gainTick.connect(this.ctx.destination);
        oscTick.start(now);
        oscTick.stop(now + 0.025);

        // 2. 황동 금속의 영롱한 고유 공명음 (Metallic Brass Ping)
        const oscBrass = this.ctx.createOscillator();
        const gainBrass = this.ctx.createGain();
        oscBrass.type = 'sine';
        oscBrass.frequency.setValueAtTime(2150 + Math.random() * 200, now);
        oscBrass.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
        gainBrass.gain.setValueAtTime(0.35, now);
        gainBrass.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        oscBrass.connect(gainBrass);
        gainBrass.connect(this.ctx.destination);
        oscBrass.start(now);
        oscBrass.stop(now + 0.06);

        // 3. 0.035초 후 미세 리바운드 잔향 (튕긴 후 다시 스치는 사운드)
        setTimeout(() => {
            if (!this.ctx) return;
            const subNow = this.ctx.currentTime;
            const oscSub = this.ctx.createOscillator();
            const gainSub = this.ctx.createGain();
            oscSub.type = 'sine';
            oscSub.frequency.setValueAtTime(2800, subNow);
            oscSub.frequency.exponentialRampToValueAtTime(1600, subNow + 0.02);
            gainSub.gain.setValueAtTime(0.18, subNow);
            gainSub.gain.exponentialRampToValueAtTime(0.001, subNow + 0.02);
            oscSub.connect(gainSub);
            gainSub.connect(this.ctx.destination);
            oscSub.start(subNow);
            oscSub.stop(subNow + 0.02);
        }, 35);
    }

    /**
     * [대폭 보강] 구슬 들어가는 소리:
     * 황동 프렛 충돌 틱 -> 원목 포켓 홈 낙하 텀프 -> 포켓 안착 딸그락-착 3단계 복합 물리음
     */
    playDrop() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // ===== 1단계: 포켓 격벽(Fret)을 긁으며 떨어지는 메탈릭 클릭 (0ms) =====
        const oscFret = this.ctx.createOscillator();
        const gainFret = this.ctx.createGain();
        oscFret.type = 'triangle';
        oscFret.frequency.setValueAtTime(2900, now);
        oscFret.frequency.exponentialRampToValueAtTime(1100, now + 0.03);
        gainFret.gain.setValueAtTime(0.5, now);
        gainFret.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        oscFret.connect(gainFret);
        gainFret.connect(this.ctx.destination);
        oscFret.start(now);
        oscFret.stop(now + 0.03);

        // ===== 2단계: 마호가니 원목 포켓 바닥에 묵직하게 탁 안착하는 우드 텀프 (Wood Thump, 18ms) =====
        setTimeout(() => {
            if (!this.ctx) return;
            const t2 = this.ctx.currentTime;

            // 바닥 충격 저음 바디
            const oscWood = this.ctx.createOscillator();
            const gainWood = this.ctx.createGain();
            oscWood.type = 'triangle';
            oscWood.frequency.setValueAtTime(220, t2);
            oscWood.frequency.exponentialRampToValueAtTime(58, t2 + 0.12);
            gainWood.gain.setValueAtTime(0.75, t2);
            gainWood.gain.exponentialRampToValueAtTime(0.001, t2 + 0.12);
            oscWood.connect(gainWood);
            gainWood.connect(this.ctx.destination);
            oscWood.start(t2);
            oscWood.stop(t2 + 0.12);

            // 포켓 홈 공명 (Deep Pocket Chamber Tone)
            const oscChamber = this.ctx.createOscillator();
            const gainChamber = this.ctx.createGain();
            oscChamber.type = 'sine';
            oscChamber.frequency.setValueAtTime(110, t2);
            oscChamber.frequency.exponentialRampToValueAtTime(45, t2 + 0.15);
            gainChamber.gain.setValueAtTime(0.4, t2);
            gainChamber.gain.exponentialRampToValueAtTime(0.001, t2 + 0.15);
            oscChamber.connect(gainChamber);
            gainChamber.connect(this.ctx.destination);
            oscChamber.start(t2);
            oscChamber.stop(t2 + 0.15);
        }, 18);

        // ===== 3단계: 구슬이 포켓 홈 안에서 쏙 안착하며 딸그락-착 멈추는 리얼 안착음 (55ms & 105ms) =====
        setTimeout(() => {
            if (!this.ctx) return;
            const t3 = this.ctx.currentTime;
            const oscSettle1 = this.ctx.createOscillator();
            const gainSettle1 = this.ctx.createGain();
            oscSettle1.type = 'sine';
            oscSettle1.frequency.setValueAtTime(1650, t3);
            oscSettle1.frequency.exponentialRampToValueAtTime(750, t3 + 0.04);
            gainSettle1.gain.setValueAtTime(0.35, t3);
            gainSettle1.gain.exponentialRampToValueAtTime(0.001, t3 + 0.04);
            oscSettle1.connect(gainSettle1);
            gainSettle1.connect(this.ctx.destination);
            oscSettle1.start(t3);
            oscSettle1.stop(t3 + 0.04);
        }, 55);

        setTimeout(() => {
            if (!this.ctx) return;
            const t4 = this.ctx.currentTime;
            const oscSettle2 = this.ctx.createOscillator();
            const gainSettle2 = this.ctx.createGain();
            oscSettle2.type = 'triangle';
            oscSettle2.frequency.setValueAtTime(1250, t4);
            oscSettle2.frequency.exponentialRampToValueAtTime(500, t4 + 0.035);
            gainSettle2.gain.setValueAtTime(0.25, t4);
            gainSettle2.gain.exponentialRampToValueAtTime(0.001, t4 + 0.035);
            oscSettle2.connect(gainSettle2);
            gainSettle2.connect(this.ctx.destination);
            oscSettle2.start(t4);
            oscSettle2.stop(t4 + 0.035);
        }, 105);
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
     * 배팅 마감 시 카지노 데스크 벨(Desk Bell) 청아한 타종 사운드 (띵~ 징~)
     */
    playBetClosedBell() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 맑고 높은 종소리 (1760Hz -> 880Hz 감쇄)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.7);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.7);
    }

    /**
     * 상금 획득 시 쏟아지는 경쾌한 골드 코인 사운드
     */
    playWinCoinSound() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const baseFrequencies = [1900, 2400, 2100, 2600, 2300, 2800];
        baseFrequencies.forEach((freq, idx) => {
            setTimeout(() => {
                if (!this.ctx) return;
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.08);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.08);
            }, idx * 45);
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
        const numStr = String(number);
        let colorEng = color === 'red' ? 'Red' : (color === 'black' ? 'Black' : (numStr === '00' ? 'Double Zero' : 'Zero'));
        let parityEng = "";
        if (numStr !== '0' && numStr !== '00') {
            const numInt = parseInt(numStr, 10);
            parityEng = numInt % 2 === 0 ? ", Even" : ", Odd";
        }

        // 정통 카지노 낭독 스타일: "Number 17, Black, Odd." 또는 "Double Zero."
        const numLabel = numStr === '00' ? "Double Zero" : numStr;
        const phrase = (numStr === '00' || numStr === '0') ? `${colorEng}.` : `Number ${numLabel}, ${colorEng}${parityEng}.`;
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
