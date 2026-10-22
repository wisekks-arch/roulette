/**
 * 🎡 최고급 전통 카지노 룰렛 베팅 테이블 & 배당/돌리(Dolly) 핀 엔진
 * 전통 펠트 다이 인터랙션, 칩 배치, 정통 배당률 계산 및 황동 마커 세우기 연출
 */

class RouletteTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.selectedChip = 10000; // 기본 선택 칩: 10,000원
        this.bets = {};            // { betKey: { type, numbers, amount, chips: [...] } }
        this.botBets = {};         // { spotId: [ { bot, amount } ] } - 다른 플레이어(AI 봇)들의 테이블 배팅
        this.totalBetAmount = 0;
        this.lastBets = null;      // 재베팅(Rebet)용 직전 기록
        this.dollyElement = null;  // 당첨 번호에 세워지는 황동 마커
        this.isLocked = false;     // 노 모어 벳 상태에서 베팅 잠금

        // 번호 색상 맵
        this.redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        this.blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

        this.renderTable();
    }

    /**
     * 카지노 전통 펠트 그린 룰렛 다이 테이블 HTML 렌더링
     */
    renderTable() {
        if (!this.container) return;

        let html = `
            <div class="roulette-felt-table">
                <!-- 상단 0 (그린 싱글 제로) -->
                <div class="table-zero-area">
                    <button class="bet-spot spot-zero" data-bet="straight" data-numbers="0" id="spot-0">
                        <span class="num-text">0</span>
                        <div class="chip-stack" id="chips-0"></div>
                    </button>
                </div>

                <!-- 메인 36개 숫자 그리드 (3열 x 12행) -->
                <div class="table-grid-area">
                    <div class="table-numbers-grid">
        `;

        // 룰렛 테이블 표준 열 배열: 
        // 행 1: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
        // 행 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
        // 행 3: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
        for (let col = 1; col <= 12; col++) {
            const n1 = col * 3;
            const n2 = col * 3 - 1;
            const n3 = col * 3 - 2;

            html += `<div class="table-column-group">`;
            [n1, n2, n3].forEach(n => {
                const isRed = this.redNumbers.includes(n);
                const colorClass = isRed ? 'spot-red' : 'spot-black';
                html += `
                    <button class="bet-spot spot-number ${colorClass}" data-bet="straight" data-numbers="${n}" id="spot-${n}">
                        <span class="num-text">${n}</span>
                        <div class="chip-stack" id="chips-${n}"></div>
                    </button>
                `;
            });
            html += `</div>`;
        }

        html += `
                    </div>

                    <!-- 컬럼 배팅 (2 to 1 세로 3구역) -->
                    <div class="table-columns-bet">
                        <button class="bet-spot spot-outside spot-col" data-bet="column" data-numbers="col3" id="spot-col3">
                            <span>2 to 1</span>
                            <div class="chip-stack" id="chips-col3"></div>
                        </button>
                        <button class="bet-spot spot-outside spot-col" data-bet="column" data-numbers="col2" id="spot-col2">
                            <span>2 to 1</span>
                            <div class="chip-stack" id="chips-col2"></div>
                        </button>
                        <button class="bet-spot spot-outside spot-col" data-bet="column" data-numbers="col1" id="spot-col1">
                            <span>2 to 1</span>
                            <div class="chip-stack" id="chips-col1"></div>
                        </button>
                    </div>
                </div>

                <!-- 다즌 배팅 (1st 12, 2nd 12, 3rd 12) -->
                <div class="table-dozens-area">
                    <button class="bet-spot spot-outside spot-dozen" data-bet="dozen" data-numbers="1-12" id="spot-dozen1">
                        <span>1st 12</span>
                        <div class="chip-stack" id="chips-dozen1"></div>
                    </button>
                    <button class="bet-spot spot-outside spot-dozen" data-bet="dozen" data-numbers="13-24" id="spot-dozen2">
                        <span>2nd 12</span>
                        <div class="chip-stack" id="chips-dozen2"></div>
                    </button>
                    <button class="bet-spot spot-outside spot-dozen" data-bet="dozen" data-numbers="25-36" id="spot-dozen3">
                        <span>3rd 12</span>
                        <div class="chip-stack" id="chips-dozen3"></div>
                    </button>
                </div>

                <!-- 외부 1:1 배팅 (1-18, EVEN, RED, BLACK, ODD, 19-36) -->
                <div class="table-outside-area">
                    <button class="bet-spot spot-outside spot-even-money" data-bet="low" data-numbers="1-18" id="spot-low">
                        <span>1 to 18</span>
                        <div class="chip-stack" id="chips-low"></div>
                    </button>
                    <button class="bet-spot spot-outside spot-even-money" data-bet="even" data-numbers="even" id="spot-even">
                        <span>EVEN</span>
                        <div class="chip-stack" id="chips-even"></div>
                    </button>
                    <button class="bet-spot spot-outside spot-color-red" data-bet="red" data-numbers="red" id="spot-red">
                        <span class="diamond red-diamond">♦ RED</span>
                        <div class="chip-stack" id="chips-red"></div>
                    </button>
                    <button class="bet-spot spot-outside spot-color-black" data-bet="black" data-numbers="black" id="spot-black">
                        <span class="diamond black-diamond">♠ BLACK</span>
                        <div class="chip-stack" id="chips-black"></div>
                    </button>
                    <button class="bet-spot spot-outside spot-even-money" data-bet="odd" data-numbers="odd" id="spot-odd">
                        <span>ODD</span>
                        <div class="chip-stack" id="chips-odd"></div>
                    </button>
                    <button class="bet-spot spot-outside spot-even-money" data-bet="high" data-numbers="19-36" id="spot-high">
                        <span>19 to 36</span>
                        <div class="chip-stack" id="chips-high"></div>
                    </button>
                </div>

                <!-- 당첨 번호에 꽂히는 최고급 크리스탈 유리 말머리(Knight) 돌리 마커 -->
                <div class="crystal-knight-dolly" id="brass-dolly" style="display: none;">
                    <div class="dolly-number-badge" id="dolly-num-label">0</div>
                    <div class="knight-glass-figure">
                        <svg class="horse-head-svg" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="glassLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
                                    <stop offset="35%" stop-color="#e0f4ff" stop-opacity="0.75" />
                                    <stop offset="70%" stop-color="#a6d8f5" stop-opacity="0.5" />
                                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0.9" />
                                </linearGradient>
                                <linearGradient id="glassPrismGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stop-color="#ffd700" stop-opacity="0.5" />
                                    <stop offset="50%" stop-color="#70c4ff" stop-opacity="0.4" />
                                    <stop offset="100%" stop-color="#ff7eb3" stop-opacity="0.3" />
                                </linearGradient>
                                <filter id="glassGlow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="2" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            <!-- 정교한 크리스탈 말머리 조각 실루엣 -->
                            <path d="M 28 115 C 25 95 20 70 30 50 C 35 40 45 35 48 20 C 50 12 55 5 62 8 C 65 10 65 18 64 22 C 72 23 85 30 88 42 C 90 50 85 58 75 62 C 68 65 62 68 60 75 C 57 85 62 105 68 115 Z" 
                                  fill="url(#glassLightGrad)" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" filter="url(#glassGlow)" />
                            <!-- 말 갈기 크리스탈 프리즘 각인 -->
                            <path d="M 45 22 Q 40 40 32 60 Q 25 80 27 100" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" />
                            <path d="M 40 32 L 30 38 M 36 48 L 26 54 M 32 64 L 22 70 M 30 78 L 20 84" stroke="rgba(255,255,255,0.7)" stroke-width="1.8" />
                            <!-- 말 주둥이 & 콧날 -->
                            <circle cx="82" cy="46" r="2.5" fill="#ffffff" />
                            <!-- 말 눈빛 보석 하이라이트 -->
                            <circle cx="68" cy="38" r="3" fill="#ffffff" />
                            <circle cx="68" cy="38" r="1.5" fill="#00e5ff" />
                            <!-- 내부 프리즘 굴절면 -->
                            <path d="M 46 38 C 55 42 65 48 58 72 Z" fill="url(#glassPrismGrad)" />
                        </svg>
                    </div>
                    <!-- 황동 크리스탈 접합 넥 링 -->
                    <div class="knight-brass-collar"></div>
                    <!-- 24K 순금 황동 원형 받침대 -->
                    <div class="knight-brass-pedestal"></div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.dollyElement = document.getElementById('brass-dolly');
        this.attachEvents();
    }

    /**
     * 베팅 스팟 클릭/터치 및 드래그 앤 드롭 이벤트 리스너 등록
     */
    attachEvents() {
        const spots = this.container.querySelectorAll('.bet-spot');
        spots.forEach(spot => {
            // 클릭 배팅
            spot.addEventListener('click', (e) => {
                if (this.isLocked) return;
                const betType = spot.getAttribute('data-bet');
                const numbersStr = spot.getAttribute('data-numbers');
                const spotId = spot.id;
                this.placeBet(spotId, betType, numbersStr);
            });

            // 드래그 앤 드롭 타겟 지원
            spot.addEventListener('dragover', (e) => {
                if (this.isLocked) return;
                e.preventDefault();
                spot.classList.add('drag-target-hover');
            });

            spot.addEventListener('dragleave', () => {
                spot.classList.remove('drag-target-hover');
            });

            spot.addEventListener('drop', (e) => {
                if (this.isLocked) return;
                e.preventDefault();
                spot.classList.remove('drag-target-hover');
                const draggedVal = e.dataTransfer.getData('text/plain');
                if (draggedVal) {
                    this.setSelectedChip(parseInt(draggedVal, 10));
                }
                const betType = spot.getAttribute('data-bet');
                const numbersStr = spot.getAttribute('data-numbers');
                const spotId = spot.id;
                this.placeBet(spotId, betType, numbersStr);
            });
        });

        this.setupChipDragDrop();
    }

    /**
     * 하단 칩 셀렉터 버튼들에 draggable 속성 및 dragstart 이벤트 바인딩
     */
    setupChipDragDrop() {
        const chipBtns = document.querySelectorAll('.chip-selector-btn');
        chipBtns.forEach(btn => {
            btn.setAttribute('draggable', 'true');

            btn.addEventListener('dragstart', (e) => {
                const val = btn.getAttribute('data-value');
                e.dataTransfer.setData('text/plain', val);
                btn.classList.add('dragging');
                this.setSelectedChip(parseInt(val, 10));
            });

            btn.addEventListener('dragend', () => {
                btn.classList.remove('dragging');
            });
        });
    }

    /**
     * 베팅 칩 선택 변경
     * @param {number} amount - 선택된 칩 금액
     */
    setSelectedChip(amount) {
        this.selectedChip = amount;
    }

    /**
     * 칩 배팅 수행
     */
    placeBet(spotId, betType, numbersStr) {
        if (this.isLocked) return;

        // 플레이어 보유 잔고 확인 (app에서 주입)
        if (window.rouletteApp && window.rouletteApp.balance < this.selectedChip) {
            if (window.rouletteApp.showToast) {
                window.rouletteApp.showToast("보유 잔고가 부족합니다.");
            }
            return;
        }

        // 현재 룸의 최대 베팅 한도 체크
        if (window.rouletteLobby) {
            const currentRoom = window.rouletteLobby.getCurrentRoom();
            if (currentRoom) {
                const currentSpotTotal = this.bets[spotId] ? this.bets[spotId].amount : 0;
                if (currentSpotTotal + this.selectedChip > currentRoom.maxBet) {
                    if (window.rouletteApp.showToast) {
                        window.rouletteApp.showToast(`테이블 최대 베팅 한도(${currentRoom.maxBet.toLocaleString()}원)를 초과할 수 없습니다.`);
                    }
                    return;
                }
            }
        }

        // 잔고 차감
        if (window.rouletteApp) {
            window.rouletteApp.deductBalance(this.selectedChip);
        }

        // 베팅 데이터 저장
        if (!this.bets[spotId]) {
            this.bets[spotId] = {
                spotId: spotId,
                type: betType,
                numbers: numbersStr,
                amount: 0,
                chips: []
            };
        }

        this.bets[spotId].amount += this.selectedChip;
        this.bets[spotId].chips.push(this.selectedChip);
        this.totalBetAmount += this.selectedChip;

        // 사운드 재생
        if (window.rouletteAudio) {
            window.rouletteAudio.playChipSound();
        }

        // 칩 스택 시각화 업데이트
        this.updateChipStack(spotId);

        // 총 배팅액 UI 업데이트
        if (window.rouletteApp) {
            window.rouletteApp.updateBetDisplay();
        }
    }

    /**
     * 다른 플레이어(AI 봇)들의 테이블 칩 배팅 수행
     * @param {object} bot - 봇 플레이어 객체 { id, name, avatar, chipClass, chipColor }
     * @param {string} rawTargetSpot - 배팅 목표 ('17', 'red', 'black', 'even', '1-12' 등)
     * @param {number} amount - 배팅 칩 금액
     */
    placeBotBet(bot, rawTargetSpot, amount) {
        // 스팟 ID 표준화
        let spotId = '';
        const rawStr = String(rawTargetSpot).trim();

        if (!isNaN(rawStr)) {
            spotId = `spot-${rawStr}`;
        } else if (rawStr === 'red') spotId = 'spot-red';
        else if (rawStr === 'black') spotId = 'spot-black';
        else if (rawStr === 'even') spotId = 'spot-even';
        else if (rawStr === 'odd') spotId = 'spot-odd';
        else if (rawStr === 'low' || rawStr === '1-18') spotId = 'spot-low';
        else if (rawStr === 'high' || rawStr === '19-36') spotId = 'spot-high';
        else if (rawStr === '1-12') spotId = 'spot-dozen1';
        else if (rawStr === '13-24') spotId = 'spot-dozen2';
        else if (rawStr === '25-36') spotId = 'spot-dozen3';
        else if (rawStr === 'col1') spotId = 'spot-col1';
        else if (rawStr === 'col2') spotId = 'spot-col2';
        else if (rawStr === 'col3') spotId = 'spot-col3';
        else if (rawStr.startsWith('spot-')) spotId = rawStr;
        else spotId = `spot-${rawStr}`;

        const spotEl = this.container.querySelector(`#${spotId}`);
        if (!spotEl) return;

        // 봇 배팅 데이터 기록
        if (!this.botBets[spotId]) {
            this.botBets[spotId] = [];
        }

        const existing = this.botBets[spotId].find(b => b.bot.id === bot.id);
        if (existing) {
            existing.amount += amount;
        } else {
            this.botBets[spotId].push({ bot, amount });
        }

        // 경쾌한 칩 낙하 사운드
        if (window.rouletteAudio) {
            window.rouletteAudio.playChipSound();
        }

        // 스팟 칩 스택 시각화
        this.updateChipStack(spotId);
    }

    /**
     * 해당 스팟의 칩 시각적 스택 업데이트 (유저 칩 + 다른 플레이어 봇 칩 동시 렌더링)
     */
    updateChipStack(spotId) {
        const chipContainer = this.container.querySelector(`#chips-${spotId.replace('spot-', '')}`);
        if (!chipContainer) return;

        const betInfo = this.bets[spotId];
        const userHasBet = betInfo && betInfo.amount > 0;
        const botsOnSpot = this.botBets[spotId] || [];
        const botHasBet = botsOnSpot.length > 0;

        if (!userHasBet && !botHasBet) {
            chipContainer.innerHTML = '';
            chipContainer.classList.remove('has-multiple-chips');
            return;
        }

        let html = '';

        // 1. 유저(나)의 배팅 칩 (골드/세라믹 VIP 칩)
        if (userHasBet) {
            const lastChip = betInfo.chips[betInfo.chips.length - 1];
            let chipClass = 'chip-10k';
            if (lastChip >= 500000) chipClass = 'chip-500k';
            else if (lastChip >= 100000) chipClass = 'chip-100k';
            else if (lastChip >= 50000) chipClass = 'chip-50k';
            else if (lastChip >= 10000) chipClass = 'chip-10k';
            else if (lastChip >= 5000) chipClass = 'chip-5k';
            else chipClass = 'chip-1k';

            let displayAmount = betInfo.amount >= 1000000
                ? (betInfo.amount / 1000000).toFixed(1) + 'M'
                : (betInfo.amount >= 1000 ? (betInfo.amount / 1000) + 'K' : betInfo.amount);

            html += `
                <div class="placed-chip ${chipClass} user-placed-chip" title="나 (YOU): ${betInfo.amount.toLocaleString()} Chip">
                    <span class="chip-avatar-tag">🧑</span>
                    <span class="chip-val">${displayAmount}</span>
                </div>
            `;
        }

        // 2. 다른 플레이어(AI 봇들)의 배팅 칩 (고유 색상 및 아바타 뱃지)
        botsOnSpot.forEach((bb, idx) => {
            const bAmount = bb.amount >= 1000000
                ? (bb.amount / 1000000).toFixed(1) + 'M'
                : (bb.amount >= 1000 ? (bb.amount / 1000) + 'K' : bb.amount);

            const botClass = bb.bot.chipClass || 'chip-bot-blue';
            const offsetClass = `bot-chip-offset-${idx % 3}`;

            html += `
                <div class="placed-chip bot-placed-chip ${botClass} ${offsetClass}" 
                     style="box-shadow: 0 4px 10px ${bb.bot.chipColor || '#3b82f6'}88;"
                     title="${bb.bot.name}: ${bb.amount.toLocaleString()} Chip">
                    <span class="chip-avatar-tag">${bb.bot.avatar || '🤖'}</span>
                    <span class="chip-val">${bAmount}</span>
                </div>
            `;
        });

        chipContainer.innerHTML = html;
        if ((userHasBet ? 1 : 0) + botsOnSpot.length > 1) {
            chipContainer.classList.add('has-multiple-chips');
        } else {
            chipContainer.classList.remove('has-multiple-chips');
        }
    }

    /**
     * 베팅 취소 (Clear) - 유저 배팅만 취소하고 봇 배팅은 보존
     */
    clearBets() {
        if (this.isLocked || this.totalBetAmount === 0) return;

        // 배팅한 금액 전액 환불
        if (window.rouletteApp) {
            window.rouletteApp.addBalance(this.totalBetAmount);
        }

        const userSpotIds = Object.keys(this.bets);
        this.bets = {};
        this.totalBetAmount = 0;

        // 유저가 배팅했던 스팟들 갱신
        userSpotIds.forEach(spotId => {
            this.updateChipStack(spotId);
        });

        if (window.rouletteApp) {
            window.rouletteApp.updateBetDisplay();
        }
    }

    /**
     * 직전 베팅 재베팅 (Rebet)
     */
    rebet() {
        if (this.isLocked || !this.lastBets || Object.keys(this.lastBets).length === 0) return;

        // 필요한 총액 계산
        let neededTotal = 0;
        Object.values(this.lastBets).forEach(b => neededTotal += b.amount);

        if (window.rouletteApp && window.rouletteApp.balance < neededTotal) {
            if (window.rouletteApp.showToast) {
                window.rouletteApp.showToast("재베팅에 필요한 잔고가 부족합니다.");
            }
            return;
        }

        this.clearBets();

        Object.values(this.lastBets).forEach(b => {
            for (const chip of b.chips) {
                this.selectedChip = chip;
                this.placeBet(b.spotId, b.type, b.numbers);
            }
        });
    }

    /**
     * 베팅액 2배 (Double)
     */
    doubleBets() {
        if (this.isLocked || this.totalBetAmount === 0) return;

        if (window.rouletteApp && window.rouletteApp.balance < this.totalBetAmount) {
            if (window.rouletteApp.showToast) {
                window.rouletteApp.showToast("2배 베팅에 필요한 잔고가 부족합니다.");
            }
            return;
        }

        const currentBets = JSON.parse(JSON.stringify(this.bets));
        Object.values(currentBets).forEach(b => {
            for (const chip of b.chips) {
                this.selectedChip = chip;
                this.placeBet(b.spotId, b.type, b.numbers);
            }
        });
    }

    /**
     * 노 모어 벳: 베팅 잠금 설정
     */
    setLocked(locked) {
        this.isLocked = locked;
        const spots = this.container.querySelectorAll('.bet-spot');
        spots.forEach(s => {
            if (locked) s.classList.add('locked');
            else s.classList.remove('locked');
        });
    }

    /**
     * 당첨 번호 위에 최고급 크리스탈 유리 말머리(Knight) 돌리 마커 세우기 애니메이션
     * @param {number} winningNumber - 당첨 번호 (0~36)
     */
    placeDolly(winningNumber) {
        const spot = this.container.querySelector(`#spot-${winningNumber}`);
        if (!spot || !this.dollyElement) return;

        // 기존 하이라이트 초기화
        this.clearHighlights();

        const tableRect = this.container.querySelector('.roulette-felt-table').getBoundingClientRect();
        const spotRect = spot.getBoundingClientRect();
        const numText = spot.querySelector('.num-text');

        // 셀 내부 숫자의 정확한 위치 파악
        let targetX = 0;
        let targetY = 0;

        if (numText) {
            const numRect = numText.getBoundingClientRect();
            // 숫자 텍스트의 중심 X좌표와 하단선 바로 위에 돌리 베이스가 안착하도록 보정
            targetX = (numRect.left - tableRect.left) + (numRect.width / 2);
            targetY = (numRect.top - tableRect.top) + (numRect.height / 2) + 12;
        } else {
            targetX = (spotRect.left - tableRect.left) + (spotRect.width / 2);
            targetY = (spotRect.top - tableRect.top) + (spotRect.height / 2) + 12;
        }

        this.dollyElement.style.display = 'block';
        this.dollyElement.style.left = `${targetX}px`;
        this.dollyElement.style.top = `${targetY}px`;
        this.dollyElement.classList.add('dolly-drop');

        // 돌리 상단 번호 뱃지 동기화
        const dollyNum = this.dollyElement.querySelector('#dolly-num-label');
        if (dollyNum) {
            dollyNum.textContent = winningNumber;
        }

        // 황동 타격음 재생
        if (window.rouletteAudio) {
            window.rouletteAudio.playDollySound();
        }

        // 당첨 셀 및 연관 외부 배팅 구역 반짝임 하이라이트
        spot.classList.add('winning-spot');
        this.highlightWinningOutsideBets(winningNumber);
    }

    /**
     * 구슬 안착 후 낙첨된 모든 칩 회수(스위핑) 및 당첨 칩 단독 보존
     * @param {number} winningNumber - 당첨 번호 (0~36)
     */
    sweepLosingBets(winningNumber) {
        // 당첨된 스팟 ID 목록 구성
        const winningSpotIds = new Set();
        winningSpotIds.add(`spot-${winningNumber}`);

        if (winningNumber !== 0) {
            // 색상
            winningSpotIds.add(this.redNumbers.includes(winningNumber) ? 'spot-red' : 'spot-black');
            // 홀짝
            winningSpotIds.add(winningNumber % 2 === 0 ? 'spot-even' : 'spot-odd');
            // 하이로우
            winningSpotIds.add(winningNumber <= 18 ? 'spot-low' : 'spot-high');
            // 다즌
            if (winningNumber <= 12) winningSpotIds.add('spot-dozen1');
            else if (winningNumber <= 24) winningSpotIds.add('spot-dozen2');
            else winningSpotIds.add('spot-dozen3');
            // 컬럼
            if (winningNumber % 3 === 1) winningSpotIds.add('spot-col1');
            else if (winningNumber % 3 === 2) winningSpotIds.add('spot-col2');
            else if (winningNumber % 3 === 0) winningSpotIds.add('spot-col3');
        }

        let sweptAny = false;

        // 테이블 상의 모든 베팅 스팟 점검
        const allSpots = this.container.querySelectorAll('.bet-spot');
        allSpots.forEach(spot => {
            const spotId = spot.id;
            const chipStack = spot.querySelector('.chip-stack');
            if (!chipStack || !chipStack.children.length) return;

            let isWinner = winningSpotIds.has(spotId);
            const betType = spot.getAttribute('data-bet');
            const numbersStr = spot.getAttribute('data-numbers');
            if (!isWinner && (betType === 'split' || betType === 'street' || betType === 'corner' || betType === 'sixline') && numbersStr) {
                const nums = numbersStr.split(',').map(n => parseInt(n.trim(), 10));
                if (nums.includes(winningNumber)) {
                    isWinner = true;
                }
            }

            if (isWinner) {
                // [당첨 칩]: 테이블 위에 영광스럽게 그대로 보존 및 황금 오라 연출!
                chipStack.classList.add('winning-chip-glowing');
            } else {
                // [낙첨 칩]: 딜러 트레이 쪽으로 쓸려나가는 애니메이션 실행 및 회수
                chipStack.classList.add('chip-sweep-away');
                sweptAny = true;
                setTimeout(() => {
                    chipStack.innerHTML = '';
                    chipStack.classList.remove('chip-sweep-away');
                }, 550);
            }
        });

        // 칩 쓸어 담는 소리 재생
        if (sweptAny && window.rouletteAudio && window.rouletteAudio.playChipSweepSound) {
            window.rouletteAudio.playChipSweepSound();
        }
    }

    /**
     * 칩 정산 헬퍼 메서드 (sweepLosingBets 호환성 연결)
     */
    settleChips(winningNumber, winningBets) {
        this.sweepLosingBets(winningNumber);
    }

    /**
     * 다음 라운드(새로운 판) 시작 시 테이블 위의 모든 칩 및 당첨 오라 완전 초기화
     */
    clearAllChips() {
        this.botBets = {};
        this.bets = {};
        this.totalBetAmount = 0;

        const allChipStacks = this.container.querySelectorAll('.chip-stack');
        allChipStacks.forEach(stack => {
            stack.innerHTML = '';
            stack.classList.remove('chip-sweep-away', 'winning-chip-glowing', 'has-multiple-chips');
        });
    }

    /**
     * 돌리 핀 제거
     */
    removeDolly() {
        if (this.dollyElement) {
            this.dollyElement.style.display = 'none';
            this.dollyElement.classList.remove('dolly-drop');
        }
        this.clearHighlights();
        this.clearAllChips();
    }

    /**
     * 당첨된 외부 배팅 구역 하이라이트
     */
    highlightWinningOutsideBets(winningNumber) {
        if (winningNumber === 0) return; // 0은 외부 배팅 모두 낙첨

        // 1. 색상
        const isRed = this.redNumbers.includes(winningNumber);
        const colorSpot = this.container.querySelector(isRed ? '#spot-red' : '#spot-black');
        if (colorSpot) colorSpot.classList.add('winning-spot');

        // 2. 홀수 / 짝수
        const isEven = winningNumber % 2 === 0;
        const paritySpot = this.container.querySelector(isEven ? '#spot-even' : '#spot-odd');
        if (paritySpot) paritySpot.classList.add('winning-spot');

        // 3. 하이 / 로우 (1-18 / 19-36)
        const isLow = winningNumber >= 1 && winningNumber <= 18;
        const rangeSpot = this.container.querySelector(isLow ? '#spot-low' : '#spot-high');
        if (rangeSpot) rangeSpot.classList.add('winning-spot');

        // 4. 다즌 (1st 12, 2nd 12, 3rd 12)
        let dozenId = '#spot-dozen1';
        if (winningNumber >= 13 && winningNumber <= 24) dozenId = '#spot-dozen2';
        else if (winningNumber >= 25 && winningNumber <= 36) dozenId = '#spot-dozen3';
        const dozenSpot = this.container.querySelector(dozenId);
        if (dozenSpot) dozenSpot.classList.add('winning-spot');

        // 5. 컬럼 (col1: 1,4,7... / col2: 2,5,8... / col3: 3,6,9...)
        let colId = '#spot-col1';
        if (winningNumber % 3 === 2) colId = '#spot-col2';
        else if (winningNumber % 3 === 0) colId = '#spot-col3';
        const colSpot = this.container.querySelector(colId);
        if (colSpot) colSpot.classList.add('winning-spot');
    }

    /**
     * 하이라이트 클래스 제거
     */
    clearHighlights() {
        const winningSpots = this.container.querySelectorAll('.winning-spot');
        winningSpots.forEach(s => s.classList.remove('winning-spot'));
    }

    /**
     * 이번 라운드 배당금 계산
     * @param {number} winningNumber - 당첨 번호 (0~36)
     * @returns {object} { totalPayout, winningBets }
     */
    calculatePayout(winningNumber) {
        let totalPayout = 0;
        const winningBets = [];

        // 관리자가 설정한 공식 배당률 참조 (미설정 시 정통 표준 배당 기본 적용)
        const p = (window.rouletteStats && window.rouletteStats.payouts) ? window.rouletteStats.payouts : {
            straight: 35, split: 17, street: 11, corner: 8, sixline: 5, dozen: 2, column: 2, evenodd: 1, redblack: 1, highlow: 1
        };

        for (const [spotId, bet] of Object.entries(this.bets)) {
            let won = false;
            let multiplier = 0;

            if (bet.type === 'straight') {
                if (parseInt(bet.numbers, 10) === winningNumber) {
                    won = true;
                    multiplier = (p.straight || 35) + 1; // 배당 + 본인 원금
                }
            } else if (winningNumber !== 0) {
                // 0이 아닌 경우에만 외부 배팅 인정
                if (bet.type === 'red' && this.redNumbers.includes(winningNumber)) {
                    won = true;
                    multiplier = (p.redblack || 1) + 1;
                } else if (bet.type === 'black' && this.blackNumbers.includes(winningNumber)) {
                    won = true;
                    multiplier = (p.redblack || 1) + 1;
                } else if (bet.type === 'even' && winningNumber % 2 === 0) {
                    won = true;
                    multiplier = (p.evenodd || 1) + 1;
                } else if (bet.type === 'odd' && winningNumber % 2 !== 0) {
                    won = true;
                    multiplier = (p.evenodd || 1) + 1;
                } else if (bet.type === 'low' && winningNumber >= 1 && winningNumber <= 18) {
                    won = true;
                    multiplier = (p.highlow || 1) + 1;
                } else if (bet.type === 'high' && winningNumber >= 19 && winningNumber <= 36) {
                    won = true;
                    multiplier = (p.highlow || 1) + 1;
                } else if (bet.type === 'dozen') {
                    if (bet.numbers === '1-12' && winningNumber >= 1 && winningNumber <= 12) won = true;
                    else if (bet.numbers === '13-24' && winningNumber >= 13 && winningNumber <= 24) won = true;
                    else if (bet.numbers === '25-36' && winningNumber >= 25 && winningNumber <= 36) won = true;
                    if (won) multiplier = (p.dozen || 2) + 1;
                } else if (bet.type === 'column') {
                    if (bet.numbers === 'col1' && winningNumber % 3 === 1) won = true;
                    else if (bet.numbers === 'col2' && winningNumber % 3 === 2) won = true;
                    else if (bet.numbers === 'col3' && winningNumber % 3 === 0) won = true;
                    if (won) multiplier = (p.column || 2) + 1;
                } else if (bet.type === 'split') {
                    const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                    if (nums.includes(winningNumber)) {
                        won = true;
                        multiplier = (p.split || 17) + 1;
                    }
                } else if (bet.type === 'street') {
                    const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                    if (nums.includes(winningNumber)) {
                        won = true;
                        multiplier = (p.street || 11) + 1;
                    }
                } else if (bet.type === 'corner') {
                    const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                    if (nums.includes(winningNumber)) {
                        won = true;
                        multiplier = (p.corner || 8) + 1;
                    }
                } else if (bet.type === 'sixline') {
                    const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                    if (nums.includes(winningNumber)) {
                        won = true;
                        multiplier = (p.sixline || 5) + 1;
                    }
                }
            }

            if (won) {
                const payout = bet.amount * multiplier;
                totalPayout += payout;
                winningBets.push({
                    spotId: spotId,
                    type: bet.type,
                    amount: bet.amount,
                    payout: payout
                });
            }
        }

        // 직전 배팅 저장
        this.lastBets = JSON.parse(JSON.stringify(this.bets));
        // 배팅 데이터 초기화
        this.bets = {};
        this.totalBetAmount = 0;

        return { totalPayout, winningBets };
    }

    /**
     * 구슬 안착 후 테이블 당첨 번호 및 실제 놓여진 칩 상황 대형 스포트라이트 연출
     * @param {number} winningNumber - 당첨 번호
     * @param {number} totalPayout - 획득 상금
     * @param {Array} winningBets - 적중된 배팅 목록
     */
    showTableSpotlight(winningNumber, totalPayout, winningBets) {
        const modal = document.getElementById('table-result-spotlight');
        const mount = document.getElementById('spotlight-cells-mount');
        const numBadge = document.getElementById('spotlight-win-number');
        const descEl = document.getElementById('spotlight-win-desc');
        const payoutVal = document.getElementById('spotlight-payout-amount');
        const dolly = document.getElementById('spotlight-dolly');

        if (!modal || !mount) return;

        // 색상 및 속성
        const isRed = this.redNumbers.includes(winningNumber);
        const colorName = winningNumber === 0 ? 'GREEN (ZERO)' : (isRed ? 'RED' : 'BLACK');
        const parity = winningNumber === 0 ? '' : (winningNumber % 2 === 0 ? 'EVEN' : 'ODD');
        const descText = parity ? `${colorName} / ${parity}` : colorName;

        if (numBadge) {
            numBadge.textContent = winningNumber;
            numBadge.className = `badge-number ${winningNumber === 0 ? 'text-green' : (isRed ? 'text-red' : 'text-black')}`;
        }
        if (descEl) descEl.textContent = descText;
        if (payoutVal) {
            payoutVal.textContent = totalPayout > 0 ? `+₩ ${totalPayout.toLocaleString()}` : `₩ 0 (낙첨)`;
            payoutVal.style.color = totalPayout > 0 ? '#2ecc71' : '#a0a6b2';
        }

        // 당첨 번호 주변 3개 번호 선별 (예: 17번이면 16, 17, 18 등)
        let displayNumbers = [];
        if (winningNumber === 0) {
            displayNumbers = [1, 0, 2];
        } else if (winningNumber === 1) {
            displayNumbers = [0, 1, 2];
        } else if (winningNumber === 36) {
            displayNumbers = [35, 36, 34];
        } else {
            displayNumbers = [winningNumber - 1, winningNumber, winningNumber + 1];
        }

        // 대형 셀 HTML 조립 (각 번호에 실제 놓여 있던 칩 정보 포함)
        let html = '';
        displayNumbers.forEach(n => {
            const isWin = n === winningNumber;
            const nIsRed = this.redNumbers.includes(n);
            const bgClass = n === 0 ? 'spot-zero' : (nIsRed ? 'spot-red' : 'spot-black');

            // 직전 저장된 배팅 데이터에서 해당 번호에 걸린 칩 확인
            const savedBet = this.lastBets ? this.lastBets[`spot-${n}`] : null;
            let chipHtml = '';

            if (savedBet && savedBet.amount > 0) {
                const amountText = savedBet.amount >= 1000000
                    ? (savedBet.amount / 1000000).toFixed(1) + 'M'
                    : (savedBet.amount / 1000) + 'K';
                chipHtml = `
                    <div class="spotlight-chip-container">
                        <div class="spotlight-chip chip-100k">
                            <span>${amountText}</span>
                        </div>
                    </div>
                `;
            } else {
                chipHtml = `<div class="spotlight-no-chips">베팅 없음</div>`;
            }

            html += `
                <div class="spotlight-cell ${bgClass} ${isWin ? 'is-winner' : ''}">
                    <span class="spotlight-cell-num">${n}</span>
                    ${chipHtml}
                </div>
            `;
        });

        mount.innerHTML = html;

        // 모달 표시
        modal.classList.remove('hidden');

        // 황동 돌리 핀 쿵 내려앉는 애니메이션 리셋 및 실행
        if (dolly) {
            dolly.style.display = 'block';
            dolly.classList.remove('spotlight-dolly-marker');
            void dolly.offsetWidth; // 리플로우 트리거
            dolly.classList.add('spotlight-dolly-marker');
        }

        // 황동 타격음 재생
        if (window.rouletteAudio) {
            window.rouletteAudio.playDollySound();
        }

        // 4.5초 후 스포트라이트 모달 닫기
        setTimeout(() => {
            this.closeTableSpotlight();
        }, 4500);
    }

    /**
     * 스포트라이트 모달 닫기
     */
    closeTableSpotlight() {
        const modal = document.getElementById('table-result-spotlight');
        if (modal) modal.classList.add('hidden');
    }
}

