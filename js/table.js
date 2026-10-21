/**
 * 🎡 최고급 전통 카지노 룰렛 베팅 테이블 & 배당/돌리(Dolly) 핀 엔진
 * 전통 펠트 다이 인터랙션, 칩 배치, 정통 배당률 계산 및 황동 마커 세우기 연출
 */

class RouletteTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.selectedChip = 10000; // 기본 선택 칩: 10,000원
        this.bets = {};            // { betKey: { type, numbers, amount, chips: [...] } }
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

                <!-- 당첨 번호에 꽂히는 황동 돌리(Dolly) 핀 엘리먼트 -->
                <div class="brass-dolly-marker" id="brass-dolly" style="display: none;">
                    <div class="dolly-head"></div>
                    <div class="dolly-neck"></div>
                    <div class="dolly-base"></div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.dollyElement = document.getElementById('brass-dolly');
        this.attachEvents();
    }

    /**
     * 베팅 스팟 클릭/터치 이벤트 리스너 등록
     */
    attachEvents() {
        const spots = this.container.querySelectorAll('.bet-spot');
        spots.forEach(spot => {
            spot.addEventListener('click', (e) => {
                if (this.isLocked) return;
                const betType = spot.getAttribute('data-bet');
                const numbersStr = spot.getAttribute('data-numbers');
                const spotId = spot.id;
                this.placeBet(spotId, betType, numbersStr);
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
     * 해당 스팟의 칩 시각적 스택 업데이트
     */
    updateChipStack(spotId) {
        const chipContainer = this.container.querySelector(`#chips-${spotId.replace('spot-', '')}`);
        if (!chipContainer) return;

        const betInfo = this.bets[spotId];
        if (!betInfo || betInfo.amount === 0) {
            chipContainer.innerHTML = '';
            return;
        }

        // 상위 칩 색상 결정
        const lastChip = betInfo.chips[betInfo.chips.length - 1];
        let chipClass = 'chip-10k';
        if (lastChip >= 500000) chipClass = 'chip-500k';
        else if (lastChip >= 100000) chipClass = 'chip-100k';
        else if (lastChip >= 50000) chipClass = 'chip-50k';
        else if (lastChip >= 10000) chipClass = 'chip-10k';
        else if (lastChip >= 5000) chipClass = 'chip-5k';
        else chipClass = 'chip-1k';

        // 금액 표시 포맷 (예: 50K, 1M, 10K 등)
        let displayAmount = betInfo.amount >= 1000000 
            ? (betInfo.amount / 1000000).toFixed(1) + 'M'
            : (betInfo.amount >= 1000 ? (betInfo.amount / 1000) + 'K' : betInfo.amount);

        chipContainer.innerHTML = `
            <div class="placed-chip ${chipClass}">
                <span>${displayAmount}</span>
            </div>
        `;
    }

    /**
     * 베팅 취소 (Clear)
     */
    clearBets() {
        if (this.isLocked || this.totalBetAmount === 0) return;

        // 배팅한 금액 전액 환불
        if (window.rouletteApp) {
            window.rouletteApp.addBalance(this.totalBetAmount);
        }

        this.bets = {};
        this.totalBetAmount = 0;

        // 모든 칩 스택 제거
        const chipStacks = this.container.querySelectorAll('.chip-stack');
        chipStacks.forEach(el => el.innerHTML = '');

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
     * 당첨 번호 위에 전통 카지노 황동 돌리(Dolly) 핀 세우기 애니메이션
     * @param {number} winningNumber - 당첨 번호 (0~36)
     */
    placeDolly(winningNumber) {
        const spot = this.container.querySelector(`#spot-${winningNumber}`);
        if (!spot || !this.dollyElement) return;

        // 기존 하이라이트 초기화
        this.clearHighlights();

        const tableRect = this.container.querySelector('.roulette-felt-table').getBoundingClientRect();
        const spotRect = spot.getBoundingClientRect();

        const targetX = spotRect.left - tableRect.left + (spotRect.width / 2) - 16;
        const targetY = spotRect.top - tableRect.top + (spotRect.height / 2) - 28;

        this.dollyElement.style.display = 'block';
        this.dollyElement.style.left = `${targetX}px`;
        this.dollyElement.style.top = `${targetY}px`;
        this.dollyElement.classList.add('dolly-drop');

        // 황동 타격음 재생
        if (window.rouletteAudio) {
            window.rouletteAudio.playDollySound();
        }

        // 당첨 셀 및 연관 외부 배팅 구역 반짝임 하이라이트
        spot.classList.add('winning-spot');
        this.highlightWinningOutsideBets(winningNumber);
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

        for (const [spotId, bet] of Object.entries(this.bets)) {
            let won = false;
            let multiplier = 0;

            if (bet.type === 'straight') {
                if (parseInt(bet.numbers, 10) === winningNumber) {
                    won = true;
                    multiplier = 35 + 1; // 35배 배당 + 본인 원금
                }
            } else if (winningNumber !== 0) {
                // 0이 아닌 경우에만 외부 배팅 인정
                if (bet.type === 'red' && this.redNumbers.includes(winningNumber)) {
                    won = true;
                    multiplier = 1 + 1; // 1:1 배당 + 원금
                } else if (bet.type === 'black' && this.blackNumbers.includes(winningNumber)) {
                    won = true;
                    multiplier = 1 + 1;
                } else if (bet.type === 'even' && winningNumber % 2 === 0) {
                    won = true;
                    multiplier = 1 + 1;
                } else if (bet.type === 'odd' && winningNumber % 2 !== 0) {
                    won = true;
                    multiplier = 1 + 1;
                } else if (bet.type === 'low' && winningNumber >= 1 && winningNumber <= 18) {
                    won = true;
                    multiplier = 1 + 1;
                } else if (bet.type === 'high' && winningNumber >= 19 && winningNumber <= 36) {
                    won = true;
                    multiplier = 1 + 1;
                } else if (bet.type === 'dozen') {
                    if (bet.numbers === '1-12' && winningNumber >= 1 && winningNumber <= 12) won = true;
                    else if (bet.numbers === '13-24' && winningNumber >= 13 && winningNumber <= 24) won = true;
                    else if (bet.numbers === '25-36' && winningNumber >= 25 && winningNumber <= 36) won = true;
                    if (won) multiplier = 2 + 1; // 2:1 배당 + 원금
                } else if (bet.type === 'column') {
                    if (bet.numbers === 'col1' && winningNumber % 3 === 1) won = true;
                    else if (bet.numbers === 'col2' && winningNumber % 3 === 2) won = true;
                    else if (bet.numbers === 'col3' && winningNumber % 3 === 0) won = true;
                    if (won) multiplier = 2 + 1; // 2:1 배당 + 원금
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
}
