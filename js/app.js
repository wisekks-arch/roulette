/**
 * 🎰 Lucky Roulette 메인 게임 컨트롤러
 * 10단계 시나리오 루프 (15초 배팅 -> 배팅 마감 -> 실사 라이브 캠 클로즈업 회전 -> 결과 발표 -> 정산 -> 다음 회차)
 * 4대 룸(최대 8명 정원), 다중 봇 배팅 시각화, 당첨 번호 100% 동기화 보장
 */

class RouletteApp {
    constructor() {
        this.balance = 1250000;       // 초기 잔고: 1,250,000 Chip
        this.currentRound = 1521;     // 시작 회차: ROUND #1521
        this.currentPhase = 'BETTING'; // 'BETTING', 'CLOSED', 'SPINNING', 'RESULT'
        this.timerSeconds = 15;        // 배팅 시간 15초
        this.timerInterval = null;
        this.nextRoundTimeout = null;
        this.currentWinningNumber = null; // 이번 회차 확정 당첨 번호 (단일 진실 소스)

        // 오토플레이 설정
        this.autoPlay = {
            enabled: false,
            remainingRounds: 0,
            initialBalance: 0,
            targetProfit: 0,
            stopLoss: 0
        };

        // 실사 라이브 캠 애니메이션 상태
        this.liveCamAnimId = null;

        this.init();
    }

    /**
     * 메인 앱 초기화
     */
    init() {
        this.purgeLockoutOverlay();

        if (!window.rouletteTable) {
            window.rouletteTable = new RouletteTable('roulette-table-mount');
        }
        if (!window.rouletteWheel) {
            window.rouletteWheel = new RouletteWheel('roulette-wheel-canvas');
        }

        this.updateBalanceDisplay();
        this.updateBetDisplay();
        this.updateRoundDisplay();
        this.attachControlEvents();
        this.initNoticeTicker();

        if (window.rouletteAuth) {
            window.rouletteAuth.renderHeaderProfile();
        }

        // 2번 일반방 기본 입장
        if (window.rouletteLobby) {
            window.rouletteLobby.enterRoom(2);
        }

        // 첫 라운드 시작
        this.startBettingPhase();
    }

    /**
     * 실시간 공지사항 티커 초기화
     */
    initNoticeTicker() {
        const text = (window.rouletteStats && window.rouletteStats.notice)
            ? window.rouletteStats.notice
            : "👑 VIP European Roulette에 오신 것을 환영합니다! 공정한 라이브 난수 시스템 가동 중.";
        this.updateNoticeTicker(text);
    }

    updateNoticeTicker(text) {
        const tickerEl = document.getElementById('ticker-text');
        if (tickerEl) {
            tickerEl.textContent = text;
        }
    }

    /**
     * 배팅 마감(Lockout) 잔여 오버레이 화면 강제 소멸 헬퍼
     */
    purgeLockoutOverlay() {
        try {
            const els = document.querySelectorAll('#table-lockout-overlay, .table-lockout-overlay');
            els.forEach(el => el.remove());
        } catch (e) { }
    }

    /**
     * 회차 UI 표시 업데이트
     */
    updateRoundDisplay() {
        const roundEl = document.getElementById('current-round-text');
        if (roundEl) {
            roundEl.textContent = `ROUND #${this.currentRound}`;
        }
    }

    /**
     * 유저 잔고 표시 업데이트
     */
    updateBalanceDisplay() {
        const balanceEl = document.getElementById('user-balance-text');
        if (balanceEl) {
            balanceEl.textContent = `${this.balance.toLocaleString()} Chip`;
        }
        const autoBalEl = document.getElementById('auto-current-balance');
        if (autoBalEl) {
            autoBalEl.textContent = `${this.balance.toLocaleString()} Chip`;
        }
    }

    /**
     * 총 배팅액 표시 업데이트 및 상단 참석자 바 동기화
     */
    updateBetDisplay() {
        const betEl = document.getElementById('user-bet-text');
        const betAmount = window.rouletteTable ? window.rouletteTable.totalBetAmount : 0;
        if (betEl) {
            betEl.textContent = `${betAmount.toLocaleString()} Chip`;
        }

        const myBarBet = document.getElementById('my-bar-bet');
        if (myBarBet) {
            myBarBet.textContent = betAmount > 0 ? `${betAmount.toLocaleString()} Chip` : '배팅 대기';
        }
    }

