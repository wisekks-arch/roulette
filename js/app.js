/**
 * 🎡 최고급 전통 카지노 룰렛 메인 게임 컨트롤러
 * 전체 게임 루프, 베팅 페이즈, 노 모어 벳, 스핀, 배당 판정 및 UI 반응형 총괄
 */

class RouletteApp {
    constructor() {
        this.balance = 10000000; // 초기 무료 머니: 1,000만 원
        this.currentPhase = 'BETTING'; // 'BETTING', 'NO_MORE_BETS', 'SPINNING', 'RESULT'
        this.timerSeconds = 20;
        this.timerInterval = null;
        this.autoSpinTimer = null;
        this.isLiveVideoMode = true; // 기본값: 실사 카지노 영상 모드 ON

        this.init();
    }

    /**
     * 메인 앱 초기화
     */
    init() {
        // 테이블 인스턴스 생성
        window.rouletteTable = new RouletteTable('roulette-table-mount');

        // 휠 인스턴스 생성
        window.rouletteWheel = new RouletteWheel('roulette-wheel-canvas');

        // 초기 UI 렌더링
        this.updateBalanceDisplay();
        this.updateBetDisplay();
        this.attachControlEvents();

        // 첫 입장 시 1번 룸으로 진입
        if (window.rouletteLobby) {
            window.rouletteLobby.enterRoom(1);
        }

        // 첫 베팅 라운드 시작
        this.startBettingPhase();
    }

