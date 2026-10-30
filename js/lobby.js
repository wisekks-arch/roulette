/**
 * 🎡 Lucky Roulette 4개 룸(Room) 로비 & 다중 AI 봇 플레이어 시스템
 * 방별 등급(한도), 최대 정원 8명(현재/8명), 2~3명의 활성 봇 테이블 배팅 연동
 */

class RouletteLobby {
    constructor() {
        this.currentRoomId = 2; // 기본 2번 일반방 입장
        this.maxPlayers = 5;    // 각 테이블 최대 참석 정원 5명

        // 4대 정예 카지노 룰렛 테이블 룸 구성 (각 방 5인 정원, 전담 딜러 및 2~4명 봇 상주)
        this.rooms = [
            {
                id: 1,
                name: "초급방 (모나코 클래식)",
                subName: "Monaco Classic",
                minBet: 100,
                maxBet: 10000,
                roundMaxBet: 50000, // 1인당 1판 총 배팅 한도: 50,000 Chip
                currentPlayers: 3, // 나(1) + 봇(2) = 3/5명
                accentColor: "#10b981",
                badgeClass: "badge-green",
                history: [7, 28, 12, 35, 3, 26, 0, 32, 15, 19],
                description: "부담 없는 소액 칩으로 즐기는 입문자 룰렛 테이블 (봇 2명 상주)",
                dealer: {
                    name: "딜러 소피 (Dealer Sophie 🇫🇷)",
                    avatar: "👱‍♀️",
                    title: "모나코 수석 크루피에"
                },
                bots: [
                    {
                        id: 'bot-101',
                        name: '제임스 🇬🇧',
                        avatar: '🎩',
                        role: '신사 베터',
                        balance: 450000,
                        chipClass: 'chip-bot-blue',
                        chipColor: '#3b82f6',
                        preference: 'outside',
                        lastBet: null
                    },
                    {
                        id: 'bot-102',
                        name: '소피아 🇫🇷',
                        avatar: '👒',
                        role: '모나코 로컬',
                        balance: 820000,
                        chipClass: 'chip-bot-pink',
                        chipColor: '#f43f5e',
                        preference: 'dozen',
                        lastBet: null
                    }
                ]
            },
            {
                id: 2,
                name: "일반방 (라스베이거스 벨라지오)",
                subName: "Bellagio Suite",
                minBet: 1000,
                maxBet: 100000,
                roundMaxBet: 500000, // 1인당 1판 총 배팅 한도: 500,000 Chip
                currentPlayers: 4, // 나(1) + 봇(3) = 4/5명
                accentColor: "#3b82f6",
                badgeClass: "badge-blue",
                history: [22, 18, 29, 7, 28, 12, 17, 34, 6, 27],
                description: "정통 카지노의 분위기를 만끽할 수 있는 스탠다드 룸 (봇 3명 상주)",
                dealer: {
                    name: "딜러 로렌 (Dealer Lauren 🇺🇸)",
                    avatar: "👩‍💼",
                    title: "벨라지오 시니어 딜러"
                },
                bots: [
                    {
                        id: 'bot-201',
                        name: '제임스 🇬🇧',
                        avatar: '🎩',
                        role: 'VIP 하이롤러',
                        balance: 4850000,
                        chipClass: 'chip-bot-blue',
                        chipColor: '#3b82f6',
                        preference: 'straight',
                        lastBet: null
                    },
                    {
                        id: 'bot-202',
                        name: '엘레나 🇲🇨',
                        avatar: '💎',
                        role: '프로 베터',
                        balance: 12400000,
                        chipClass: 'chip-bot-purple',
                        chipColor: '#a855f7',
                        preference: 'outside',
                        lastBet: null
                    },
                    {
                        id: 'bot-203',
                        name: '마이클 🇺🇸',
                        avatar: '⚡',
                        role: '럭키 갬블러',
                        balance: 3200000,
                        chipClass: 'chip-bot-emerald',
                        chipColor: '#10b981',
                        preference: 'dozen',
                        lastBet: null
                    }
                ]
            },
            {
                id: 3,
                name: "고급방 (마카오 갤럭시 VIP)",
                subName: "Galaxy VIP Club",
                minBet: 5000,
                maxBet: 500000,
                roundMaxBet: 3000000, // 1인당 1판 총 배팅 한도: 3,000,000 Chip
                currentPlayers: 5, // 나(1) + 봇(4) = 5/5명 만석!
                accentColor: "#f59e0b",
                badgeClass: "badge-gold",
                history: [4, 21, 2, 25, 17, 34, 6, 20, 14, 31],
                description: "화려한 황금빛 아시아 최대 카지노 하이롤러 룸 (봇 4명 만석)",
                dealer: {
                    name: "딜러 메이링 (Dealer Meiling 🇲🇴)",
                    avatar: "👩‍🦰",
                    title: "마카오 VIP 하이롤러 전담 딜러"
                },
                bots: [
                    {
                        id: 'bot-301',
                        name: '켄지 🇯🇵',
                        avatar: '🥷',
                        role: '도쿄 고래',
                        balance: 38000000,
                        chipClass: 'chip-bot-amber',
                        chipColor: '#f59e0b',
                        preference: 'straight',
                        lastBet: null
                    },
                    {
                        id: 'bot-302',
                        name: '린 🇨🇳',
                        avatar: '🪭',
                        role: '상하이 퀸',
                        balance: 45000000,
                        chipClass: 'chip-bot-pink',
                        chipColor: '#ec4899',
                        preference: 'outside',
                        lastBet: null
                    },
                    {
                        id: 'bot-303',
                        name: '메이슨 🇦🇺',
                        avatar: '🏄‍♂️',
                        role: '시드니 베터',
                        balance: 22000000,
                        chipClass: 'chip-bot-cyan',
                        chipColor: '#06b6d4',
                        preference: 'dozen',
                        lastBet: null
                    },
                    {
                        id: 'bot-304',
                        name: '사라 🇨🇦',
                        avatar: '👑',
                        role: '몬트리올 VIP',
                        balance: 51000000,
                        chipClass: 'chip-bot-purple',
                        chipColor: '#8b5cf6',
                        preference: 'straight',
                        lastBet: null
                    }
                ]
            },
            {
                id: 4,
                name: "VIP방 (두바이 펜트하우스)",
                subName: "Penthouse Suite",
                minBet: 10000,
                maxBet: 10000000,
                roundMaxBet: 50000000, // 1인당 1판 총 배팅 한도: 50,000,000 Chip
                currentPlayers: 4, // 나(1) + 봇(3) = 4/5명
                accentColor: "#ef4444",
                badgeClass: "badge-red",
                history: [0, 32, 15, 19, 4, 21, 35, 3, 26, 9],
                description: "초호화 7성급 펜트하우스 VVIP 최고 한도 프라이빗 룸 (봇 3명 상주)",
                dealer: {
                    name: "딜러 아미라 (Dealer Amira 🇦🇪)",
                    avatar: "👑",
                    title: "두바이 펜트하우스 마스터 딜러"
                },
                bots: [
                    {
                        id: 'bot-401',
                        name: '타릭 🇦🇪',
                        avatar: '👳‍♂️',
                        role: '두바이 셰이크',
                        balance: 98000000,
                        chipClass: 'chip-bot-amber',
                        chipColor: '#f59e0b',
                        preference: 'straight',
                        lastBet: null
                    },
                    {
                        id: 'bot-402',
                        name: '이사벨라 🇮🇹',
                        avatar: '💃',
                        role: '밀라노 패션VIP',
                        balance: 75000000,
                        chipClass: 'chip-bot-purple',
                        chipColor: '#a855f7',
                        preference: 'outside',
                        lastBet: null
                    },
                    {
                        id: 'bot-403',
                        name: '빅토르 🇷🇺',
                        avatar: '🦁',
                        role: '모스크바 거물',
                        balance: 89000000,
                        chipClass: 'chip-bot-cyan',
                        chipColor: '#0ea5e9',
                        preference: 'dozen',
                        lastBet: null
                    }
                ]
            }
        ];

        // 현재 입장 룸의 봇 리스트 (기본 2번방 봇들)
        this.activeBots = this.rooms[1].bots;
        this.currentAiBets = [];
        this.botTimeouts = [];

        this.initLobbyUI();
    }