    /**
     * 잔고 차감
     */
    deductBalance(amount) {
        this.balance = Math.max(0, this.balance - amount);
        this.updateBalanceDisplay();
        this.updateBetDisplay();
    }

    /**
     * 잔고 추가
     */
    addBalance(amount) {
        this.balance += amount;
        this.updateBalanceDisplay();
        this.updateBetDisplay();
    }

    /**
     * 컨트롤 버튼 이벤트 바인딩
     */
    attachControlEvents() {
        // 1. 칩 선택 버튼들 (100 ~ 500K)
        const chipButtons = document.querySelectorAll('.chip-selector-btn');
        chipButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                chipButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = parseInt(btn.getAttribute('data-value'), 10);
                if (window.rouletteTable) {
                    window.rouletteTable.setSelectedChip(val);
                }
                if (window.rouletteAudio) {
                    window.rouletteAudio.playChipSound();
                }
            });
        });

        // 2. Undo (마지막 배팅 1단계 취소)
        const undoBtn = document.getElementById('btn-undo-bet');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.currentPhase !== 'BETTING') {
                    this.showToast("배팅 진행 중에만 취소할 수 있습니다.");
                    return;
                }
                if (window.rouletteTable) {
                    const success = window.rouletteTable.undoLastBet();
                    if (success) {
                        this.showToast("마지막 배팅 1단계가 취소되었습니다.");
                        this.updateBetDisplay();
                    } else {
                        this.showToast("취소할 배팅 내역이 없습니다.");
                    }
                }
            });
        }

        // 3. 전체 베팅 취소 (Clear)
        const clearBtn = document.getElementById('btn-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.currentPhase === 'BETTING' && window.rouletteTable) {
                    window.rouletteTable.clearBets();
                    this.updateBetDisplay();
                    this.showToast("모든 배팅이 취소되었습니다.");
                }
            });
        }

        // 5. 재베팅 (Rebet)
        const rebetBtn = document.getElementById('btn-rebet');
        if (rebetBtn) {
            rebetBtn.addEventListener('click', () => {
                if (this.currentPhase === 'BETTING' && window.rouletteTable) {
                    window.rouletteTable.rebet();
                    this.updateBetDisplay();
                }
            });
        }

        // 6. 2배 배팅 (Double)
        const doubleBtn = document.getElementById('btn-double');
        if (doubleBtn) {
            doubleBtn.addEventListener('click', () => {
                if (this.currentPhase === 'BETTING' && window.rouletteTable) {
                    window.rouletteTable.doubleBets();
                    this.updateBetDisplay();
                }
            });
        }

        // 7. 로비 모달 열기/닫기
        const lobbyBtn = document.getElementById('btn-open-lobby');
        if (lobbyBtn) {
            lobbyBtn.addEventListener('click', () => {
                const modal = document.getElementById('lobby-modal');
                if (modal) modal.classList.remove('hidden');
            });
        }
        const closeLobbyBtn = document.getElementById('btn-close-lobby');
        if (closeLobbyBtn) {
            closeLobbyBtn.addEventListener('click', () => {
                const modal = document.getElementById('lobby-modal');
                if (modal) modal.classList.add('hidden');
            });
        }

        // 7-1. 회원가입 / 로그인 / 프로필 모달 열기/닫기
        const authBtn = document.getElementById('btn-open-auth');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                if (window.rouletteAuth) {
                    window.rouletteAuth.openAuthModal('auto');
                }
            });
        }
        const closeAuthBtn = document.getElementById('btn-close-auth');
        if (closeAuthBtn) {
            closeAuthBtn.addEventListener('click', () => {
                if (window.rouletteAuth) {
                    window.rouletteAuth.closeAuthModal();
                }
            });
        }

        // 8. 통계 모달 열기/닫기
        const statsBtn = document.getElementById('btn-open-stats');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                if (window.rouletteStats) {
                    window.rouletteStats.renderStatsModal();
                }
                const modal = document.getElementById('stats-modal');
                if (modal) modal.classList.remove('hidden');
            });
        }
        const closeStatsBtn = document.getElementById('btn-close-stats');
        if (closeStatsBtn) {
            closeStatsBtn.addEventListener('click', () => {
                const modal = document.getElementById('stats-modal');
                if (modal) modal.classList.add('hidden');
            });
        }

        // 9. 오토 플레이 모달 및 제어
        const autoBtn = document.getElementById('btn-open-autoplay');
        if (autoBtn) {
            autoBtn.addEventListener('click', () => {
                const modal = document.getElementById('autoplay-modal');
                if (modal) modal.classList.remove('hidden');
            });
        }
        const closeAutoBtn = document.getElementById('btn-close-autoplay');
        if (closeAutoBtn) {
            closeAutoBtn.addEventListener('click', () => {
                const modal = document.getElementById('autoplay-modal');
                if (modal) modal.classList.add('hidden');
            });
        }

        const startAutoBtn = document.getElementById('btn-start-autoplay');
        if (startAutoBtn) {
            startAutoBtn.addEventListener('click', () => {
                this.startAutoPlay();
            });
        }

        const stopAutoBtn = document.getElementById('btn-stop-autoplay');
        if (stopAutoBtn) {
            stopAutoBtn.addEventListener('click', () => {
                this.stopAutoPlay("사용자에 의해 자동 배팅이 정지되었습니다.");
            });
        }

        // 10. 관리자 모달 열기/닫기
        const adminBtn = document.getElementById('btn-open-admin');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                if (window.rouletteStats) {
                    window.rouletteStats.renderAdminModal();
                }
                const modal = document.getElementById('admin-modal');
                if (modal) modal.classList.remove('hidden');
            });
        }
        const closeAdminBtn = document.getElementById('btn-close-admin');
        if (closeAdminBtn) {
            closeAdminBtn.addEventListener('click', () => {
                const modal = document.getElementById('admin-modal');
                if (modal) modal.classList.add('hidden');
            });
        }

        // 11. BGM 토글
        const bgmBtn = document.getElementById('btn-toggle-bgm');
        if (bgmBtn) {
            bgmBtn.addEventListener('click', () => {
                if (window.rouletteAudio) {
                    const isPlaying = window.rouletteAudio.toggleBGM();
                    bgmBtn.textContent = isPlaying ? '🎷 BGM ON' : '🎷 BGM OFF';
                    bgmBtn.classList.toggle('active', isPlaying);
                    this.showToast(isPlaying ? "카지노 재즈 BGM이 시작되었습니다." : "카지노 BGM이 정지되었습니다.");
                }
            });
        }

        // 12. 사운드 효과음 토글
        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                if (window.rouletteAudio) {
                    const isMuted = window.rouletteAudio.toggleMute();
                    soundBtn.textContent = isMuted ? '🔇 사운드 OFF' : '🔊 사운드 ON';
                    soundBtn.classList.toggle('muted', isMuted);
                }
            });
        }

        // 13. 무료 충전
        const refillBtn = document.getElementById('btn-refill-balance');
        if (refillBtn) {
            refillBtn.addEventListener('click', () => {
                this.addBalance(1000000);
                this.showToast("1,000,000 Chip이 무료 충전되었습니다!");
                if (window.rouletteAudio) {
                    window.rouletteAudio.playWinCoinSound();
                }
            });
        }

        // 14. 모달 배경 클릭 시 닫기 (라이브 캠 및 승리 모달 제외)
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') &&
                e.target.id !== 'live-cam-modal' &&
                e.target.id !== 'win-celebration-modal') {
                e.target.classList.add('hidden');
            }
        });
    }

    /**
     * 룸 변경 시 처리
     */
    onRoomChanged(room) {
        if (window.rouletteTable) {
            window.rouletteTable.clearBets();
        }
        this.showToast(`[${room.name}] 룰렛 테이블에 입장하셨습니다.`);
        this.startBettingPhase();
    }

    /**
     * 오토 플레이 시작
     */
    startAutoPlay() {
        if (!window.rouletteTable || window.rouletteTable.totalBetAmount === 0) {
            this.showToast("먼저 테이블에 원하시는 배팅 칩을 배치해 주세요.");
            return;
        }

        const roundsInput = document.getElementById('auto-rounds-input');
        const profitInput = document.getElementById('auto-profit-input');
        const stopLossInput = document.getElementById('auto-stoploss-input');

        const rounds = roundsInput ? parseInt(roundsInput.value, 10) || 10 : 10;
        const targetProfit = profitInput ? parseInt(profitInput.value, 10) || 0 : 0;
        const stopLoss = stopLossInput ? parseInt(stopLossInput.value, 10) || 0 : 0;

        this.autoPlay = {
            enabled: true,
            remainingRounds: rounds,
            initialBalance: this.balance + window.rouletteTable.totalBetAmount,
            targetProfit: targetProfit,
            stopLoss: stopLoss
        };

        const indicator = document.getElementById('autoplay-active-indicator');
        if (indicator) indicator.style.display = 'inline-block';

        const autoModal = document.getElementById('autoplay-modal');
        if (autoModal) autoModal.classList.add('hidden');

        this.showToast(`자동 배팅(총 ${rounds}회)이 활성화되었습니다.`);
    }

    /**
     * 오토 플레이 정지
     */
    stopAutoPlay(reason) {
        if (!this.autoPlay.enabled) return;

        this.autoPlay.enabled = false;
        this.autoPlay.remainingRounds = 0;

        const indicator = document.getElementById('autoplay-active-indicator');
        if (indicator) indicator.style.display = 'none';

        if (reason) {
            this.showToast(reason);
        }
    }

    /**
     * 오토 플레이 조건 체크
     */
    checkAutoPlayConditions() {
        if (!this.autoPlay.enabled) return;

        this.autoPlay.remainingRounds--;
        const profit = this.balance - this.autoPlay.initialBalance;

        if (this.autoPlay.targetProfit > 0 && profit >= this.autoPlay.targetProfit) {
            this.stopAutoPlay(`🎉 목표 수익(+${this.autoPlay.targetProfit.toLocaleString()} Chip)에 도달하여 자동 정지되었습니다!`);
            return;
        }

        if (this.autoPlay.stopLoss > 0 && profit <= -this.autoPlay.stopLoss) {
            this.stopAutoPlay(`⚠️ 손절 기준(-${this.autoPlay.stopLoss.toLocaleString()} Chip)에 도달하여 자동 정지되었습니다.`);
            return;
        }

        if (this.autoPlay.remainingRounds <= 0) {
            this.stopAutoPlay("설정한 자동 배팅 횟수가 모두 완료되었습니다.");
            return;
        }
    }

    /**
     * 1단계: 배팅 페이즈 시작 (20초 카운트다운 및 다중 봇 배팅 시뮬레이션)
     */
    startBettingPhase() {
        this.currentPhase = 'BETTING';
        this.timerSeconds = 20;

        // 이번 회차의 당첨 번호를 사전에 단일 확정 (0~36, 100% 동기화 보장)
        this.currentWinningNumber = Math.floor(Math.random() * 37);

        // 테이블 언락 및 돌리 핀 제거
        if (window.rouletteTable) {
            window.rouletteTable.removeDolly();
            window.rouletteTable.setLocked(false);
        }

        // 마감 알림 모달, 라이브 캠 팝업 및 승리 모달 숨김
        const nmbModal = document.getElementById('no-more-bets-modal');
        if (nmbModal) {
            nmbModal.classList.add('hidden');
            nmbModal.style.display = 'none';
        }

        const liveCamModal = document.getElementById('live-cam-modal');
        if (liveCamModal) {
            liveCamModal.classList.add('hidden');
            liveCamModal.style.display = 'none';
        }

        const winModal = document.getElementById('win-celebration-modal');
        if (winModal) {
            winModal.classList.add('hidden');
            winModal.style.display = 'none';
        }

        // 상태 배너 업데이트 (정통 카지노 딜러의 배팅 오픈 콜)
        this.updatePhaseStatus(`🎲 PLACE YOUR BETS (ROUND #${this.currentRound})`, "betting");
        this.updateTimerDisplay(this.timerSeconds);

        // 딜러 음성 안내
        if (window.rouletteAudio) {
            window.rouletteAudio.announcePlaceBets();
        }

        // 상단 참석자 바 렌더링
        if (window.rouletteLobby) {
            window.rouletteLobby.renderTablePlayersBar();
            window.rouletteLobby.simulateAiBets();
        }

        // 오토플레이 시 직전 배팅 자동 재배팅
        if (this.autoPlay.enabled && window.rouletteTable) {
            window.rouletteTable.rebet();
            this.updateBetDisplay();
        }

        // 20초 카운트다운 타이머
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            this.updateTimerDisplay(this.timerSeconds);

            // 3초 이하 틱 사운드
            if (this.timerSeconds <= 3 && this.timerSeconds > 0 && window.rouletteAudio) {
                window.rouletteAudio.playChipSound();
            }

            if (this.timerSeconds <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.closeBettingPhase();
            }
        }, 1000);
    }

    /**
     * 2단계: 배팅 마감 (배팅 시간 종료 즉시 지체 없이 바로 룰렛 휠 회전 및 구슬 질주 시작!)
     */
    closeBettingPhase() {
        if (this.currentPhase !== 'BETTING') return;
        this.currentPhase = 'CLOSED';

        this.purgeLockoutOverlay();

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // 테이블 즉시 잠금 (추가 배팅 원천 차단)
        if (window.rouletteTable) {
            window.rouletteTable.setLocked(true);
        }

        // 봇 배팅 타임아웃 정리 및 마감 상태 갱신
        if (window.rouletteLobby) {
            window.rouletteLobby.onBettingClosed();
        }

        // 땡!! 벨 소리 및 딜러 마감 음성
        if (window.rouletteAudio) {
            window.rouletteAudio.playBetClosedBell();
            window.rouletteAudio.announceNoMoreBets();
        }

        this.updatePhaseStatus("⛔ NO MORE BETS! - 딜러 배팅 마감 (구슬 투구)", "closed");
        this.updateTimerDisplay(0);

        // 상단 마감 알림 배너 표출 (구슬 도는 화면을 방해하지 않고 1.5초 후 자동 소멸)
        const nmbModal = document.getElementById('no-more-bets-modal');
        if (nmbModal) {
            nmbModal.classList.remove('hidden');
            nmbModal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; z-index: 999999 !important; pointer-events: none !important;';
            setTimeout(() => {
                nmbModal.classList.add('hidden');
                nmbModal.style.display = 'none';
            }, 1500);
        }

        // 관리자 배팅 로그 기록
        if (window.rouletteTable && window.rouletteStats) {
            const userNick = (window.rouletteAuth && window.rouletteAuth.currentUser)
                ? window.rouletteAuth.currentUser.nickname : '로열_플레이어';
            for (const [spotId, bet] of Object.entries(window.rouletteTable.bets || {})) {
                if (bet && bet.amount > 0) {
                    window.rouletteStats.addBetLog(this.currentRound, userNick, bet.type, bet.numbers, bet.amount);
                }
            }
        }

        // [핵심] 배팅 시간이 종료되면 기다리지 않고 0초 딜레이로 즉시 휠을 돌리고 구슬을 투구!
        this.triggerSpin();
    }

    /**
     * 3단계: 딜러 주도 구슬 투구 및 휠 회전 실사 라이브 연동 (정확히 4.0초 고정 실행 후 자동 닫힘)
     */
    triggerSpin() {
        this.currentPhase = 'SPINNING';
        this.purgeLockoutOverlay();
        this.updatePhaseStatus("🔴 딜러가 구슬을 투구하여 휠을 회전시키고 있습니다!", "spinning");

        const targetNum = this.currentWinningNumber;

        // 1. 영상 팝업 화면 최상단 전면 강제 표출 (z-index: 999999)
        const liveCamModal = document.getElementById('live-cam-modal');
        const winBadge = document.getElementById('live-cam-win-badge');
        const statusText = document.getElementById('live-cam-status-text');

        if (winBadge) winBadge.classList.add('hidden');
        if (statusText) statusText.textContent = "🔴 LIVE: 구슬이 외곽 림을 타고 고속 질주하고 있습니다...";

        if (liveCamModal) {
            liveCamModal.classList.remove('hidden');
            liveCamModal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; z-index: 999999 !important; pointer-events: all !important;';
        }

        // 구슬 회전 사운드 재생
        if (window.rouletteAudio && window.rouletteAudio.startBallRolling) {
            window.rouletteAudio.startBallRolling();
        }

        // 메인 테이블 휠 회전 병행
        if (window.rouletteWheel) {
            window.rouletteWheel.spin(targetNum, () => { });
        }

        // 4.0초 절대 시간 완료 처리 함수
        let isSpinFinished = false;
        const handleSpinFinished = () => {
            if (isSpinFinished) return;
            isSpinFinished = true;

            if (this.liveCamAnimId) {
                cancelAnimationFrame(this.liveCamAnimId);
                this.liveCamAnimId = null;
            }

            // 영상 팝업 완전 강제 소멸
            if (liveCamModal) {
                liveCamModal.classList.add('hidden');
                liveCamModal.style.cssText = 'display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;';
            }

            const color = window.rouletteWheel ? window.rouletteWheel.getNumberColor(targetNum) : 'red';
            this.onSpinResult(targetNum, color);
        };

        // 2. 정확히 4.0초(4000ms) 타임라인 시퀀서 가동
        this.runTimeBasedLiveCam(targetNum, handleSpinFinished);

        // 3. [Fail-Safe 안전 타이머 4.2초] 브라우저 백그라운드 등 어떤 예외에서도 100% 진행 보장
        setTimeout(() => {
            if (!isSpinFinished) {
                handleSpinFinished();
            }
        }, 4200);
    }

    /**
     * 정확히 4.0초(4000ms) 동안 구동되는 대형 3D 구슬 물리 렌더러
     */
    runTimeBasedLiveCam(targetNum, onFinished) {
        const canvas = document.getElementById('live-cam-canvas');
        if (!canvas) {
            if (onFinished) onFinished();
            return;
        }

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2 + 10;
        const outerR = Math.min(w, h) * 0.44; // 760x540 기준 약 237px의 대형 휠

        const numbers = [
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
            24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ];
        const sliceAngle = (Math.PI * 2) / numbers.length;
        const targetIdx = numbers.indexOf(targetNum);

        const TOTAL_DURATION = 4000; // 요청하신 4초 연장 (4000ms)
        const startTime = performance.now();

        let bouncePlayed = false;
        let lockOnShown = false;

        if (this.liveCamAnimId) cancelAnimationFrame(this.liveCamAnimId);

        const renderFrame = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1.0, elapsed / TOTAL_DURATION);

            let wheelAngle = (elapsed / 1000) * 0.75;
            let ballAngle = 0;
            let ballRadius = outerR * 0.92;

            if (progress < 0.50) {
                // 1구간 (0.0s ~ 2.0s): 외곽 림을 타고 도는 초고속 회전
                const t1 = progress / 0.50;
                ballAngle = -((elapsed / 1000) * 11.0) * (1 - t1 * 0.25);
                ballRadius = outerR * 0.92;
            } else if (progress < 0.80) {
                // 2구간 (2.0s ~ 3.2s): 감속하며 번호 포켓 진입 및 바운스
                const t2 = (progress - 0.50) / 0.30;
                ballAngle = -((elapsed / 1000) * 5.5) * (1 - t2 * 0.65);
                ballRadius = (outerR * 0.92) - (outerR * 0.92 - outerR * 0.65) * t2 + Math.sin(t2 * Math.PI * 2) * 6;

                if (!bouncePlayed) {
                    bouncePlayed = true;
                    const statusText = document.getElementById('live-cam-status-text');
                    if (statusText) statusText.textContent = "🟡 DECELERATING: 구슬이 감속하며 번호 포켓으로 진입 중...";
                    if (window.rouletteAudio && window.rouletteAudio.playBounce) window.rouletteAudio.playBounce();
                }
            } else {
                // 3구간 (3.2s ~ 4.0s): 당첨 번호 포켓 안착 및 락온 표출
                ballAngle = wheelAngle + targetIdx * sliceAngle + sliceAngle / 2;
                ballRadius = outerR * 0.65;

                if (!lockOnShown) {
                    lockOnShown = true;
                    const winBadge = document.getElementById('live-cam-win-badge');
                    const winNumEl = document.getElementById('live-cam-win-num');
                    const statusText = document.getElementById('live-cam-status-text');
                    if (winNumEl) winNumEl.textContent = targetNum;
                    if (winBadge) winBadge.classList.remove('hidden');
                    if (statusText) statusText.textContent = `🎯 BALL DROP LOCK-ON! 당첨 번호 #${targetNum}`;
                    if (window.rouletteAudio && window.rouletteAudio.playDrop) window.rouletteAudio.playDrop();
                }
            }

            // 캔버스 그리기
            ctx.clearRect(0, 0, w, h);

            // 1. 마호가니 원목 림
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
            ctx.fillStyle = '#220b04';
            ctx.fill();
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 5;
            ctx.stroke();

            // 2. 휠 슬라이스 회전
            ctx.translate(cx, cy);
            ctx.rotate(wheelAngle);

            for (let i = 0; i < numbers.length; i++) {
                const sAngle = i * sliceAngle;
                const eAngle = sAngle + sliceAngle;
                const n = numbers[i];
                const isWinner = (progress >= 0.80 && n === targetNum);

                ctx.beginPath();
                ctx.arc(0, 0, outerR * 0.92, sAngle, eAngle);
                ctx.arc(0, 0, outerR * 0.45, eAngle, sAngle, true);
                ctx.closePath();

                if (isWinner) {
                    ctx.fillStyle = '#ffd700';
                } else if (n === 0) {
                    ctx.fillStyle = '#10b981';
                } else if ([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n)) {
                    ctx.fillStyle = '#dc2626';
                } else {
                    ctx.fillStyle = '#171717';
                }
                ctx.fill();

                // 격벽
                ctx.strokeStyle = isWinner ? '#ffffff' : '#f59e0b';
                ctx.lineWidth = isWinner ? 3.5 : 1.2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(sAngle) * outerR * 0.45, Math.sin(sAngle) * outerR * 0.45);
                ctx.lineTo(Math.cos(sAngle) * outerR * 0.92, Math.sin(sAngle) * outerR * 0.92);
                ctx.stroke();

                // 번호 표기
                ctx.save();
                const mAngle = sAngle + sliceAngle / 2;
                const tx = Math.cos(mAngle) * (outerR * 0.72);
                const ty = Math.sin(mAngle) * (outerR * 0.72);
                ctx.translate(tx, ty);
                ctx.rotate(mAngle + Math.PI / 2);
                ctx.fillStyle = isWinner ? '#000000' : '#ffffff';
                ctx.font = `bold ${isWinner ? '16px' : '12px'} 'Outfit', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(n.toString(), 0, 0);
                ctx.restore();
            }

            // 중심 황동 콘
            ctx.beginPath();
            ctx.arc(0, 0, outerR * 0.42, 0, Math.PI * 2);
            ctx.fillStyle = '#854d0e';
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            ctx.restore();

            // 3. 은구슬 렌더링 (대형화 9.5px)
            const bx = cx + Math.cos(ballAngle) * ballRadius;
            const by = cy + Math.sin(ballAngle) * ballRadius;

            ctx.save();
            ctx.beginPath();
            ctx.arc(bx, by, 9.5, 0, Math.PI * 2);
            const ballGrad = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 10);
            ballGrad.addColorStop(0, '#ffffff');
            ballGrad.addColorStop(0.5, '#e2e8f0');
            ballGrad.addColorStop(1, '#64748b');
            ctx.fillStyle = ballGrad;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();

            if (progress < 1.0) {
                this.liveCamAnimId = requestAnimationFrame(renderFrame);
            } else {
                if (onFinished) onFinished();
            }
        };

        this.liveCamAnimId = requestAnimationFrame(renderFrame);
    }

    /**
     * 4단계: 당첨 결과 발표 및 배당 정산 (3.0초 후 다음 게임으로 자동 연결)
     */
    onSpinResult(winningNumber, color) {
        this.currentPhase = 'RESULT';

        const colorName = color === 'red' ? '레드' : (color === 'black' ? '블랙' : '싱글 제로');
        this.updatePhaseStatus(`🎯 당첨 번호: ${winningNumber} (${colorName}) - 딜러 배당금 정산`, "result");

        // 1. 딜러 세련된 결과 낭독 음성
        if (window.rouletteAudio) {
            window.rouletteAudio.announceResult(winningNumber, color);
        }

        // 2. 테이블 당첨 셀에 크리스탈 말머리 돌리 핀 세우기
        if (window.rouletteTable) {
            window.rouletteTable.placeDolly(winningNumber);
        }

        // 3. 최근 20회 히스토리 바 업데이트
        this.addHistoryBadge(winningNumber, color);

        // 4. 통계 시스템 기록
        if (window.rouletteStats) {
            window.rouletteStats.recordSpin(this.currentRound, winningNumber, color);
        }

        // 5. 배당 정산 계산
        let totalWin = 0;
        let totalBet = 0;
        let winningBets = [];

        try {
            if (window.rouletteTable) {
                totalBet = window.rouletteTable.totalBetAmount || 0;
                const payoutResult = window.rouletteTable.calculatePayout(winningNumber);
                if (payoutResult) {
                    totalWin = payoutResult.totalPayout !== undefined ? payoutResult.totalPayout : (payoutResult.totalWin || 0);
                    winningBets = payoutResult.winningBets || [];
                }

                // 낙첨 칩 회수 및 당첨 칩 보존
                if (typeof window.rouletteTable.sweepLosingBets === 'function') {
                    window.rouletteTable.sweepLosingBets(winningNumber);
                } else if (typeof window.rouletteTable.settleChips === 'function') {
                    window.rouletteTable.settleChips(winningNumber, winningBets);
                }
            }

            // 유저 통계 기록 및 관리자 당첨 로그 기록
            if (window.rouletteStats) {
                window.rouletteStats.recordUserGame(totalBet, totalWin);
                window.rouletteStats.addWinLog(this.currentRound, winningNumber, totalBet, totalWin, winningBets.length);
            }

            // 회원 프로필 뱃지 실시간 동기화
            if (window.rouletteAuth) {
                window.rouletteAuth.renderHeaderProfile();
            }

            // AI 플레이어 정산 연동
            if (window.rouletteLobby) {
                window.rouletteLobby.onSpinResult(winningNumber);
            }

            // 6. 상금 지급 및 승리 연출
            if (totalWin > 0) {
                this.addBalance(totalWin);

                if (window.rouletteAudio) {
                    window.rouletteAudio.playWinCoinSound();
                    window.rouletteAudio.announceWin();
                }

                this.showWinModal(winningNumber, color, totalWin, winningBets);
            }

            // 오토플레이 조건 체크
            this.checkAutoPlayConditions();
        } catch (err) {
            console.error("Error in onSpinResult:", err);
        } finally {
            // 5단계: 정확히 3.0초 후 무조건 다음 회차로 자동 순환
            if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
            this.nextRoundTimeout = setTimeout(() => {
                this.nextRound();
            }, 3000);
        }
    }

    /**
     * 5단계: 다음 회차 자동 생성 및 무한 순환 시작
     */
    nextRound() {
        this.purgeLockoutOverlay();

        // 승리 팝업 닫기
        const winModal = document.getElementById('win-celebration-modal');
        if (winModal) {
            winModal.classList.add('hidden');
            winModal.style.display = 'none';
        }

        // 영상 팝업 닫기
        const liveCamModal = document.getElementById('live-cam-modal');
        if (liveCamModal) {
            liveCamModal.classList.add('hidden');
            liveCamModal.style.display = 'none';
        }

        // 오토플레이 조건 검사
        this.checkAutoPlayConditions();

        // 회차 증가
        this.currentRound++;
        this.updateRoundDisplay();

        // 1단계 새 배팅 페이즈 시작 (20초 리셋)
        this.startBettingPhase();
    }

    /**
     * 대형 승리 축하 모달 표시
     */
    showWinModal(winningNumber, color, winAmount, winningBets) {
        const modal = document.getElementById('win-celebration-modal');
        const numBadge = document.getElementById('win-number-badge');
        const amountText = document.getElementById('win-amount-text');
        const detailBox = document.getElementById('win-bets-detail');

        if (!modal) return;

        if (numBadge) {
            numBadge.textContent = winningNumber;
            numBadge.className = `win-badge ${color === 'red' ? 'badge-red' : (color === 'black' ? 'badge-black' : 'badge-green')}`;
        }

        if (amountText) {
            amountText.textContent = `+${winAmount.toLocaleString()} Chip`;
        }

        if (detailBox && winningBets) {
            detailBox.innerHTML = winningBets.map(b => `
                <div class="win-bet-item">
                    <span>${b.type.toUpperCase()} 적중 (${b.payoutRatio}:1)</span>
                    <span class="bet-win-amount">+${b.win.toLocaleString()} Chip</span>
                </div>
            `).join('');
        }

        modal.classList.remove('hidden');
    }

    /**
     * 상단 상태바 메시지 및 클래스 변경
     */
    updatePhaseStatus(message, phaseClass) {
        const banner = document.getElementById('announcement-banner');
        const text = document.getElementById('status-message-text');

        if (banner) {
            banner.className = `announcement-banner banner-${phaseClass}`;
        }
        if (text) {
            text.textContent = message;
        }
    }

    /**
     * 타이머 UI 업데이트
     */
    updateTimerDisplay(seconds) {
        const timerEl = document.getElementById('phase-timer');
        if (timerEl) {
            timerEl.textContent = `${seconds}s`;
        }
    }

    /**
     * 최근 20회 히스토리 바에 배지 추가
     */
    addHistoryBadge(number, color) {
        const historyList = document.getElementById('table-history-list');
        if (!historyList) return;

        const badge = document.createElement('span');
        badge.className = `history-badge badge-${color}`;
        badge.textContent = number;

        historyList.insertBefore(badge, historyList.firstChild);

        while (historyList.children.length > 20) {
            historyList.removeChild(historyList.lastChild);
        }
    }

    /**
     * 토스트 알림
     */
    showToast(msg) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;

        toast.textContent = msg;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    }
}

// 브라우저 로드 시 앱 기동
window.addEventListener('DOMContentLoaded', () => {
    window.rouletteApp = new RouletteApp();
});
