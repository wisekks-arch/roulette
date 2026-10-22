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

                <!-- 메인 36개 숫자 그리드 및 오버레이 배팅 구역 -->
                <div class="table-grid-area">
                    <div class="table-numbers-grid" id="table-numbers-grid">
        `;

        // 룰렛 테이블 표준 열 배열: 
        // 행 1: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
        // 행 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
        // 행 3: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
        for (let col = 1; col <= 12; col++) {
            const n1 = col * 3;
            const n2 = col * 3 - 1;
            const n3 = col * 3 - 2;

            html += `<div class="table-column-group" data-col="${col}">`;
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

        // 전통 카지노 전방위 배팅 오버레이 (선/교차점 핫스팟 레이어)
        html += this.generateInsideBetsOverlay();

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

                <!-- 배팅 툴팁 (마우스 호버 시 실시간 안내) -->
                <div class="bet-info-tooltip" id="table-bet-tooltip" style="display: none;"></div>

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
                            <path d="M 28 115 C 25 95 20 70 30 50 C 35 40 45 35 48 20 C 50 12 55 5 62 8 C 65 10 65 18 64 22 C 72 23 85 30 88 42 C 90 50 85 58 75 62 C 68 65 62 68 60 75 C 57 85 62 105 68 115 Z" 
                                  fill="url(#glassLightGrad)" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" filter="url(#glassGlow)" />
                            <path d="M 45 22 Q 40 40 32 60 Q 25 80 27 100" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" />
                            <path d="M 40 32 L 30 38 M 36 48 L 26 54 M 32 64 L 22 70 M 30 78 L 20 84" stroke="rgba(255,255,255,0.7)" stroke-width="1.8" />
                            <circle cx="82" cy="46" r="2.5" fill="#ffffff" />
                            <circle cx="68" cy="38" r="3" fill="#ffffff" />
                            <circle cx="68" cy="38" r="1.5" fill="#00e5ff" />
                            <path d="M 46 38 C 55 42 65 48 58 72 Z" fill="url(#glassPrismGrad)" />
                        </svg>
                    </div>
                    <div class="knight-brass-collar"></div>
                    <div class="knight-brass-pedestal"></div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.dollyElement = document.getElementById('brass-dolly');
        this.tooltipElement = document.getElementById('table-bet-tooltip');
        this.attachEvents();
    }

    /**
     * 전통 룰렛 선 배팅 (스플릿, 스트리트, 코너, 식스라인) 오버레이 핫스팟 생성
     */
    generateInsideBetsOverlay() {
        let spotsHtml = `<div class="inside-bets-overlay">`;

        // 12개 열(Column), 3개 행(Row) 기준 정밀 퍼센트 좌표
        // col: 1~12 (인덱스 0~11), row: 0(상단 3,6..), 1(중간 2,5..), 2(하단 1,4..)
        const colWidthPct = 100 / 12;
        const rowHeightPct = 100 / 3;

        // 1. 수직 스플릿 (Vertical Split - 17:1): 같은 열 내 상하 인접 2개 숫자 사이 선
        for (let c = 0; c < 12; c++) {
            const col = c + 1;
            const nTop = col * 3;
            const nMid = col * 3 - 1;
            const nBtm = col * 3 - 2;
            const xPos = (c + 0.5) * colWidthPct;

            // 상단-중간 경계선 (예: 3과 2, 6과 5 등)
            const idV1 = `spot-split-v-${nMid}-${nTop}`;
            spotsHtml += `
                <div class="overlay-spot spot-split-v" id="${idV1}" data-bet="split" 
                     data-numbers="${nMid},${nTop}" data-payout="17" 
                     data-label="스플릿 (${nMid}/${nTop}) 17:1"
                     style="left: ${xPos}%; top: ${rowHeightPct}%;">
                    <div class="chip-stack" id="chips-${idV1.replace('spot-', '')}"></div>
                </div>
            `;

            // 중간-하단 경계선 (예: 2와 1, 5와 4 등)
            const idV2 = `spot-split-v-${nBtm}-${nMid}`;
            spotsHtml += `
                <div class="overlay-spot spot-split-v" id="${idV2}" data-bet="split" 
                     data-numbers="${nBtm},${nMid}" data-payout="17" 
                     data-label="스플릿 (${nBtm}/${nMid}) 17:1"
                     style="left: ${xPos}%; top: ${rowHeightPct * 2}%;">
                    <div class="chip-stack" id="chips-${idV2.replace('spot-', '')}"></div>
                </div>
            `;
        }

        // 2. 수평 스플릿 (Horizontal Split - 17:1): 인접 열 간 좌우 2개 숫자 사이 선
        for (let c = 0; c < 11; c++) {
            const col1 = c + 1;
            const col2 = c + 2;
            const xPos = (c + 1) * colWidthPct;

            // Row 0 (상단): col1*3 과 col2*3
            const nTop1 = col1 * 3;
            const nTop2 = col2 * 3;
            const idH0 = `spot-split-h-${nTop1}-${nTop2}`;
            spotsHtml += `
                <div class="overlay-spot spot-split-h" id="${idH0}" data-bet="split" 
                     data-numbers="${nTop1},${nTop2}" data-payout="17" 
                     data-label="스플릿 (${nTop1}/${nTop2}) 17:1"
                     style="left: ${xPos}%; top: ${rowHeightPct * 0.5}%;">
                    <div class="chip-stack" id="chips-${idH0.replace('spot-', '')}"></div>
                </div>
            `;

            // Row 1 (중간): col1*3-1 과 col2*3-1
            const nMid1 = col1 * 3 - 1;
            const nMid2 = col2 * 3 - 1;
            const idH1 = `spot-split-h-${nMid1}-${nMid2}`;
            spotsHtml += `
                <div class="overlay-spot spot-split-h" id="${idH1}" data-bet="split" 
                     data-numbers="${nMid1},${nMid2}" data-payout="17" 
                     data-label="스플릿 (${nMid1}/${nMid2}) 17:1"
                     style="left: ${xPos}%; top: ${rowHeightPct * 1.5}%;">
                    <div class="chip-stack" id="chips-${idH1.replace('spot-', '')}"></div>
                </div>
            `;

            // Row 2 (하단): col1*3-2 과 col2*3-2
            const nBtm1 = col1 * 3 - 2;
            const nBtm2 = col2 * 3 - 2;
            const idH2 = `spot-split-h-${nBtm1}-${nBtm2}`;
            spotsHtml += `
                <div class="overlay-spot spot-split-h" id="${idH2}" data-bet="split" 
                     data-numbers="${nBtm1},${nBtm2}" data-payout="17" 
                     data-label="스플릿 (${nBtm1}/${nBtm2}) 17:1"
                     style="left: ${xPos}%; top: ${rowHeightPct * 2.5}%;">
                    <div class="chip-stack" id="chips-${idH2.replace('spot-', '')}"></div>
                </div>
            `;
        }

        // 3. 코너 배팅 (Corner - 8:1): 4개 숫자 교차점
        for (let c = 0; c < 11; c++) {
            const col1 = c + 1;
            const col2 = c + 2;
            const xPos = (c + 1) * colWidthPct;

            // 상단-중간 4개 교차점 (Row 0, 1)
            const cNums1 = [col1 * 3 - 1, col1 * 3, col2 * 3 - 1, col2 * 3].sort((a,b)=>a-b);
            const idC1 = `spot-corner-${cNums1.join('-')}`;
            spotsHtml += `
                <div class="overlay-spot spot-corner" id="${idC1}" data-bet="corner" 
                     data-numbers="${cNums1.join(',')}" data-payout="8" 
                     data-label="코너 (${cNums1.join(', ')}) 8:1"
                     style="left: ${xPos}%; top: ${rowHeightPct}%;">
                    <div class="chip-stack" id="chips-${idC1.replace('spot-', '')}"></div>
                </div>
            `;

            // 중간-하단 4개 교차점 (Row 1, 2)
            const cNums2 = [col1 * 3 - 2, col1 * 3 - 1, col2 * 3 - 2, col2 * 3 - 1].sort((a,b)=>a-b);
            const idC2 = `spot-corner-${cNums2.join('-')}`;
            spotsHtml += `
                <div class="overlay-spot spot-corner" id="${idC2}" data-bet="corner" 
                     data-numbers="${cNums2.join(',')}" data-payout="8" 
                     data-label="코너 (${cNums2.join(', ')}) 8:1"
                     style="left: ${xPos}%; top: ${rowHeightPct * 2}%;">
                    <div class="chip-stack" id="chips-${idC2.replace('spot-', '')}"></div>
                </div>
            `;
        }

        // 4. 스트리트 배팅 (Street - 11:1): 세로 1줄(가로 3개 숫자) 끝선 배팅 (Row 3 하단)
        for (let c = 0; c < 12; c++) {
            const col = c + 1;
            const sNums = [col * 3 - 2, col * 3 - 1, col * 3];
            const xPos = (c + 0.5) * colWidthPct;
            const idStreet = `spot-street-${sNums.join('-')}`;
            spotsHtml += `
                <div class="overlay-spot spot-street" id="${idStreet}" data-bet="street" 
                     data-numbers="${sNums.join(',')}" data-payout="11" 
                     data-label="스트리트 (${sNums.join(', ')}) 11:1"
                     style="left: ${xPos}%; top: 100%;">
                    <div class="chip-stack" id="chips-${idStreet.replace('spot-', '')}"></div>
                </div>
            `;
        }

        // 5. 식스 라인 배팅 (Six Line - 5:1): 두 줄을 묶은 6개 숫자 (Row 3 하단 교차점)
        for (let c = 0; c < 11; c++) {
            const col1 = c + 1;
            const col2 = c + 2;
            const sixNums = [
                col1 * 3 - 2, col1 * 3 - 1, col1 * 3,
                col2 * 3 - 2, col2 * 3 - 1, col2 * 3
            ].sort((a,b)=>a-b);
            const xPos = (c + 1) * colWidthPct;
            const idSix = `spot-sixline-${sixNums[0]}-${sixNums[5]}`;
            spotsHtml += `
                <div class="overlay-spot spot-sixline" id="${idSix}" data-bet="sixline" 
                     data-numbers="${sixNums.join(',')}" data-payout="5" 
                     data-label="식스 라인 (${sixNums[0]}~${sixNums[5]}) 5:1"
                     style="left: ${xPos}%; top: 100%;">
                    <div class="chip-stack" id="chips-${idSix.replace('spot-', '')}"></div>
                </div>
            `;
        }

        spotsHtml += `</div>`;
        return spotsHtml;
    }

    /**
     * 베팅 스팟 클릭/터치 및 호버 인터랙션 이벤트 리스너 등록
     */
    attachEvents() {
        const allSpots = this.container.querySelectorAll('.bet-spot, .overlay-spot');
        allSpots.forEach(spot => {
            // 클릭 이벤트 (베팅 실행)
            spot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isLocked) return;
                const betType = spot.getAttribute('data-bet');
                const numbersStr = spot.getAttribute('data-numbers');
                const payoutRatio = parseInt(spot.getAttribute('data-payout'), 10) || 0;
                const spotId = spot.id;
                this.placeBet(spotId, betType, numbersStr, payoutRatio);
            });

            // 마우스 호버 및 포커스 시 실시간 번호군 골드 하이라이트 & 툴팁 안내
            spot.addEventListener('mouseenter', (e) => {
                if (this.isLocked) return;
                this.highlightHoverNumbers(spot, true);
                this.showTooltip(spot, e);
            });

            spot.addEventListener('mouseleave', () => {
                this.highlightHoverNumbers(spot, false);
                this.hideTooltip();
            });
        });
    }

    /**
     * 마우스 호버 시 커버되는 번호 셀들 전체 골드 네온 하이라이트 토글
     */
    highlightHoverNumbers(spot, isEnter) {
        const numbersStr = spot.getAttribute('data-numbers');
        if (!numbersStr) return;

        let numList = [];
        if (numbersStr === 'red') numList = this.redNumbers;
        else if (numbersStr === 'black') numList = this.blackNumbers;
        else if (numbersStr === 'even') numList = Array.from({length: 18}, (_, i) => (i + 1) * 2);
        else if (numbersStr === 'odd') numList = Array.from({length: 18}, (_, i) => i * 2 + 1);
        else if (numbersStr === '1-18') numList = Array.from({length: 18}, (_, i) => i + 1);
        else if (numbersStr === '19-36') numList = Array.from({length: 18}, (_, i) => i + 19);
        else if (numbersStr === '1-12') numList = Array.from({length: 12}, (_, i) => i + 1);
        else if (numbersStr === '13-24') numList = Array.from({length: 12}, (_, i) => i + 13);
        else if (numbersStr === '25-36') numList = Array.from({length: 12}, (_, i) => i + 25);
        else if (numbersStr === 'col1') numList = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        else if (numbersStr === 'col2') numList = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
        else if (numbersStr === 'col3') numList = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
        else {
            numList = numbersStr.split(',').map(n => parseInt(n.trim(), 10));
        }

        numList.forEach(num => {
            const cell = this.container.querySelector(`#spot-${num}`);
            if (cell) {
                if (isEnter) cell.classList.add('preview-highlight');
                else cell.classList.remove('preview-highlight');
            }
        });
    }

    /**
     * 배팅 툴팁 표시
     */
    showTooltip(spot, event) {
        if (!this.tooltipElement) return;
        const label = spot.getAttribute('data-label');
        if (!label) return;

        this.tooltipElement.textContent = label;
        this.tooltipElement.style.display = 'block';

        const tableRect = this.container.querySelector('.roulette-felt-table').getBoundingClientRect();
        const spotRect = spot.getBoundingClientRect();

        const x = (spotRect.left - tableRect.left) + (spotRect.width / 2);
        const y = (spotRect.top - tableRect.top) - 10;

        this.tooltipElement.style.left = `${x}px`;
        this.tooltipElement.style.top = `${y}px`;
    }

    /**
     * 배팅 툴팁 숨김
     */
    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
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
    placeBet(spotId, betType, numbersStr, payoutRatio = 0) {
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

        // 베팅 번호 목록 파싱
        let numList = [];
        if (numbersStr && numbersStr.includes(',')) {
            numList = numbersStr.split(',').map(n => parseInt(n.trim(), 10));
        } else if (!isNaN(parseInt(numbersStr, 10))) {
            numList = [parseInt(numbersStr, 10)];
        }

        // 베팅 데이터 저장
        if (!this.bets[spotId]) {
            this.bets[spotId] = {
                spotId: spotId,
                type: betType,
                numbers: numbersStr,
                numbersList: numList,
                payoutRatio: payoutRatio,
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
        const spotElement = this.container.querySelector(`#${spotId}`);
        const chipContainer = this.container.querySelector(`#chips-${spotId.replace('spot-', '')}`);
        if (!chipContainer) return;

        const betInfo = this.bets[spotId];
        if (!betInfo || betInfo.amount === 0) {
            chipContainer.innerHTML = '';
            if (spotElement) spotElement.classList.remove('has-bet');
            return;
        }

        if (spotElement) spotElement.classList.add('has-bet');

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

        // 모든 칩 스택 및 has-bet 클래스 제거
        const chipStacks = this.container.querySelectorAll('.chip-stack');
        chipStacks.forEach(el => el.innerHTML = '');

        const allSpots = this.container.querySelectorAll('.bet-spot, .overlay-spot');
        allSpots.forEach(s => s.classList.remove('has-bet'));

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
                this.placeBet(b.spotId, b.type, b.numbers, b.payoutRatio);
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
                this.placeBet(b.spotId, b.type, b.numbers, b.payoutRatio);
            }
        });
    }

    /**
     * 노 모어 벳: 베팅 잠금 설정
     */
    setLocked(locked) {
        this.isLocked = locked;
        const spots = this.container.querySelectorAll('.bet-spot, .overlay-spot');
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

        // 당첨 셀 및 연관 외부/인사이드 배팅 구역 반짝임 하이라이트
        spot.classList.add('winning-spot');
        this.highlightWinningOutsideBets(winningNumber);
    }

    /**
     * 구슬 안착 후 낙첨된 모든 칩 회수(스위핑) 및 당첨 칩 단독 보존
     * @param {number} winningNumber - 당첨 번호 (0~36)
     */
    sweepLosingBets(winningNumber) {
        let sweptAny = false;

        // 테이블 상의 모든 배팅 스팟(번호 셀, 외부 배팅, 선/교차점 오버레이) 점검
        const allSpots = this.container.querySelectorAll('.bet-spot, .overlay-spot');
        allSpots.forEach(spot => {
            const spotId = spot.id;
            const chipStack = spot.querySelector('.chip-stack');
            if (!chipStack || !chipStack.children.length) return;

            // 해당 스팟이 이번 당첨 번호에 적중했는지 여부 검사
            const isWinningSpot = this.isSpotWinning(spot, winningNumber);

            if (isWinningSpot) {
                // [당첨 칩]: 테이블 위에 영광스럽게 그대로 보존 및 황금 오라 연출!
                chipStack.classList.add('winning-chip-glowing');
            } else {
                // [낙첨 칩]: 딜러 트레이 쪽으로 쓸려나가는 애니메이션 실행 및 회수
                chipStack.classList.add('chip-sweep-away');
                sweptAny = true;
                setTimeout(() => {
                    chipStack.innerHTML = '';
                    chipStack.classList.remove('chip-sweep-away');
                    spot.classList.remove('has-bet');
                }, 550);
            }
        });

        // 칩 쓸어 담는 소리 재생
        if (sweptAny && window.rouletteAudio && window.rouletteAudio.playChipSweepSound) {
            window.rouletteAudio.playChipSweepSound();
        }
    }

    /**
     * 스팟이 당첨 번호에 적중했는지 검사
     */
    isSpotWinning(spot, winningNumber) {
        const betType = spot.getAttribute('data-bet');
        const numbersStr = spot.getAttribute('data-numbers');
        if (!betType || !numbersStr) return false;

        if (betType === 'straight') {
            return parseInt(numbersStr, 10) === winningNumber;
        }

        // 스플릿, 스트리트, 코너, 식스라인 (내부 선/교차점 배팅)
        if (['split', 'street', 'corner', 'sixline'].includes(betType)) {
            const nums = numbersStr.split(',').map(n => parseInt(n.trim(), 10));
            return nums.includes(winningNumber);
        }

        // 0일 경우 모든 외부 배팅 낙첨
        if (winningNumber === 0) return false;

        if (betType === 'red') return this.redNumbers.includes(winningNumber);
        if (betType === 'black') return this.blackNumbers.includes(winningNumber);
        if (betType === 'even') return winningNumber % 2 === 0;
        if (betType === 'odd') return winningNumber % 2 !== 0;
        if (betType === 'low') return winningNumber >= 1 && winningNumber <= 18;
        if (betType === 'high') return winningNumber >= 19 && winningNumber <= 36;
        if (betType === 'dozen') {
            if (numbersStr === '1-12') return winningNumber >= 1 && winningNumber <= 12;
            if (numbersStr === '13-24') return winningNumber >= 13 && winningNumber <= 24;
            if (numbersStr === '25-36') return winningNumber >= 25 && winningNumber <= 36;
        }
        if (betType === 'column') {
            if (numbersStr === 'col1') return winningNumber % 3 === 1;
            if (numbersStr === 'col2') return winningNumber % 3 === 2;
            if (numbersStr === 'col3') return winningNumber % 3 === 0;
        }

        return false;
    }

    /**
     * 다음 라운드(새로운 판) 시작 시 테이블 위의 모든 칩 및 당첨 오라 완전 초기화
     */
    clearAllChips() {
        const allChipStacks = this.container.querySelectorAll('.chip-stack');
        allChipStacks.forEach(stack => {
            stack.innerHTML = '';
            stack.classList.remove('chip-sweep-away', 'winning-chip-glowing');
        });
        const allSpots = this.container.querySelectorAll('.bet-spot, .overlay-spot');
        allSpots.forEach(s => s.classList.remove('has-bet'));
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
        const winningSpots = this.container.querySelectorAll('.winning-spot, .preview-highlight');
        winningSpots.forEach(s => s.classList.remove('winning-spot', 'preview-highlight'));
    }

    /**
     * 배팅 유형 한국어 명칭 생성
     */
    getBetTypeName(type, numbersStr) {
        switch (type) {
            case 'straight':
                return `스트레이트 [${numbersStr}] (35:1)`;
            case 'split':
                return `스플릿 [${numbersStr.replace(',', '/')}] (17:1)`;
            case 'street':
                return `스트리트 [${numbersStr}] (11:1)`;
            case 'corner':
                return `코너 [${numbersStr}] (8:1)`;
            case 'sixline':
                return `식스 라인 [${numbersStr}] (5:1)`;
            case 'dozen':
                return `다즌 [${numbersStr}] (2:1)`;
            case 'column':
                return `컬럼 [${numbersStr === 'col1' ? '1st Row' : (numbersStr === 'col2' ? '2nd Row' : '3rd Row')}] (2:1)`;
            case 'red':
                return '빨강 (Red) 1:1';
            case 'black':
                return '검정 (Black) 1:1';
            case 'even':
                return '짝수 (Even) 1:1';
            case 'odd':
                return '홀수 (Odd) 1:1';
            case 'low':
                return '로우 (1~18) 1:1';
            case 'high':
                return '하이 (19~36) 1:1';
            default:
                return `${type} (${numbersStr})`;
        }
    }

    /**
     * 이번 라운드 배당금 계산 (전통 카지노 8대 배팅 완전 정산)
     * @param {number} winningNumber - 당첨 번호 (0~36)
     * @returns {object} { totalPayout, winningBets }
     */
    calculatePayout(winningNumber) {
        let totalPayout = 0;
        const winningBets = [];

        for (const [spotId, bet] of Object.entries(this.bets)) {
            let won = false;
            let ratio = 0; // 순수 이익 배당률 (예: 스트레이트=35, 스플릿=17 등)

            if (bet.type === 'straight') {
                if (parseInt(bet.numbers, 10) === winningNumber) {
                    won = true;
                    ratio = 35;
                }
            } else if (bet.type === 'split') {
                const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                if (nums.includes(winningNumber)) {
                    won = true;
                    ratio = 17;
                }
            } else if (bet.type === 'street') {
                const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                if (nums.includes(winningNumber)) {
                    won = true;
                    ratio = 11;
                }
            } else if (bet.type === 'corner') {
                const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                if (nums.includes(winningNumber)) {
                    won = true;
                    ratio = 8;
                }
            } else if (bet.type === 'sixline') {
                const nums = bet.numbers.split(',').map(n => parseInt(n.trim(), 10));
                if (nums.includes(winningNumber)) {
                    won = true;
                    ratio = 5;
                }
            } else if (winningNumber !== 0) {
                // 외부 배팅 (0일 때는 모두 패배)
                if (bet.type === 'dozen') {
                    if (bet.numbers === '1-12' && winningNumber >= 1 && winningNumber <= 12) won = true;
                    else if (bet.numbers === '13-24' && winningNumber >= 13 && winningNumber <= 24) won = true;
                    else if (bet.numbers === '25-36' && winningNumber >= 25 && winningNumber <= 36) won = true;
                    if (won) ratio = 2;
                } else if (bet.type === 'column') {
                    if (bet.numbers === 'col1' && winningNumber % 3 === 1) won = true;
                    else if (bet.numbers === 'col2' && winningNumber % 3 === 2) won = true;
                    else if (bet.numbers === 'col3' && winningNumber % 3 === 0) won = true;
                    if (won) ratio = 2;
                } else if (bet.type === 'red' && this.redNumbers.includes(winningNumber)) {
                    won = true;
                    ratio = 1;
                } else if (bet.type === 'black' && this.blackNumbers.includes(winningNumber)) {
                    won = true;
                    ratio = 1;
                } else if (bet.type === 'even' && winningNumber % 2 === 0) {
                    won = true;
                    ratio = 1;
                } else if (bet.type === 'odd' && winningNumber % 2 !== 0) {
                    won = true;
                    ratio = 1;
                } else if (bet.type === 'low' && winningNumber >= 1 && winningNumber <= 18) {
                    won = true;
                    ratio = 1;
                } else if (bet.type === 'high' && winningNumber >= 19 && winningNumber <= 36) {
                    won = true;
                    ratio = 1;
                }
            }

            if (won) {
                const payout = bet.amount * (ratio + 1); // 이익 배당금 + 본인 원금
                totalPayout += payout;
                winningBets.push({
                    spotId: spotId,
                    type: bet.type,
                    typeName: this.getBetTypeName(bet.type, bet.numbers),
                    amount: bet.amount,
                    ratio: ratio,
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