    /**
     * 컨트롤 버튼 이벤트 바인딩
     */
    attachControlEvents() {
        // 1. 칩 선택 버튼들
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

        // 2. 스핀 버튼 (즉시 스핀)
        const spinBtn = document.getElementById('btn-spin');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => {
                if (this.currentPhase === 'BETTING') {
                    this.triggerSpin();
                }
            });
        }

        // 3. 베팅 취소 버튼 (Clear)
        const clearBtn = document.getElementById('btn-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.currentPhase === 'BETTING' && window.rouletteTable) {
                    window.rouletteTable.clearBets();
                }
            });
        }

        // 4. 재베팅 버튼 (Rebet)
        const rebetBtn = document.getElementById('btn-rebet');
        if (rebetBtn) {
            rebetBtn.addEventListener('click', () => {
                if (this.currentPhase === 'BETTING' && window.rouletteTable) {
                    window.rouletteTable.rebet();
                }
            });
        }

        // 5. 2배 베팅 버튼 (Double)
        const doubleBtn = document.getElementById('btn-double');
        if (doubleBtn) {
            doubleBtn.addEventListener('click', () => {
                if (this.currentPhase === 'BETTING' && window.rouletteTable) {
                    window.rouletteTable.doubleBets();
                }
            });
        }

        // 6. 로비 버튼
        const lobbyBtn = document.getElementById('btn-open-lobby');
        if (lobbyBtn) {
            lobbyBtn.addEventListener('click', () => {
                const lobbyModal = document.getElementById('lobby-modal');
                if (lobbyModal) {
                    lobbyModal.classList.remove('hidden');
                }
            });
        }

        const closeLobbyBtn = document.getElementById('btn-close-lobby');
        if (closeLobbyBtn) {
            closeLobbyBtn.addEventListener('click', () => {
                const lobbyModal = document.getElementById('lobby-modal');
                if (lobbyModal) {
                    lobbyModal.classList.add('hidden');
                }
            });
        }

        // 7. 사운드 토글
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

        // 8. 무료 충전 버튼
        const refillBtn = document.getElementById('btn-refill-balance');
        if (refillBtn) {
            refillBtn.addEventListener('click', () => {
                this.addBalance(10000000);
                this.showToast("머니 10,000,000원이 무료 충전되었습니다!");
                if (window.rouletteAudio) {
                    window.rouletteAudio.playChipSound();
                }
            });
        }

        // 9. 실사 영상 / 3D 그래픽 뷰모드 토글
        const viewModeBtn = document.getElementById('btn-toggle-viewmode');
        if (viewModeBtn) {
            viewModeBtn.addEventListener('click', () => {
                this.isLiveVideoMode = !this.isLiveVideoMode;
                viewModeBtn.textContent = this.isLiveVideoMode ? '🎬 실사 영상 ON' : '🎨 3D 그래픽 ON';
                this.showToast(this.isLiveVideoMode ? "실제 카지노 라이브 영상 모드가 켜졌습니다." : "3D 그래픽 캔버스 모드가 켜졌습니다.");
                const videoLayer = document.getElementById('live-video-layer');
                if (videoLayer && !this.isLiveVideoMode) {
                    videoLayer.classList.add('hidden');
                }
            });
        }
    }

    /**
     * 룸 변경 시 처리
     */
    onRoomChanged(room) {
        if (window.rouletteTable) {
            window.rouletteTable.clearBets();
        }
        this.showToast(`[${room.name}] 테이블에 입장하셨습니다.`);
        this.startBettingPhase();
    }

    /**
     * 베팅 페이즈 시작 (Place your bets)
     */
    startBettingPhase() {
        this.currentPhase = 'BETTING';
        this.timerSeconds = 20;

        // 돌리 핀 제거 및 휠 당첨 배너 숨김
        if (window.rouletteTable) {
            window.rouletteTable.removeDolly();
            window.rouletteTable.setLocked(false);
        }
        const wheelBanner = document.getElementById('wheel-win-banner');
        if (wheelBanner) {
            wheelBanner.classList.add('hidden');
        }

        // 안내 상태바 업데이트
        this.updatePhaseStatus("🎲 베팅을 진행해 주세요 (Place your bets)", "betting");

        // 음성 안내
        if (window.rouletteAudio) {
            window.rouletteAudio.announcePlaceBets();
        }

        // 가상 AI 플레이어들의 베팅 시뮬레이션
        if (window.rouletteLobby) {
            window.rouletteLobby.simulateAiBets();
        }

        // 카운트다운 타이머 시작
        this.startTimer();
    }

    /**
     * 카운트다운 타이머
     */
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        const timerEl = document.getElementById('phase-timer');
        if (timerEl) timerEl.textContent = `${this.timerSeconds}s`;

        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            if (timerEl) timerEl.textContent = `${this.timerSeconds}s`;

            if (this.timerSeconds <= 0) {
                clearInterval(this.timerInterval);
                this.triggerSpin();
            }
        }, 1000);
    }

    /**
     * 스핀 개시: 노 모어 벳 선언 및 휠 회전
     */
    triggerSpin() {
        if (this.currentPhase !== 'BETTING') return;
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.currentPhase = 'NO_MORE_BETS';

        // 베팅 잠금
        if (window.rouletteTable) {
            window.rouletteTable.setLocked(true);
        }

        // "노 모어 벳 (No more bets)" 안내
        this.updatePhaseStatus("⛔ 노 모어 벳! 배팅 마감 (No more bets)", "nomorebets");

        if (window.rouletteAudio) {
            window.rouletteAudio.announceNoMoreBets();
        }

        // 1초 후 휠 스핀 실행
        setTimeout(() => {
            this.executeSpin();
        }, 1200);
    }

    /**
     * 실제 물리 휠 스핀 및 결과 판정 (최소 20초 실감 물리 회전)
     */
    executeSpin() {
        this.currentPhase = 'SPINNING';
        this.updatePhaseStatus("🎡 휠 회전 중... 결과 추첨 (Spinning)", "spinning");

        // 0부터 36까지 공정한 무작위 당첨 번호 추첨 (유러피언 룰렛)
        const winningNumber = Math.floor(Math.random() * 37);

        // 스핀 진행 20초 카운트다운 표시
        let spinSeconds = 20;
        const timerEl = document.getElementById('phase-timer');
        if (timerEl) timerEl.textContent = `${spinSeconds}s`;

        const spinInterval = setInterval(() => {
            spinSeconds--;
            if (timerEl && spinSeconds >= 0) {
                timerEl.textContent = `${spinSeconds}s`;
            }
            if (spinSeconds <= 0) {
                clearInterval(spinInterval);
            }
        }, 1000);

        // 20초 이상 지속되는 Canvas 3D 룰렛 휠 물리 시뮬레이션 실행
        if (window.rouletteWheel) {
            window.rouletteWheel.spin(winningNumber, (finalNumber) => {
                clearInterval(spinInterval);
                this.onSpinFinished(finalNumber);
            });
        }
    }

    /**
     * 구슬 안착 완료 시 호출 (결과 발표 및 배당 정산)
     */
    onSpinFinished(winningNumber) {
        this.currentPhase = 'RESULT';

        const color = window.rouletteWheel ? window.rouletteWheel.getNumberColor(winningNumber) : 'green';
        const colorKor = color === 'red' ? '빨강(Red)' : (color === 'black' ? '검정(Black)' : '초록(Zero)');

        // 상태 배너 업데이트
        this.updatePhaseStatus(`🎯 당첨 번호: [ ${winningNumber} ] ${colorKor}`, "result");

        // 휠 상단 실시간 당첨 번호 3D 오버레이 뱃지 표시
        const wheelBanner = document.getElementById('wheel-win-banner');
        const badgeNum = document.getElementById('wheel-badge-number');
        const badgeDesc = document.getElementById('wheel-badge-desc');
        if (wheelBanner && badgeNum && badgeDesc) {
            badgeNum.textContent = winningNumber;
            badgeNum.className = `win-banner-badge badge-${color}-text`;
            badgeDesc.textContent = colorKor;
            wheelBanner.classList.remove('hidden');
        }

        // 1. 여성 딜러 목소리로 당첨 번호 낭독
        if (window.rouletteAudio) {
            window.rouletteAudio.announceResult(winningNumber, color);
        }

        // 2. 베팅 테이블의 당첨 번호 위에 크리스탈 말머리 돌리(Dolly) 핀 세우기
        if (window.rouletteTable) {
            window.rouletteTable.placeDolly(winningNumber);
        }

        // 3. 구슬이 떨어지고 돌리 핀이 꽂힌 후: 낙첨된 칩 모두 회수(스위핑)하고 당첨된 번호 칩만 남기기
        setTimeout(() => {
            if (window.rouletteTable) {
                window.rouletteTable.sweepLosingBets(winningNumber);
            }
        }, 800);

        // 4. 최근 히스토리 기록
        if (window.rouletteLobby) {
            window.rouletteLobby.recordWinningNumber(winningNumber);
            window.rouletteLobby.evaluateAiWins(winningNumber);
        }

        // 5. 배당금 정산 및 당첨 축하 연출 (스위핑 완료 후 당첨 칩만 남은 상태에서 진행)
        setTimeout(() => {
            this.settlePayouts(winningNumber);
        }, 1500);
    }

    /**
     * 배당금 정산 및 축하 연출
     */
    settlePayouts(winningNumber) {
        if (!window.rouletteTable) return;

        const { totalPayout, winningBets } = window.rouletteTable.calculatePayout(winningNumber);

        if (totalPayout > 0) {
            // 플레이어 당첨!
            this.addBalance(totalPayout);
            if (window.rouletteAudio) {
                window.rouletteAudio.playWinSound();
                setTimeout(() => window.rouletteAudio.announceWin(), 600);
            }
            setTimeout(() => {
                this.showWinModal(winningNumber, totalPayout, winningBets);
            }, 800);
        }

        this.updateBetDisplay();

        // 7초 후 다음 라운드 자동 시작
        setTimeout(() => {
            this.hideWinModal();
            this.startBettingPhase();
        }, 7000);
    }

    /**
     * 승리 축하 모달 표시
     */
    showWinModal(number, payout, bets = []) {
        const modal = document.getElementById('win-celebration-modal');
        const amountEl = document.getElementById('win-amount-text');
        const numberEl = document.getElementById('win-number-badge');
        const detailEl = document.getElementById('win-bets-detail');

        if (modal && amountEl && numberEl) {
            const color = window.rouletteWheel ? window.rouletteWheel.getNumberColor(number) : 'green';
            numberEl.textContent = number;
            numberEl.className = `win-badge badge-${color}`;
            amountEl.textContent = `+₩ ${payout.toLocaleString()}`;

            if (detailEl && bets && bets.length > 0) {
                let detailHtml = '<div class="win-detail-title">적중 배팅 내역</div><div class="win-detail-items">';
                bets.forEach(b => {
                    const typeName = b.typeName || b.type;
                    detailHtml += `
                        <div class="win-detail-item">
                            <span class="detail-name">${typeName}</span>
                            <span class="detail-val">+₩ ${b.payout.toLocaleString()}</span>
                        </div>
                    `;
                });
                detailHtml += '</div>';
                detailEl.innerHTML = detailHtml;
            } else if (detailEl) {
                detailEl.innerHTML = '';
            }

            modal.classList.remove('hidden');
        }
    }

    /**
     * 승리 모달 숨김
     */
    hideWinModal() {
        const modal = document.getElementById('win-celebration-modal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * 안내 상태 바 텍스트 업데이트
     */
    updatePhaseStatus(msg, className) {
        const statusEl = document.getElementById('status-message-text');
        const bannerEl = document.getElementById('announcement-banner');
        if (statusEl) statusEl.textContent = msg;
        if (bannerEl) {
            bannerEl.className = `announcement-banner banner-${className}`;
        }
    }

    /**
     * 보유 잔고 차감
     */
    deductBalance(amount) {
        this.balance = Math.max(0, this.balance - amount);
        this.updateBalanceDisplay();
    }

    /**
     * 보유 잔고 추가
     */
    addBalance(amount) {
        this.balance += amount;
        this.updateBalanceDisplay();
    }

    /**
     * 보유 잔고 UI 표시
     */
    updateBalanceDisplay() {
        const el = document.getElementById('user-balance-text');
        if (el) el.textContent = `₩ ${this.balance.toLocaleString()}`;
    }

    /**
     * 현재 총 배팅액 UI 표시
     */
    updateBetDisplay() {
        const total = window.rouletteTable ? window.rouletteTable.totalBetAmount : 0;
        const el = document.getElementById('user-bet-text');
        if (el) el.textContent = `₩ ${total.toLocaleString()}`;
    }

    /**
     * 화면 상단 간단 토스트 알림
     */
    showToast(msg) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// DOM 준비 시 앱 초기화
window.addEventListener('DOMContentLoaded', () => {
    window.rouletteApp = new RouletteApp();
});
