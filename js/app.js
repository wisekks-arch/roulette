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

        // 땡!! 벨 소리 및 딜러 마감 음성 (방어 코드 완비)
        if (window.rouletteAudio) {
            try {
                if (typeof window.rouletteAudio.playBetClosedBell === 'function') {
                    window.rouletteAudio.playBetClosedBell();
                }
                if (typeof window.rouletteAudio.announceNoMoreBets === 'function') {
                    window.rouletteAudio.announceNoMoreBets();
                }
            } catch (audioErr) {
                console.warn("Audio announce error in closeBettingPhase:", audioErr);
            }
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

        // 2. Three.js 3D 물리 룰렛 타임라인 시퀀서 가동 (10.2초 물리 시뮬레이션 및 3초 결과 노출)
        this.runTimeBasedLiveCam(targetNum, handleSpinFinished);

        // 3. [Fail-Safe 안전 타이머 10.8초] 브라우저 백그라운드 등 어떤 예외에서도 100% 진행 보장
        setTimeout(() => {
            if (!isSpinFinished) {
                handleSpinFinished();
            }
        }, 10800);
    }

    /**
     * Three.js 3D 정밀 물리 룰렛 시뮬레이터 (마호가니 보울, 원목 림, 고해상도 번호판, 8개 디플렉터, 크롬 프렛, 3D 은구슬)
     * 확정된 당첨 번호(targetNum) 포켓에 100% 쏙 안착하는 수학적 역계산 물리 연동
     */
    runTimeBasedLiveCam(targetNum, onFinished) {
        const stage = document.getElementById('live-cam-3d-stage');
        const viewport = document.getElementById('live-cam-viewport');

        // Three.js 라이브러리 가용성 체크 (누락 시 안전 방어)
        if (!window.THREE || !stage || !viewport) {
            console.warn("Three.js not available, falling back.");
            if (onFinished) onFinished();
            return;
        }

        // 기존 3D 렌더러 엘리먼트 초기화
        stage.innerHTML = '';
        if (this.liveCamAnimId) cancelAnimationFrame(this.liveCamAnimId);

        const width = viewport.clientWidth || 760;
        const height = viewport.clientHeight || 540;

        // ---------- 1. 아메리칸/유러피언 38개 번호판 휠 데이터 ----------
        const ORDER = ['0','28','9','26','30','11','7','20','32','17','5','22','34','15','3','24','36','13','1',
                       '00','27','10','25','29','12','8','19','31','18','6','21','33','16','4','23','35','14','2'];
        const N = ORDER.length, STEP = (Math.PI * 2) / N;
        const REDS = new Set(['1','3','5','7','9','12','14','16','18','19','21','23','25','27','30','32','34','36']);
        const colorOf = n => (n === '0' || n === '00') ? 'green' : REDS.has(n) ? 'red' : 'black';
        const HEX = { red: '#b8262e', black: '#1b1716', green: '#1f6b45' };
        const FONT = '"Bodoni Moda","Outfit","Didot",sans-serif';

        // 룰렛 기하학적 반경
        const R_ROTOR = 1.01, R_NUM_IN = 0.86, R_POCKET_IN = 0.66, R_POCKET = 0.765, R_ENTRY = 0.95;
        const R_TRACK = 1.385, BR = 0.032;

        const surf = (r) => {
            if (r >= 1.15) return 0.15 + (r - 1.15) * 0.16;
            if (r >= 1.02) return 0.045 + (r - 1.02) / 0.13 * 0.105;
            if (r >= 0.87) return 0.045;
            if (r >= 0.85) return 0.045 * (r - 0.85) / 0.02;
            return 0;
        };

        // ---------- 2. 물리 궤적 타임라인 상수 ----------
        const T1 = 4.2, T2 = 5.4, T3 = 7.2, D3 = T3 - T2, TOTAL_SHOW = T3 + 3.0; // 7.2초 안착 후 3.0초간 결과 감상
        const ROT_A = 0.55, ROT_B = 1.85, ROT_K = 0.22;
        const WB0 = 12, WB1 = 3.4, M = Math.log(WB0 / WB1) / T1;
        let W0 = 0, B0 = 0;

        const rotorW = t => W0 + ROT_A * t + (ROT_B / ROT_K) * (1 - Math.exp(-ROT_K * t));
        const rotorOmega = t => ROT_A + ROT_B * Math.exp(-ROT_K * t);
        const ballFree = (t, b0) => b0 - (WB0 / M) * (1 - Math.exp(-M * t));
        const ballOmega = t => -WB0 * Math.exp(-M * t);
        const clamp01 = x => Math.max(0, Math.min(1, x));

        // 구슬 발사각 b0에 대해 구슬이 최종 안착할 상대 각도 역계산
        const settleRel = (b0) => {
            const rel2 = ballFree(T2, b0) - rotorW(T2);
            const delta = (ballOmega(T2) - rotorOmega(T2)) * D3 / 2;
            return { rel2, delta, final: rel2 + delta };
        };

        const ballState = (t) => {
            if (t <= T1) {
                // 1구간 (0.0s ~ 4.2s): 외곽 림 트랙 고속 회전
                const r = R_TRACK + 0.003 * Math.sin(t * 37);
                return { a: ballFree(t, B0), r, y: surf(r) + BR };
            }
            if (t <= T2) {
                // 2구간 (4.2s ~ 5.4s): 감속 및 디플렉터 충돌
                const s = (t - T1) / (T2 - T1);
                const r = R_TRACK + (R_ENTRY - R_TRACK) * s * s;
                const h = clamp01((s - 0.62) / 0.22);
                return { a: ballFree(t, B0) + 0.05 * Math.sin(Math.PI * h), r, y: surf(r) + BR + 0.06 * Math.sin(Math.PI * h) };
            }
            const { rel2, delta, final } = settleRel(B0);
            if (t <= T3) {
                // 3구간 (5.4s ~ 7.2s): 포켓 프렛 바운스
                const s = (t - T2) / D3, e = (1 - s) * (1 - s);
                const rel = rel2 + delta * (1 - e) + 0.10 * Math.sin(4 * Math.PI * s) * e;
                const r = R_POCKET + (R_ENTRY - R_POCKET) * e + 0.05 * Math.sin(5 * Math.PI * s) * e;
                const hop = 0.09 * Math.abs(Math.sin(3.5 * Math.PI * s)) * Math.pow(1 - s, 1.5);
                return { a: rotorW(t) + rel, r, y: surf(r) + BR + hop };
            }
            // 4구간 (7.2s ~ 10.2s): 포켓 완전 안착
            return { a: rotorW(t) + final, r: R_POCKET, y: BR };
        };

        // [핵심 역계산 알고리즘]: 지정한 target 포켓 홈에 100% 쏙 안착하도록 초기 방출 각도 B0 역산출!
        const targetStr = String(targetNum);
        let targetIdx = ORDER.indexOf(targetStr);
        if (targetIdx === -1) targetIdx = 0;
        W0 = 0;
        B0 = targetIdx * STEP - settleRel(0).final;

        // ---------- 3. Three.js 씬 구축 ----------
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        stage.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 50);
        // 영화 같은 프리미엄 카지노 쿼터뷰 각도
        camera.position.set(0, 3.4, 3.8);
        camera.lookAt(0, 0.08, 0.15);

        // 환경 조명
        scene.add(new THREE.HemisphereLight(0xfff1dc, 0x1a0e08, 0.55));
        const spot = new THREE.SpotLight(0xfff0d8, 1.8, 0, 0.55, 0.6, 1);
        spot.position.set(1.4, 5.2, 2.2);
        spot.castShadow = true;
        spot.shadow.mapSize.set(1024, 1024);
        scene.add(spot, spot.target);

        const warm = new THREE.PointLight(0xffb066, 0.4);
        warm.position.set(-3, 2, -2.5);
        scene.add(warm);

        // 텍스처 생성기
        const woodTexture = (base, grain, repeat) => {
            const c = document.createElement('canvas'); c.width = c.height = 512;
            const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
            for (let i = 0; i < 260; i++) {
                const x = Math.random() * 512; g.strokeStyle = grain; g.globalAlpha = 0.05 + Math.random() * 0.22;
                g.lineWidth = 0.5 + Math.random() * 2.4; g.beginPath(); g.moveTo(x, 0);
                for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 3, y);
                g.stroke();
            }
            const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
            t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, 1); return t;
        };

        const shade = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');

        const wheelTexture = () => {
            const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
            const g = c.getContext('2d'), k = S / 2 / R_ROTOR; g.translate(S / 2, S / 2);
            g.fillStyle = '#120d0b'; g.beginPath(); g.arc(0, 0, S / 2, 0, Math.PI * 2); g.fill();
            ORDER.forEach((n, i) => {
                const th = i * STEP, a0 = -th - STEP / 2, a1 = -th + STEP / 2, col = HEX[colorOf(n)];
                g.beginPath(); g.arc(0, 0, R_ROTOR * k, a0, a1); g.arc(0, 0, R_NUM_IN * k, a1, a0, true); g.closePath();
                g.fillStyle = col; g.fill();
                g.beginPath(); g.arc(0, 0, R_NUM_IN * k, a0, a1); g.arc(0, 0, R_POCKET_IN * k, a1, a0, true); g.closePath();
                g.fillStyle = shade(col, 0.62); g.fill();
                g.save(); g.rotate(a0); g.strokeStyle = '#d2a84f'; g.lineWidth = 4;
                g.beginPath(); g.moveTo(R_NUM_IN * k, 0); g.lineTo(R_ROTOR * k, 0); g.stroke(); g.restore();
                g.save(); g.rotate(-th); g.translate(0.935 * k, 0); g.rotate(Math.PI / 2);
                g.fillStyle = '#f6ecd8'; g.font = `700 ${n.length > 1 ? 74 : 84}px ${FONT}`;
                g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 0, 6); g.restore();
            });
            g.strokeStyle = '#d2a84f'; g.lineWidth = 7;
            [R_NUM_IN, R_ROTOR - 0.004].forEach(r => { g.beginPath(); g.arc(0, 0, r * k, 0, Math.PI * 2); g.stroke(); });
            const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
            return t;
        };

        const ringGeo = (rin, rout, a0 = 0, len = Math.PI * 2) => {
            const geo = new THREE.RingGeometry(rin, rout, Math.max(8, Math.round(N * 6 * len / (Math.PI * 2))), 1, a0, len);
            const p = geo.attributes.position, uv = geo.attributes.uv;
            for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / R_ROTOR + 1) / 2, (p.getY(i) / R_ROTOR + 1) / 2);
            geo.rotateX(-Math.PI / 2); return geo;
        };

        const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.28 });
        const chrome = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.16 });
        const darkWood = new THREE.MeshStandardMaterial({ map: woodTexture('#2e160c', '#0e0502', 10), roughness: 0.3, envMapIntensity: 0.6, side: THREE.DoubleSide });
        const lightWood = new THREE.MeshStandardMaterial({ map: woodTexture('#5a2a12', '#1e0a03', 14), roughness: 0.38, envMapIntensity: 0.5, side: THREE.DoubleSide });
        const coneWood = new THREE.MeshStandardMaterial({ map: woodTexture('#55290f', '#1c0902', 8), roughness: 0.34, envMapIntensity: 0.6, side: THREE.DoubleSide });

        // 고정 보울 (Bowl)
        const lathe = (pts, mat) => {
            const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 128), mat);
            m.receiveShadow = true; m.castShadow = true; scene.add(m); return m;
        };
        lathe([[1.02, 0.035], [1.15, 0.15], [1.40, 0.19], [1.42, 0.19]], darkWood);
        lathe([[1.42, 0.19], [1.425, 0.30], [1.47, 0.345], [1.58, 0.35], [1.64, 0.31], [1.66, 0.2], [1.66, -0.26]], lightWood);

        // 8개 황동 다이아몬드 디플렉터
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4 + Math.PI / 8, r = 1.09;
            const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), brass);
            d.scale.set(i % 2 ? 0.8 : 2.2, 0.55, i % 2 ? 2.2 : 0.8);
            d.position.set(r * Math.cos(a), surf(r) + 0.01, -r * Math.sin(a)); d.rotation.y = a; d.castShadow = true; scene.add(d);
        }

        // 회전 로터 (Rotor)
        const rotor = new THREE.Group(); scene.add(rotor);
        const wheelMat = new THREE.MeshStandardMaterial({ map: wheelTexture(), roughness: 0.42, metalness: 0.05, envMapIntensity: 0.5 });
        const numRing = new THREE.Mesh(ringGeo(R_NUM_IN, R_ROTOR), wheelMat); numRing.position.y = 0.04;
        const floorRing = new THREE.Mesh(ringGeo(R_POCKET_IN, R_NUM_IN), wheelMat);
        numRing.receiveShadow = floorRing.receiveShadow = true; rotor.add(numRing, floorRing);

        const cyl = (r, h, y, mat) => {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 128, 1, true), mat);
            m.position.y = y; m.receiveShadow = true; rotor.add(m); return m;
        };
        cyl(R_ROTOR, 0.11, -0.015, brass);
        cyl(R_NUM_IN, 0.04, 0.02, new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.6, side: THREE.DoubleSide }));
        cyl(R_POCKET_IN, 0.07, 0.035, chrome);

        // 포켓 프렛 (Fret)
        const fretGeo = new THREE.BoxGeometry(R_NUM_IN + 0.012 - R_POCKET_IN, 0.05, 0.009);
        for (let i = 0; i < N; i++) {
            const a = i * STEP + STEP / 2, r = (R_NUM_IN + 0.012 + R_POCKET_IN) / 2;
            const f = new THREE.Mesh(fretGeo, chrome);
            f.position.set(r * Math.cos(a), 0.025, -r * Math.sin(a)); f.rotation.y = a; f.castShadow = true; rotor.add(f);
        }

        // 중앙 원뿔 콘 및 터렛
        const cone = new THREE.Mesh(new THREE.LatheGeometry(
            [[0.66, 0.07], [0.52, 0.1], [0.34, 0.15], [0.16, 0.19], [0.001, 0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 64), coneWood);
        cone.receiveShadow = true; rotor.add(cone);
        const coneTrim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.008, 8, 128), brass);
        coneTrim.rotation.x = Math.PI / 2; coneTrim.position.y = 0.07; rotor.add(coneTrim);

        const turret = new THREE.Group(); rotor.add(turret);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.16, 32), brass); post.position.y = 0.27;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), brass); cap.position.y = 0.39;
        turret.add(post, cap);
        for (let i = 0; i < 2; i++) {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.36, 16), brass);
            arm.rotation.z = Math.PI / 2; arm.rotation.y = i * Math.PI / 2; arm.position.y = 0.335; turret.add(arm);
        }

        // 당첨 포켓 하이라이트 마커
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const markerTh = targetIdx * STEP;
        const marker = new THREE.Mesh(ringGeo(R_POCKET_IN + 0.01, R_ROTOR - 0.01, markerTh - STEP / 2, STEP), markerMat);
        marker.position.y = 0.047; rotor.add(marker);

        // 3D 은구슬
        const ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 32, 24),
            new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.12, metalness: 0.95 }));
        ball.castShadow = true; scene.add(ball);

        // ---------- 4. 애니메이션 루프 및 서스펜스 뱃지 연동 ----------
        const startTime = performance.now();
        let bouncePlayed = false;
        let lockOnShown = false;
        let finalStoppedW = null;

        const statusText = document.getElementById('live-cam-status-text');
        const winBadge = document.getElementById('live-cam-win-badge');
        const winNumEl = document.getElementById('live-cam-win-num');
        const winLabelEl = document.querySelector('.cam-win-label');

        // 스핀 시작 시 ? 물음표 펄스 뱃지 표출
        if (winBadge) {
            winBadge.classList.remove('hidden');
            winBadge.classList.remove('badge-revealed');
            winBadge.classList.add('pending-question');
        }
        if (winNumEl) {
            winNumEl.textContent = '?';
            winNumEl.className = 'cam-win-num pending-num';
        }
        if (winLabelEl) winLabelEl.textContent = 'ROULETTE SPINNING...';
        if (statusText) statusText.textContent = "🔴 LIVE CASINO: Three.js 3D 룰렛 휠과 구슬이 고속 회전하고 있습니다...";

        const renderFrame = (now) => {
            const elapsed = (now - startTime) / 1000;

            let W = 0;
            let bs = null;

            if (elapsed < T1) {
                // 1구간 (0.0s ~ 4.2s): 볼 고속 스핀
                W = rotorW(elapsed);
                bs = ballState(elapsed);
            } else if (elapsed < T2) {
                // 2구간 (4.2s ~ 5.4s): 감속 및 디플렉터 충돌 낙하
                W = rotorW(elapsed);
                bs = ballState(elapsed);
                if (!bouncePlayed) {
                    bouncePlayed = true;
                    if (statusText) statusText.textContent = "🟡 BALL DROPPING: 구슬이 디플렉터에 부딪히며 포켓으로 낙하 중...";
                    if (window.rouletteAudio && window.rouletteAudio.playBounce) window.rouletteAudio.playBounce();
                }
            } else if (elapsed < T3) {
                // 3구간 (5.4s ~ 7.2s): 포켓 프렛 바운스
                W = rotorW(elapsed);
                bs = ballState(elapsed);
            } else {
                // 4구간 (7.2s ~ 10.2s, 3.0초간): 당첨 번호 포켓에 100% 쏙 안착 & 결과 노출!
                if (finalStoppedW === null) finalStoppedW = rotorW(T3);
                W = finalStoppedW;
                bs = ballState(T3 + 0.1);

                if (!lockOnShown) {
                    lockOnShown = true;
                    const color = window.rouletteWheel ? window.rouletteWheel.getNumberColor(targetNum) : 'red';

                    // ? => 당첨번호로 스케일 팝업 전환
                    if (winNumEl) {
                        winNumEl.textContent = targetNum;
                        winNumEl.className = `cam-win-num color-${color}`;
                    }
                    if (winLabelEl) winLabelEl.textContent = 'BALL DROP WINNER';
                    if (winBadge) {
                        winBadge.classList.remove('pending-question');
                        winBadge.classList.add('badge-revealed');
                        winBadge.classList.remove('hidden');
                    }
                    if (statusText) statusText.textContent = `🎯 당첨 번호 #${targetNum} 3D 포켓 안착 확정! (3초간 결과 노출)`;
                    if (window.rouletteAudio && window.rouletteAudio.playDrop) window.rouletteAudio.playDrop();
                }

                markerMat.opacity = 0.5 + 0.3 * Math.sin((elapsed - T3) * 6);
            }

            rotor.rotation.y = W;
            ball.position.set(bs.r * Math.cos(bs.a), bs.y, -bs.r * Math.sin(bs.a));

            renderer.render(scene, camera);

            if (elapsed < TOTAL_SHOW) {
                this.liveCamAnimId = requestAnimationFrame(renderFrame);
            } else {
                // 10.2초 완료 후 정산 화면으로 자연스럽게 전환
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
                    try {
                        if (typeof window.rouletteAudio.playWinCoinSound === 'function') {
                            window.rouletteAudio.playWinCoinSound();
                        } else if (typeof window.rouletteAudio.playWinSound === 'function') {
                            window.rouletteAudio.playWinSound();
                        }
                        if (typeof window.rouletteAudio.announceWin === 'function') {
                            window.rouletteAudio.announceWin();
                        }
                    } catch (e) {
                        console.warn("Win audio error:", e);
                    }
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
     * 타이머 UI 업데이트 (상단 배너 및 테이블 0번 위 실시간 초록색 게이지 바 동기화)
     */
    updateTimerDisplay(seconds) {
        const timerEl = document.getElementById('phase-timer');
        if (timerEl) {
            timerEl.textContent = `${seconds}s`;
        }

        // 테이블 0번 바로 위 초록색 배팅 시간 게이지 바 실시간 연동 (20s -> 6s, 4s 줄어듦)
        const gaugeContainer = document.getElementById('table-bet-timer-gauge-container');
        const gaugeProgress = document.getElementById('table-bet-timer-progress');
        const gaugeNum = document.getElementById('table-timer-gauge-num');

        if (gaugeNum) {
            gaugeNum.textContent = `${seconds}s`;
        }

        if (gaugeProgress) {
            const pct = Math.max(0, Math.min(100, (seconds / 20) * 100));
            gaugeProgress.style.width = `${pct}%`;
        }

        if (gaugeContainer) {
            if (seconds <= 5 && seconds > 0) {
                gaugeContainer.classList.add('gauge-warning');
            } else {
                gaugeContainer.classList.remove('gauge-warning');
            }
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
