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
                <!-- 테이블 0번 바로 위: 실시간 로열 네온 퍼플 배팅 시간 게이지 바 (시간에 따라 그래프 길이가 줄어드는 스타일) -->
                <div class="table-bet-timer-gauge-container purple-timer-theme" id="table-bet-timer-gauge-container">
                    <div class="table-bet-timer-header">
                        <span class="timer-dot purple-pulse-dot" id="table-timer-dot">🟣</span>
                        <span class="timer-title">배팅 마감까지 남은 시간:</span>
                        <strong id="table-timer-gauge-num" class="table-timer-gauge-num">20s</strong>
                    </div>
                    <div class="table-bet-timer-track">
                        <div id="table-bet-timer-progress" class="table-bet-timer-progress" style="width: 100%;"></div>
                    </div>
                </div>

                <!-- 상단 0 & 00 (그린 싱글 제로 & 더블 제로) -->
                <div class="table-zero-area">
                    <button class="bet-spot spot-zero spot-zero-single" data-bet="straight" data-numbers="0" id="spot-0" title="스트레이트 (38배): #0">
                        <span class="num-text">0</span>
                        <div class="chip-stack" id="chips-0"></div>
                    </button>
                    <!-- 0과 00 사이 스플릿 핫스팟 (17배) -->
                    <button class="bet-spot bet-hotspot hotspot-split-zero" data-bet="split" data-numbers="0,00" id="spot-split-0-00" title="스플릿 (17배): 0, 00">
                        <div class="chip-stack" id="chips-split-0-00"></div>
                    </button>
                    <button class="bet-spot spot-zero spot-zero-double" data-bet="straight" data-numbers="00" id="spot-00" title="스트레이트 (38배): #00">
                        <span class="num-text">00</span>
                        <div class="chip-stack" id="chips-00"></div>
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

            html += `<div class="table-column-group" data-col="${col}">`;
            [n1, n2, n3].forEach(n => {
                const isRed = this.redNumbers.includes(n);
                const colorClass = isRed ? 'spot-red' : 'spot-black';
                html += `
                    <button class="bet-spot spot-number ${colorClass}" data-bet="straight" data-numbers="${n}" id="spot-${n}" title="스트레이트 (38배): #${n}">
                        <span class="num-text">${n}</span>
                        <div class="chip-stack" id="chips-${n}"></div>
                    </button>
                `;
            });

            // [정통 룰렛 핫스팟 1] 열 내 상하 스플릿 (Split 17배)
            // n1과 n2 사이 경계선
            html += `
                <button class="bet-spot bet-hotspot hotspot-split-h pos-split-h-top" data-bet="split" data-numbers="${n2},${n1}" id="spot-split-${n2}-${n1}" title="스플릿 (17배): ${n2}, ${n1}">
                    <div class="chip-stack" id="chips-split-${n2}-${n1}"></div>
                </button>
            `;
            // n2과 n3 사이 경계선
            html += `
                <button class="bet-spot bet-hotspot hotspot-split-h pos-split-h-bot" data-bet="split" data-numbers="${n3},${n2}" id="spot-split-${n3}-${n2}" title="스플릿 (17배): ${n3}, ${n2}">
                    <div class="chip-stack" id="chips-split-${n3}-${n2}"></div>
                </button>
            `;

            // [정통 룰렛 핫스팟 2] 스트리트 (Street 11배) - 1열 하단 외곽선
            html += `
                <button class="bet-spot bet-hotspot hotspot-street pos-street" data-bet="street" data-numbers="${n3},${n2},${n1}" id="spot-street-${n3}-${n2}-${n1}" title="스트리트 (11배): ${n3}, ${n2}, ${n1}">
                    <div class="chip-stack" id="chips-street-${n3}-${n2}-${n1}"></div>
                </button>
            `;

            // [정통 룰렛 핫스팟 3] 인접 열과의 교차점 (col 1~11만 해당)
            if (col < 12) {
                // 수직 스플릿 3개 (우측 경계선, 17배)
                html += `
                    <button class="bet-spot bet-hotspot hotspot-split-v pos-split-v-1" data-bet="split" data-numbers="${n1},${n1 + 3}" id="spot-split-${n1}-${n1 + 3}" title="스플릿 (17배): ${n1}, ${n1 + 3}">
                        <div class="chip-stack" id="chips-split-${n1}-${n1 + 3}"></div>
                    </button>
                    <button class="bet-spot bet-hotspot hotspot-split-v pos-split-v-2" data-bet="split" data-numbers="${n2},${n2 + 3}" id="spot-split-${n2}-${n2 + 3}" title="스플릿 (17배): ${n2}, ${n2 + 3}">
                        <div class="chip-stack" id="chips-split-${n2}-${n2 + 3}"></div>
                    </button>
                    <button class="bet-spot bet-hotspot hotspot-split-v pos-split-v-3" data-bet="split" data-numbers="${n3},${n3 + 3}" id="spot-split-${n3}-${n3 + 3}" title="스플릿 (17배): ${n3}, ${n3 + 3}">
                        <div class="chip-stack" id="chips-split-${n3}-${n3 + 3}"></div>
                    </button>

                    <!-- 모서리 코너 2개 (Corner 8배) -->
                    <button class="bet-spot bet-hotspot hotspot-corner pos-corner-top" data-bet="corner" data-numbers="${n2},${n1},${n2 + 3},${n1 + 3}" id="spot-corner-${n2}-${n1}-${n2 + 3}-${n1 + 3}" title="코너 (8배): ${n2}, ${n1}, ${n2 + 3}, ${n1 + 3}">
                        <div class="chip-stack" id="chips-corner-${n2}-${n1}-${n2 + 3}-${n1 + 3}"></div>
                    </button>
                    <button class="bet-spot bet-hotspot hotspot-corner pos-corner-bot" data-bet="corner" data-numbers="${n3},${n2},${n3 + 3},${n2 + 3}" id="spot-corner-${n3}-${n2}-${n3 + 3}-${n2 + 3}" title="코너 (8배): ${n3}, ${n2}, ${n3 + 3}, ${n2 + 3}">
                        <div class="chip-stack" id="chips-corner-${n3}-${n2}-${n3 + 3}-${n2 + 3}"></div>
                    </button>

                    <!-- 두 열 사이 식스라인 (Six Line 5배) -->
                    <button class="bet-spot bet-hotspot hotspot-sixline pos-sixline" data-bet="sixline" data-numbers="${n3},${n2},${n1},${n3 + 3},${n2 + 3},${n1 + 3}" id="spot-sixline-${n3}-${n3 + 5}" title="식스라인 (5배): ${n3} ~ ${n3 + 5}">
                        <div class="chip-stack" id="chips-sixline-${n3}-${n3 + 5}"></div>
                    </button>
                `;
            }

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

                <!-- 당첨 번호에 꽂히는 최고급 24K 황동 & 입체 크리스탈 체스 나이트(Knight) 돌리 마커 -->
                <div class="crystal-knight-dolly" id="brass-dolly" style="display: none;">
                    <!-- 1. 착지 시 바닥으로 촤라락 퍼지는 황금빛 충격파 링 -->
                    <div class="dolly-ripple-ring ripple-1"></div>
                    <div class="dolly-ripple-ring ripple-2"></div>

                    <!-- 2. 상단 당첨 번호 골드 크라운 뱃지 -->
                    <div class="dolly-crown-badge">
                        <span class="dolly-crown-icon">👑</span>
                        <span class="dolly-number-badge" id="dolly-num-label">0</span>
                    </div>

                    <!-- 3. 최고급 크리스탈 글래스 체스 나이트 조각상 -->
                    <div class="knight-glass-figure">
                        <svg class="horse-head-svg" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <!-- 크리스탈 빛 굴절 그라데이션 -->
                                <linearGradient id="crystalLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98" />
                                    <stop offset="25%" stop-color="#d4f1ff" stop-opacity="0.88" />
                                    <stop offset="55%" stop-color="#80d0ff" stop-opacity="0.7" />
                                    <stop offset="80%" stop-color="#bde5ff" stop-opacity="0.85" />
                                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0.98" />
                                </linearGradient>
                                <!-- 내부 프리즘 다이아몬드 광채 -->
                                <linearGradient id="prismFlareGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stop-color="#ffd700" stop-opacity="0.85" />
                                    <stop offset="35%" stop-color="#00f2fe" stop-opacity="0.65" />
                                    <stop offset="70%" stop-color="#4facfe" stop-opacity="0.55" />
                                    <stop offset="100%" stop-color="#ff0844" stop-opacity="0.45" />
                                </linearGradient>
                                <!-- 24K 황동 금속 그라데이션 -->
                                <linearGradient id="brassMetallicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stop-color="#ffd700" />
                                    <stop offset="25%" stop-color="#fff5c0" />
                                    <stop offset="50%" stop-color="#d4af37" />
                                    <stop offset="75%" stop-color="#996515" />
                                    <stop offset="100%" stop-color="#ffd700" />
                                </linearGradient>
                                <!-- 크리스탈 입체 글로우 필터 -->
                                <filter id="crystalGlow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>

                            <!-- 체스 나이트 말머리 메인 바디 (정교하고 당당한 조각 실루엣) -->
                            <path d="M 32 125 
                                     C 28 105, 20 82, 32 58 
                                     C 36 46, 44 40, 46 22 
                                     C 48 12, 54 4, 63 6 
                                     C 67 8, 68 16, 66 22 
                                     C 76 22, 92 30, 98 44 
                                     C 102 54, 95 64, 84 68 
                                     C 74 72, 68 76, 65 84 
                                     C 62 96, 68 116, 75 125 Z"
                                  fill="url(#crystalLightGrad)"
                                  stroke="rgba(255, 255, 255, 0.95)"
                                  stroke-width="2.5"
                                  filter="url(#crystalGlow)" />

                            <!-- 말 갈기(Mane) 5단 레이어 입체 조각면 -->
                            <path d="M 46 22 Q 38 42 28 62 Q 22 84 25 106 Q 28 120 32 125" fill="none" stroke="rgba(255, 255, 255, 0.92)" stroke-width="2.2" />
                            <path d="M 40 34 L 28 42" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />
                            <path d="M 36 50 L 22 58" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />
                            <path d="M 32 68 L 18 76" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />
                            <path d="M 29 86 L 16 94" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />
                            <path d="M 28 104 L 18 112" stroke="rgba(255, 255, 255, 0.85)" stroke-width="2" stroke-linecap="round" />

                            <!-- 말 콧날 & 주둥이 볼륨 각인 -->
                            <path d="M 78 40 C 86 44, 94 48, 92 56 C 88 62, 80 64, 76 60" fill="none" stroke="rgba(255, 255, 255, 0.8)" stroke-width="1.8" />
                            <circle cx="91" cy="50" r="2.8" fill="#ffffff" />

                            <!-- 내부 다이아몬드 프리즘 굴절 패싯 -->
                            <path d="M 48 42 C 60 46, 74 52, 66 78 C 58 74, 52 64, 48 42 Z" fill="url(#prismFlareGrad)" opacity="0.85" />
                            <polygon points="56,48 70,54 62,70 52,60" fill="rgba(255, 255, 255, 0.45)" />

                            <!-- 보석 눈동자 (에메랄드/사파이어 카지노 젬스톤) -->
                            <circle cx="72" cy="38" r="4.2" fill="#00e5ff" />
                            <circle cx="72" cy="38" r="2.5" fill="#0b3866" />
                            <circle cx="73.5" cy="36.5" r="1.3" fill="#ffffff" />
                            <path d="M 66 34 Q 72 32 78 35" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" />
                        </svg>
                    </div>

                    <!-- 4. 24K 황동 접합 칼라 넥 링 -->
                    <div class="knight-brass-collar"></div>

                    <!-- 5. 24K 황동 3단 헤비 페디스탈 받침대 -->
                    <div class="knight-brass-pedestal">
                        <div class="pedestal-core-gem"></div>
                    </div>
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
                const isBettingTime = (window.rouletteApp && window.rouletteApp.currentPhase === 'BETTING');
                if (this.isLocked || !isBettingTime) {
                    if (window.rouletteApp && window.rouletteApp.showToast) {
                        window.rouletteApp.showToast("⛔ 구슬 회전 및 정산 중에는 배팅할 수 없습니다. 배팅 시간에 참여해 주세요!");
                    }
                    return;
                }
                const betType = spot.getAttribute('data-bet');
                const numbersStr = spot.getAttribute('data-numbers');
                const spotId = spot.id;
                this.placeBet(spotId, betType, numbersStr);
            });

            // 드래그 앤 드롭 타겟 지원
            spot.addEventListener('dragover', (e) => {
                const isBettingTime = (window.rouletteApp && window.rouletteApp.currentPhase === 'BETTING');
                if (this.isLocked || !isBettingTime) return;
                e.preventDefault();
                spot.classList.add('drag-target-hover');
            });

            spot.addEventListener('dragleave', () => {
                spot.classList.remove('drag-target-hover');
            });

            spot.addEventListener('drop', (e) => {
                const isBettingTime = (window.rouletteApp && window.rouletteApp.currentPhase === 'BETTING');
                if (this.isLocked || !isBettingTime) {
                    e.preventDefault();
                    return;
                }
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

            // 핫스팟 호버 시 연관 번호 동시 골드 하이라이트 인터랙션
            spot.addEventListener('mouseenter', () => {
                if (this.isLocked) return;
                const numsStr = spot.getAttribute('data-numbers');
                if (numsStr && spot.classList.contains('bet-hotspot')) {
                    const nums = numsStr.split(',').map(n => n.trim());
                    nums.forEach(n => {
                        const numSpot = this.container.querySelector(`#spot-${n}`);
                        if (numSpot) numSpot.classList.add('spot-hovered');
                    });
                }
            });

            spot.addEventListener('mouseleave', () => {
                const hoveredSpots = this.container.querySelectorAll('.spot-hovered');
                hoveredSpots.forEach(s => s.classList.remove('spot-hovered'));
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
        // 0. 카지노 로그인 여부 확인 (미로그인 시 배팅 차단 및 입장 게이트웨이 호출)
        if (window.rouletteAuth && !window.rouletteAuth.isLoggedIn()) {
            if (window.rouletteApp) {
                window.rouletteApp.showToast("🔒 카지노 회원 전용 테이블입니다. 먼저 로그인해 주세요.");
                if (typeof window.rouletteApp.showEntranceGatewayModal === 'function') {
                    window.rouletteApp.showEntranceGatewayModal();
                }
            }
            return;
        }

        const isBettingTime = (window.rouletteApp && window.rouletteApp.currentPhase === 'BETTING');
        if (this.isLocked || !isBettingTime) {
            if (window.rouletteApp && window.rouletteApp.showToast) {
                window.rouletteApp.showToast("⛔ 구슬 회전 및 정산 중에는 배팅할 수 없습니다. 배팅 시간에 참여해 주세요!");
            }
            return;
        }

        // 플레이어 보유 잔고 확인 (app에서 주입)
        if (window.rouletteApp && window.rouletteApp.balance < this.selectedChip) {
            if (window.rouletteApp.showToast) {
                window.rouletteApp.showToast("보유 잔고가 부족합니다.");
            }
            return;
        }

        // 현재 룸의 베팅 한도 체크 (1인당 1판 총 배팅 한도 & 개별 스팟 최대 한도)
        if (window.rouletteLobby) {
            const currentRoom = window.rouletteLobby.getCurrentRoom();
            if (currentRoom) {
                // 1. [기획 추가] 플레이어 1인당 한 판(회차) 총 배팅 한도 체크
                if (currentRoom.roundMaxBet && (this.totalBetAmount + this.selectedChip > currentRoom.roundMaxBet)) {
                    if (window.rouletteApp && window.rouletteApp.showToast) {
                        window.rouletteApp.showToast(`⚠️ 1판 총 배팅 한도(${currentRoom.roundMaxBet.toLocaleString()} Chip)를 초과할 수 없습니다. (현재 배팅: ${this.totalBetAmount.toLocaleString()} Chip)`);
                    }
                    return;
                }

                // 2. 단일 구역(스팟) 최대 베팅 한도 체크
                const currentSpotTotal = this.bets[spotId] ? this.bets[spotId].amount : 0;
                if (currentSpotTotal + this.selectedChip > currentRoom.maxBet) {
                    if (window.rouletteApp && window.rouletteApp.showToast) {
                        window.rouletteApp.showToast(`⚠️ 해당 구역 최대 배팅 한도(${currentRoom.maxBet.toLocaleString()} Chip)를 초과할 수 없습니다.`);
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
            const offsetClass = `bot-chip-offset-${idx % 4}`;

            html += `
                <div class="placed-chip bot-placed-chip ${botClass} ${offsetClass}" 
                     style="box-shadow: 0 4px 10px ${bb.bot.chipColor || '#3b82f6'}88;"
                     title="${bb.bot.name} (${bb.bot.role || '플레이어'}): ${bb.amount.toLocaleString()} Chip">
                    <span class="chip-avatar-tag">${bb.bot.avatar || '🤖'}</span>
                    <span class="chip-val">${bAmount}</span>
                </div>
            `;
        });

        chipContainer.innerHTML = html;
        const totalChipsCount = (userHasBet ? 1 : 0) + botsOnSpot.length;
        if (totalChipsCount > 1) {
            chipContainer.classList.add('has-multiple-chips');
            chipContainer.setAttribute('data-stack-count', `${totalChipsCount}인`);
        } else {
            chipContainer.classList.remove('has-multiple-chips');
            chipContainer.removeAttribute('data-stack-count');
        }
    }

    /**
     * 베팅 취소 (Clear) - 유저 배팅만 취소하고 봇 배팅은 보존
     */
    clearBets() {
        const isBettingTime = (window.rouletteApp && window.rouletteApp.currentPhase === 'BETTING');
        if (this.isLocked || !isBettingTime || this.totalBetAmount === 0) return;

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
        const isBettingTime = (window.rouletteApp && window.rouletteApp.currentPhase === 'BETTING');
        if (this.isLocked || !isBettingTime || !this.lastBets || Object.keys(this.lastBets).length === 0) return;

        // 필요한 총액 계산
        let neededTotal = 0;
        Object.values(this.lastBets).forEach(b => neededTotal += b.amount);

        // 1판 총 배팅 한도 사전 확인
        if (window.rouletteLobby) {
            const room = window.rouletteLobby.getCurrentRoom();
            if (room && room.roundMaxBet && neededTotal > room.roundMaxBet) {
                if (window.rouletteApp && window.rouletteApp.showToast) {
                    window.rouletteApp.showToast(`⚠️ 직전 배팅 총액(${neededTotal.toLocaleString()} Chip)이 1판 한도(${room.roundMaxBet.toLocaleString()} Chip)를 초과합니다.`);
                }
                return;
            }
        }

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
        const isBettingTime = (window.rouletteApp && window.rouletteApp.currentPhase === 'BETTING');
        if (this.isLocked || !isBettingTime || this.totalBetAmount === 0) return;

        // 1판 총 배팅 한도 사전 확인
        if (window.rouletteLobby) {
            const room = window.rouletteLobby.getCurrentRoom();
            if (room && room.roundMaxBet && (this.totalBetAmount * 2 > room.roundMaxBet)) {
                if (window.rouletteApp && window.rouletteApp.showToast) {
                    window.rouletteApp.showToast(`⚠️ 2배 배팅 시 1판 총 배팅 한도(${room.roundMaxBet.toLocaleString()} Chip)를 초과하게 됩니다.`);
                }
                return;
            }
        }

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
     * 노 모어 벳: 베팅 잠금 설정 (구슬 회전 및 정산 중 원천 차단)
     */
    setLocked(locked) {
        this.isLocked = locked;
        const feltTable = this.container.querySelector('.roulette-felt-table');
        if (feltTable) {
            feltTable.classList.toggle('table-locked', locked);
        }
        const spots = this.container.querySelectorAll('.bet-spot');
        spots.forEach(s => {
            if (locked) s.classList.add('locked');
            else s.classList.remove('locked');
        });

        // 하단 칩 컨트롤 패널도 동시 잠금/해제
        const controlsPanel = document.querySelector('.table-controls-panel');
        if (controlsPanel) {
            controlsPanel.classList.toggle('controls-locked', locked);
        }
    }

    /**
     * 당첨 번호 위에 최고급 24K 황동 & 입체 크리스탈 체스 나이트 말머리 돌리 마커 세우기 애니메이션
     * @param {string|number} winningNumber - 당첨 번호 (0~36 또는 '00')
     */
    placeDolly(winningNumber) {
        const spot = this.container.querySelector(`#spot-${winningNumber}`);
        if (!spot || !this.dollyElement) return;

        // 기존 하이라이트 초기화
        this.clearHighlights();

        // [핵심 개선: 당첨 번호 셀에 직접 안착 (Direct Child Mounting)]
        // 셀 내부 정중앙(50%, 50%)에 100% 영구 고정되어 테이블 스크롤/크기 변화에도 오차 0% 보장
        spot.appendChild(this.dollyElement);
        this.dollyElement.style.display = 'flex';
        this.dollyElement.style.left = '50%';
        this.dollyElement.style.top = '50%';
        this.dollyElement.classList.remove('dolly-drop');
        // 애니메이션 강제 리플로우
        void this.dollyElement.offsetWidth;
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
        const winStr = String(winningNumber);
        const isGreenZero = (winStr === '0' || winStr === '00');

        // 당첨된 스팟 ID 목록 구성
        const winningSpotIds = new Set();
        winningSpotIds.add(`spot-${winStr}`);

        if (!isGreenZero) {
            const numInt = parseInt(winStr, 10);
            // 색상
            winningSpotIds.add(this.redNumbers.includes(numInt) ? 'spot-red' : 'spot-black');
            // 홀짝
            winningSpotIds.add(numInt % 2 === 0 ? 'spot-even' : 'spot-odd');
            // 하이로우
            winningSpotIds.add(numInt <= 18 ? 'spot-low' : 'spot-high');
            // 다즌
            if (numInt <= 12) winningSpotIds.add('spot-dozen1');
            else if (numInt <= 24) winningSpotIds.add('spot-dozen2');
            else winningSpotIds.add('spot-dozen3');
            // 컬럼
            if (numInt % 3 === 1) winningSpotIds.add('spot-col1');
            else if (numInt % 3 === 2) winningSpotIds.add('spot-col2');
            else if (numInt % 3 === 0) winningSpotIds.add('spot-col3');
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
                const nums = numbersStr.split(',').map(n => n.trim());
                if (nums.includes(winStr)) {
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
            const feltTable = this.container ? this.container.querySelector('.roulette-felt-table') : null;
            if (feltTable && this.dollyElement.parentElement !== feltTable) {
                feltTable.appendChild(this.dollyElement);
            }
        }
        this.clearHighlights();
        this.clearAllChips();
    }

    /**
     * 당첨된 외부 배팅 구역 하이라이트
     */
    highlightWinningOutsideBets(winningNumber) {
        const winStr = String(winningNumber);
        const isGreen = (winStr === '0' || winStr === '00');
        if (isGreen) return; // 0과 00은 외부 배팅 모두 낙첨

        const numInt = parseInt(winStr, 10);

        // 1. 색상
        const isRed = this.redNumbers.includes(numInt);
        const colorSpot = this.container.querySelector(isRed ? '#spot-red' : '#spot-black');
        if (colorSpot) colorSpot.classList.add('winning-spot');

        // 2. 홀수 / 짝수
        const isEven = numInt % 2 === 0;
        const paritySpot = this.container.querySelector(isEven ? '#spot-even' : '#spot-odd');
        if (paritySpot) paritySpot.classList.add('winning-spot');

        // 3. 하이 / 로우 (1-18 / 19-36)
        const isLow = numInt >= 1 && numInt <= 18;
        const rangeSpot = this.container.querySelector(isLow ? '#spot-low' : '#spot-high');
        if (rangeSpot) rangeSpot.classList.add('winning-spot');

        // 4. 다즌 (1st 12, 2nd 12, 3rd 12)
        let dozenId = '#spot-dozen1';
        if (numInt >= 13 && numInt <= 24) dozenId = '#spot-dozen2';
        else if (numInt >= 25 && numInt <= 36) dozenId = '#spot-dozen3';
        const dozenSpot = this.container.querySelector(dozenId);
        if (dozenSpot) dozenSpot.classList.add('winning-spot');

        // 5. 컬럼 (col1: 1,4,7... / col2: 2,5,8... / col3: 3,6,9...)
        let colId = '#spot-col1';
        if (numInt % 3 === 2) colId = '#spot-col2';
        else if (numInt % 3 === 0) colId = '#spot-col3';
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

        // 관리자가 설정한 공식 배당률 참조 (미설정 시 38:1 정통 배당 기본 적용)
        const p = (window.rouletteStats && window.rouletteStats.payouts) ? window.rouletteStats.payouts : {
            straight: 38, split: 17, street: 11, corner: 8, sixline: 5, dozen: 2, column: 2, evenodd: 1, redblack: 1, highlow: 1
        };

        for (const [spotId, bet] of Object.entries(this.bets)) {
            let won = false;
            let multiplier = 0;

            const winStr = String(winningNumber);
            const isGreen = (winStr === '0' || winStr === '00');
            const numInt = parseInt(winStr, 10);

            if (bet.type === 'straight') {
                if (String(bet.numbers) === winStr) {
                    won = true;
                    multiplier = (p.straight || 38) + 1; // 배당(38배) + 본인 원금(1배) = 총 39배
                }
            } else if (!isGreen) {
                // 0, 00이 아닌 경우에만 외부 배팅(1:1, 2:1) 인정
                if (bet.type === 'red' && this.redNumbers.includes(numInt)) {
                    won = true;
                    multiplier = (p.redblack || 1) + 1;
                } else if (bet.type === 'black' && this.blackNumbers.includes(numInt)) {
                    won = true;
                    multiplier = (p.redblack || 1) + 1;
                } else if (bet.type === 'even' && numInt % 2 === 0) {
                    won = true;
                    multiplier = (p.evenodd || 1) + 1;
                } else if (bet.type === 'odd' && numInt % 2 !== 0) {
                    won = true;
                    multiplier = (p.evenodd || 1) + 1;
                } else if (bet.type === 'low' && numInt >= 1 && numInt <= 18) {
                    won = true;
                    multiplier = (p.highlow || 1) + 1;
                } else if (bet.type === 'high' && numInt >= 19 && numInt <= 36) {
                    won = true;
                    multiplier = (p.highlow || 1) + 1;
                } else if (bet.type === 'dozen') {
                    if (bet.numbers === '1-12' && numInt >= 1 && numInt <= 12) won = true;
                    else if (bet.numbers === '13-24' && numInt >= 13 && numInt <= 24) won = true;
                    else if (bet.numbers === '25-36' && numInt >= 25 && numInt <= 36) won = true;
                    if (won) multiplier = (p.dozen || 2) + 1;
                } else if (bet.type === 'column') {
                    if (bet.numbers === 'col1' && numInt % 3 === 1) won = true;
                    else if (bet.numbers === 'col2' && numInt % 3 === 2) won = true;
                    else if (bet.numbers === 'col3' && numInt % 3 === 0) won = true;
                    if (won) multiplier = (p.column || 2) + 1;
                }
            }

            // 인사이드 복합 배팅 (스플릿, 스트리트, 코너, 식스라인 - 0 및 00 스플릿 포함)
            if (!won) {
                if (bet.type === 'split') {
                    const nums = bet.numbers.split(',').map(n => n.trim());
                    if (nums.includes(winStr)) {
                        won = true;
                        multiplier = (p.split || 17) + 1;
                    }
                } else if (bet.type === 'street') {
                    const nums = bet.numbers.split(',').map(n => n.trim());
                    if (nums.includes(winStr)) {
                        won = true;
                        multiplier = (p.street || 11) + 1;
                    }
                } else if (bet.type === 'corner') {
                    const nums = bet.numbers.split(',').map(n => n.trim());
                    if (nums.includes(winStr)) {
                        won = true;
                        multiplier = (p.corner || 8) + 1;
                    }
                } else if (bet.type === 'sixline') {
                    const nums = bet.numbers.split(',').map(n => n.trim());
                    if (nums.includes(winStr)) {
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
        const winStr = String(winningNumber);
        const isGreen = (winStr === '0' || winStr === '00');
        const numInt = parseInt(winStr, 10);
        const isRed = !isGreen && this.redNumbers.includes(numInt);
        const colorName = winStr === '00' ? 'GREEN (DOUBLE ZERO)' : (isGreen ? 'GREEN (ZERO)' : (isRed ? 'RED' : 'BLACK'));
        const parity = isGreen ? '' : (numInt % 2 === 0 ? 'EVEN' : 'ODD');
        const descText = parity ? `${colorName} / ${parity}` : colorName;

        if (numBadge) {
            numBadge.textContent = winStr;
            numBadge.className = `badge-number ${isGreen ? 'text-green' : (isRed ? 'text-red' : 'text-black')}`;
        }
        if (descEl) descEl.textContent = descText;
        if (payoutVal) {
            payoutVal.textContent = totalPayout > 0 ? `+₩ ${totalPayout.toLocaleString()}` : `₩ 0 (낙첨)`;
            payoutVal.style.color = totalPayout > 0 ? '#2ecc71' : '#a0a6b2';
        }

        // 당첨 번호 주변 3개 번호 선별 (예: 17번이면 16, 17, 18 등)
        let displayNumbers = [];
        if (winStr === '00') {
            displayNumbers = ['0', '00', 2];
        } else if (winStr === '0') {
            displayNumbers = [1, '0', '00'];
        } else if (numInt === 1) {
            displayNumbers = ['0', 1, 2];
        } else if (numInt === 36) {
            displayNumbers = [35, 36, 34];
        } else {
            displayNumbers = [numInt - 1, numInt, numInt + 1];
        }

        // 대형 셀 HTML 조립 (각 번호에 실제 놓여 있던 칩 정보 포함)
        let html = '';
        displayNumbers.forEach(n => {
            const isWin = String(n) === winStr;
            const nStr = String(n);
            const nIsGreen = (nStr === '0' || nStr === '00');
            const nIsRed = !nIsGreen && this.redNumbers.includes(parseInt(nStr, 10));
            const bgClass = nIsGreen ? 'spot-zero' : (nIsRed ? 'spot-red' : 'spot-black');

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