    /**
     * 현재 선택된 룸 정보 반환
     */
    getCurrentRoom() {
        return this.rooms.find(r => r.id === this.currentRoomId) || this.rooms[1];
    }

    /**
     * 로비 모달 카드 그리드 렌더링
     */
    initLobbyUI() {
        const grid = document.getElementById('lobby-room-grid');
        if (!grid) return;

        grid.innerHTML = this.rooms.map(room => {
            const stats = this.calculateRoomStats(room.history);
            return `
                <div class="lobby-room-card ${room.id === this.currentRoomId ? 'active-room' : ''}" data-room-id="${room.id}">
                    <div class="card-header" style="border-top-color: ${room.accentColor}">
                        <div class="room-title-box">
                            <span class="room-id-tag">ROOM ${room.id}</span>
                            <h3 class="room-name">${room.name}</h3>
                            <span class="room-sub">${room.subName}</span>
                        </div>
                        <div class="room-players-badge">
                            <span class="pulse-dot"></span>
                            <span class="count">${room.currentPlayers} / ${this.maxPlayers}명</span>
                        </div>
                    </div>

                    <div class="card-body">
                        <p class="room-desc">${room.description}</p>
                        <div class="room-limits">
                            <span class="limit-label">스팟 한도:</span>
                            <span class="limit-val">${room.minBet.toLocaleString()} ~ ${room.maxBet.toLocaleString()} Chip</span>
                        </div>
                        <div class="room-limits" style="margin-top: 2px;">
                            <span class="limit-label">1판 총 한도:</span>
                            <span class="limit-val" style="color: #ffd700; font-weight: 700;">최대 ${room.roundMaxBet ? room.roundMaxBet.toLocaleString() : (room.maxBet * 5).toLocaleString()} Chip</span>
                        </div>

                        <!-- 최근 10회 히스토리 바 -->
                        <div class="room-history-preview">
                            <span class="history-label">최근 10회 결과:</span>
                            <div class="history-chips">
                                ${room.history.slice(-10).reverse().map(n => {
                                    const color = this.getNumberColor(n);
                                    return `<span class="mini-badge badge-${color}">${n}</span>`;
                                }).join('')}
                            </div>
                        </div>

                        <!-- 핫 & 콜드 프리뷰 -->
                        <div class="room-hot-cold">
                            <span class="hc-item hot">🔥 HOT: ${stats.hot.join(', ')}</span>
                            <span class="hc-item cold">❄️ COLD: ${stats.cold.join(', ')}</span>
                        </div>

                        <!-- 전담 딜러 배지 -->
                        <div class="room-dealer-badge" style="margin-top: 8px; font-size: 0.8rem; color: #fbbf24;">
                            <span>${room.dealer ? room.dealer.avatar + ' ' + room.dealer.name : '👩‍💼 카지노 전담 딜러'}</span>
                        </div>
                    </div>

                    <div class="card-footer">
                        <button class="btn-enter-room" onclick="window.rouletteLobby.enterRoom(${room.id})">
                            ${room.id === this.currentRoomId ? '✓ 현재 입장 중' : '테이블 입장하기 ➔'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 번호 색상 반환 (0, 00 녹색, 1~36 빨강/검정)
     */
    getNumberColor(num) {
        const s = String(num);
        if (s === '0' || s === '00') return 'green';
        const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        return reds.includes(parseInt(s, 10)) ? 'red' : 'black';
    }

    /**
     * 핫/콜드 번호 계산
     */
    calculateRoomStats(history) {
        const counts = {};
        for (let i = 0; i <= 36; i++) counts[i] = 0;
        history.forEach(n => counts[n] = (counts[n] || 0) + 1);

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const hot = sorted.slice(0, 3).map(item => parseInt(item[0], 10));
        const cold = sorted.slice(-3).map(item => parseInt(item[0], 10));

        return { hot, cold };
    }

    /**
     * 특정 룰렛 방 입장
     */
    enterRoom(roomId) {
        this.currentRoomId = roomId;
        const room = this.getCurrentRoom();

        // 룸에 소속된 2~4명의 봇 풀로 전환
        this.activeBots = room.bots || [];
        this.botTimeouts.forEach(t => clearTimeout(t));
        this.botTimeouts = [];
        this.currentAiBets = [];

        // 모달 닫기
        const lobbyModal = document.getElementById('lobby-modal');
        if (lobbyModal) lobbyModal.classList.add('hidden');

        // 상단 헤더 룸 정보 및 인원 업데이트
        const roomNameEl = document.getElementById('nav-room-name');
        const roomLimitEl = document.getElementById('nav-room-limits');
        if (roomNameEl) {
            roomNameEl.textContent = `${room.name} (${room.currentPlayers}/${this.maxPlayers}명)`;
        }
        if (roomLimitEl) {
            const roundMaxStr = room.roundMaxBet ? room.roundMaxBet.toLocaleString() : (room.maxBet * 5).toLocaleString();
            roomLimitEl.textContent = `한도: 스팟 ${room.minBet.toLocaleString()}~${room.maxBet.toLocaleString()} | 판당 최대 ${roundMaxStr} Chip`;
        }

        // [핵심] 상단 딜러 배너의 전담 딜러 프로필 업데이트
        if (room.dealer) {
            const dealerAvatarEl = document.getElementById('dealer-avatar-icon');
            const dealerNameEl = document.getElementById('dealer-name-text');
            if (dealerAvatarEl) dealerAvatarEl.textContent = room.dealer.avatar;
            if (dealerNameEl) dealerNameEl.textContent = room.dealer.name;
        }

        this.initLobbyUI();
        this.renderTablePlayersBar();

        if (window.rouletteApp) {
            window.rouletteApp.onRoomChanged(room);
        }
    }

    /**
     * 테이블 상단 참석자 바 렌더링 (나 + 봇 2~4명, 최대 5명 정원)
     */
    renderTablePlayersBar() {
        const container = document.getElementById('table-players-bar');
        if (!container) return;

        const room = this.getCurrentRoom();
        const userBet = window.rouletteTable ? window.rouletteTable.totalBetAmount : 0;
        const totalJoined = 1 + this.activeBots.length;

        let html = `
            <div class="players-bar-header">
                <span class="bar-title">👥 TABLE SEATS (정원 5인)</span>
                <span class="bar-count-badge">${totalJoined} / ${this.maxPlayers}명 참석 중</span>
            </div>
            <div class="players-chips-list">
                <!-- 나 (Player) -->
                <div class="player-badge is-me">
                    <span class="p-avatar">🧑</span>
                    <div class="p-info">
                        <span class="p-name">나 (YOU)</span>
                        <span class="p-bet" id="my-bar-bet">${userBet > 0 ? userBet.toLocaleString() + ' Chip' : '배팅 대기'}</span>
                    </div>
                    <span class="p-color-dot my-dot" title="내 배팅 칩 색상"></span>
                </div>
        `;

        // 봇 플레이어들 (2~4명)
        this.activeBots.forEach(bot => {
            const betText = bot.lastBet ? `${bot.lastBet.amount.toLocaleString()} Chip` : '배팅 고민 중...';
            html += `
                <div class="player-badge bot-badge" id="player-badge-${bot.id}">
                    <span class="p-avatar">${bot.avatar}</span>
                    <div class="p-info">
                        <span class="p-name">${bot.name}</span>
                        <span class="p-bet" id="badge-bet-${bot.id}">${betText}</span>
                    </div>
                    <span class="p-color-dot" style="background-color: ${bot.chipColor}" title="${bot.name}의 고유 칩"></span>
                </div>
            `;
        });

        // 빈 좌석 (최대 5석 중 남은 좌석)
        const emptySeats = Math.max(0, this.maxPlayers - totalJoined);
        for (let i = 0; i < emptySeats; i++) {
            html += `
                <div class="player-badge empty-seat">
                    <span class="p-avatar">🪑</span>
                    <div class="p-info">
                        <span class="p-name">빈 좌석</span>
                        <span class="p-bet">입장 가능</span>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;
    }

    /**
     * 봇 플레이어들의 실시간 테이블 다중 배팅 시뮬레이션
     * 배팅 타임(20초) 동안 각 봇이 최소 10개 이상(10~13개)의 다채로운 스팟에 실시간 순차 배팅!
     */
    simulateAiBets() {
        this.botTimeouts.forEach(t => clearTimeout(t));
        this.botTimeouts = [];
        this.currentAiBets = [];

        const room = this.getCurrentRoom();
        if (!room) return;

        // 테이블 상의 유효한 모든 배팅 스팟 요소들 조회
        const availableSpotElements = (window.rouletteTable && window.rouletteTable.container)
            ? Array.from(window.rouletteTable.container.querySelectorAll('.bet-spot'))
            : [];

        if (availableSpotElements.length === 0) return;

        this.activeBots.forEach((bot, botIdx) => {
            bot.currentBetsCount = 0;
            bot.currentBetsAmount = 0;
            bot.roundBets = [];

            const betEl = document.getElementById(`badge-bet-${bot.id}`);
            if (betEl) {
                betEl.textContent = '배팅 준비 중...';
                betEl.style.color = '#e2e8f0';
            }

            // [핵심] 사용자 요청: 각 봇당 최소 10개 이상 (10~13곳) 배팅!
            const betCount = Math.floor(Math.random() * 4) + 10;

            for (let b = 0; b < betCount; b++) {
                // 0.6초부터 17.5초 사이에 순차적으로 배팅이 이루어지도록 타임라인 분산
                const baseDelay = 600 + (b * (16500 / betCount));
                const jitter = (botIdx * 450) + (Math.random() * 600 - 300);
                const delay = Math.max(500, Math.min(17800, baseDelay + jitter));

                const t = setTimeout(() => {
                    // 배팅 페이즈가 아니거나 테이블이 잠겼으면 중단
                    if (!window.rouletteTable || (window.rouletteApp && window.rouletteApp.currentPhase !== 'BETTING')) {
                        return;
                    }

                    // 봇 성향에 따른 스팟 후보 선별
                    let candidateSpots = availableSpotElements;
                    if (bot.preference === 'straight') {
                        // 숫자 및 스플릿 등 인사이드 비중 강화
                        const insides = availableSpotElements.filter(el => 
                            el.classList.contains('spot-number') || el.classList.contains('hotspot-split-h') || el.classList.contains('hotspot-split-v')
                        );
                        if (insides.length > 0 && Math.random() < 0.75) candidateSpots = insides;
                    } else if (bot.preference === 'outside') {
                        // 다즌, 컬럼, 이븐머니 등 아웃사이드 비중 강화
                        const outsides = availableSpotElements.filter(el => el.classList.contains('spot-outside'));
                        if (outsides.length > 0 && Math.random() < 0.75) candidateSpots = outsides;
                    }

                    // 무작위 스팟 선정
                    const chosenSpotEl = candidateSpots[Math.floor(Math.random() * candidateSpots.length)];
                    if (!chosenSpotEl) return;

                    const spotId = chosenSpotEl.id;
                    const betType = chosenSpotEl.dataset.bet || 'straight';
                    const rawNumbers = chosenSpotEl.dataset.numbers || '';
                    const spotTitle = chosenSpotEl.title || chosenSpotEl.textContent.trim() || spotId;

                    // 1인당 1판 총 배팅 한도 초과 시 봇 배팅 중단
                    if (room.roundMaxBet && bot.currentBetsAmount >= room.roundMaxBet) return;

                    // 칩 배팅 금액 (룸 한도 내 합리적 단위)
                    const chipUnit = room.minBet >= 5000 ? 5000 : (room.minBet >= 1000 ? 1000 : (room.minBet >= 500 ? 500 : 100));
                    const multiplier = Math.floor(Math.random() * 3) + 1;
                    let amount = Math.min(room.maxBet, Math.max(room.minBet, chipUnit * multiplier));
                    if (room.roundMaxBet && (bot.currentBetsAmount + amount > room.roundMaxBet)) {
                        amount = room.roundMaxBet - bot.currentBetsAmount;
                        if (amount < room.minBet) return;
                    }

                    // 테이블에 봇 칩 렌더링
                    window.rouletteTable.placeBotBet(bot, spotId, amount);

                    // 누적 정보 갱신
                    bot.currentBetsCount++;
                    bot.currentBetsAmount += amount;

                    const betRecord = {
                        bot: bot,
                        spotId: spotId,
                        betType: betType,
                        numbersStr: rawNumbers,
                        spotTitle: spotTitle,
                        amount: amount
                    };
                    bot.roundBets.push(betRecord);
                    this.currentAiBets.push(betRecord);

                    // 참석자 뱃지 실시간 다채로운 업데이트
                    const badgeBet = document.getElementById(`badge-bet-${bot.id}`);
                    if (badgeBet) {
                        badgeBet.textContent = `배팅 ${bot.currentBetsCount}곳 (${bot.currentBetsAmount.toLocaleString()} Chip)`;
                        badgeBet.classList.add('pop-animation');
                        setTimeout(() => badgeBet.classList.remove('pop-animation'), 600);
                    }
                }, delay);

                this.botTimeouts.push(t);
            }
        });
    }

    /**
     * 배팅 마감(Lockout) 시 봇 타이머 일제 정지 및 배팅 상태 마감 처리
     */
    onBettingClosed() {
        this.botTimeouts.forEach(t => clearTimeout(t));
        this.botTimeouts = [];

        this.activeBots.forEach(bot => {
            const betEl = document.getElementById(`badge-bet-${bot.id}`);
            if (betEl) {
                if (bot.currentBetsCount && bot.currentBetsCount > 0) {
                    betEl.textContent = `✓ 배팅 완료 (${bot.currentBetsCount}곳 / ${bot.currentBetsAmount.toLocaleString()} Chip)`;
                    betEl.style.color = '#10b981';
                } else {
                    betEl.textContent = '⛔ 배팅 마감 (패스)';
                    betEl.style.color = '#94a3b8';
                }
            }
        });
    }

    /**
     * 딜러 당첨 번호 결과 시 봇 다중 배팅 정산
     */
    onSpinResult(winningNumber) {
        const winStr = String(winningNumber);
        const winNum = parseInt(winStr, 10);
        const isRed = this.getNumberColor(winStr) === 'red';
        const isEven = (winStr !== '0' && winStr !== '00') && winNum % 2 === 0;

        // 각 봇별 배당금 집계
        const botResults = {};
        this.activeBots.forEach(bot => {
            botResults[bot.id] = {
                bot: bot,
                totalWon: 0,
                totalBet: bot.currentBetsAmount || 0,
                winHits: 0
            };
        });

        this.currentAiBets.forEach(bet => {
            let won = false;
            let payoutRatio = 0; // 원금 포함 배율

            const numbers = bet.numbersStr ? bet.numbersStr.split(',').map(n => n.trim()) : [];

            // 1. 숫자 포함 여부로 판정하는 인사이드 배팅 (0, 00 포함)
            if (numbers.length > 0 && numbers.includes(winStr)) {
                won = true;
                if (bet.betType === 'straight') payoutRatio = 39; // 38:1 (원금 포함 39배)
                else if (bet.betType === 'split') payoutRatio = 18;
                else if (bet.betType === 'street') payoutRatio = 12;
                else if (bet.betType === 'corner') payoutRatio = 9;
                else if (bet.betType === 'sixline') payoutRatio = 6;
                else payoutRatio = 39 / numbers.length;
            }
            // 2. 아웃사이드 배팅 판정 (단, winStr === '0' 또는 '00'이면 하우스 독식)
            else if (winStr !== '0' && winStr !== '00') {
                if (bet.betType === 'dozen') {
                    if (bet.numbersStr === '1-12' && winNum >= 1 && winNum <= 12) { won = true; payoutRatio = 3; }
                    else if (bet.numbersStr === '13-24' && winNum >= 13 && winNum <= 24) { won = true; payoutRatio = 3; }
                    else if (bet.numbersStr === '25-36' && winNum >= 25 && winNum <= 36) { won = true; payoutRatio = 3; }
                } else if (bet.betType === 'column') {
                    if (bet.numbersStr === 'col1' && winNum % 3 === 1) { won = true; payoutRatio = 3; }
                    else if (bet.numbersStr === 'col2' && winNum % 3 === 2) { won = true; payoutRatio = 3; }
                    else if (bet.numbersStr === 'col3' && winNum % 3 === 0) { won = true; payoutRatio = 3; }
                } else {
                    // 이븐머니 배팅 (1:1 배당 = 원금포함 2배)
                    if (bet.numbersStr === 'red' && isRed) { won = true; payoutRatio = 2; }
                    else if (bet.numbersStr === 'black' && !isRed) { won = true; payoutRatio = 2; }
                    else if (bet.numbersStr === 'even' && isEven) { won = true; payoutRatio = 2; }
                    else if (bet.numbersStr === 'odd' && !isEven) { won = true; payoutRatio = 2; }
                    else if ((bet.numbersStr === 'low' || bet.numbersStr === '1-18') && winNum >= 1 && winNum <= 18) { won = true; payoutRatio = 2; }
                    else if ((bet.numbersStr === 'high' || bet.numbersStr === '19-36') && winNum >= 19 && winNum <= 36) { won = true; payoutRatio = 2; }
                }
            }

            if (won && payoutRatio > 0) {
                const winAmount = bet.amount * payoutRatio;
                if (botResults[bet.bot.id]) {
                    botResults[bet.bot.id].totalWon += winAmount;
                    botResults[bet.bot.id].winHits++;
                }
            }
        });

        // 각 봇의 잔고 업데이트 및 뱃지 결과 표출
        Object.values(botResults).forEach(res => {
            const badgeBet = document.getElementById(`badge-bet-${res.bot.id}`);
            res.bot.balance = Math.max(10000, (res.bot.balance || 1000000) + res.totalWon - res.totalBet);

            if (badgeBet) {
                if (res.totalWon > 0) {
                    badgeBet.textContent = `🎉 당첨! +${res.totalWon.toLocaleString()} Chip (배팅: ${res.totalBet.toLocaleString()})`;
                    badgeBet.style.color = '#ffd700';
                    badgeBet.style.fontWeight = 'bold';
                    badgeBet.classList.add('pop-animation');
                    setTimeout(() => badgeBet.classList.remove('pop-animation'), 1000);
                } else if (res.totalBet > 0) {
                    badgeBet.textContent = `낙첨 (-${res.totalBet.toLocaleString()})`;
                    badgeBet.style.color = '#94a3b8';
                }
            }
        });
    }
}

// 글로벌 인스턴스
window.rouletteLobby = new RouletteLobby();
