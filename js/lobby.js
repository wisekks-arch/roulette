/**
 * 🎡 Lucky Roulette 4개 룸(Room) 로비 & 다중 AI 봇 플레이어 시스템
 * 방별 등급(한도), 최대 정원 8명(현재/8명), 2~3명의 활성 봇 테이블 배팅 연동
 */

class RouletteLobby {
    constructor() {
        this.currentRoomId = 2; // 기본 2번 일반방 입장
        this.maxPlayers = 8;    // 각 방 최대 참석 정원 8명

        // 정예 4대 카지노 룸 구성
        this.rooms = [
            {
                id: 1,
                name: "초급방 (모나코 클래식)",
                subName: "Monaco Classic",
                minBet: 100,
                maxBet: 10000,
                currentPlayers: 4,
                accentColor: "#10b981",
                badgeClass: "badge-green",
                history: [7, 28, 12, 35, 3, 26, 0, 32, 15, 19],
                description: "부담 없는 소액 칩으로 즐기는 입문자 룰렛 테이블"
            },
            {
                id: 2,
                name: "일반방 (라스베이거스 벨라지오)",
                subName: "Bellagio Suite",
                minBet: 1000,
                maxBet: 100000,
                currentPlayers: 5,
                accentColor: "#3b82f6",
                badgeClass: "badge-blue",
                history: [22, 18, 29, 7, 28, 12, 17, 34, 6, 27],
                description: "정통 카지노의 분위기를 만끽할 수 있는 스탠다드 룸"
            },
            {
                id: 3,
                name: "고급방 (마카오 갤럭시 VIP)",
                subName: "Galaxy VIP Club",
                minBet: 5000,
                maxBet: 500000,
                currentPlayers: 6,
                accentColor: "#f59e0b",
                badgeClass: "badge-gold",
                history: [4, 21, 2, 25, 17, 34, 6, 20, 14, 31],
                description: "화려한 황금빛 아시아 최대 카지노 하이롤러 룸"
            },
            {
                id: 4,
                name: "VIP방 (두바이 펜트하우스)",
                subName: "Penthouse Suite",
                minBet: 10000,
                maxBet: 10000000,
                currentPlayers: 3,
                accentColor: "#ef4444",
                badgeClass: "badge-red",
                history: [0, 32, 15, 19, 4, 21, 35, 3, 26, 9],
                description: "초호화 7성급 펜트하우스 VVIP 최고 한도 프라이빗 룸"
            }
        ];

        // 테이블에 함께 착석하여 배팅하는 3명의 AI 봇 플레이어
        this.activeBots = [
            {
                id: 'bot-1',
                name: '제임스 🇬🇧',
                avatar: '🎩',
                role: 'VIP 하이롤러',
                balance: 4850000,
                chipClass: 'chip-bot-blue',
                chipColor: '#2563eb',
                preference: 'straight', // 스트레이트/인사이드 선호
                lastBet: null
            },
            {
                id: 'bot-2',
                name: '엘레나 🇲🇨',
                avatar: '💎',
                role: '프로 베터',
                balance: 12400000,
                chipClass: 'chip-bot-purple',
                chipColor: '#9333ea',
                preference: 'outside', // 빨강/검정/홀짝 선호
                lastBet: null
            },
            {
                id: 'bot-3',
                name: '마이클 🇺🇸',
                avatar: '⚡',
                role: '럭키 갬블러',
                balance: 3200000,
                chipClass: 'chip-bot-emerald',
                chipColor: '#059669',
                preference: 'dozen', // 다즌/컬럼 선호
                lastBet: null
            }
        ];

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
                            <span class="limit-label">베팅 한도</span>
                            <span class="limit-val">${room.minBet.toLocaleString()} ~ ${room.maxBet.toLocaleString()} Chip</span>
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
     * 번호 색상 반환
     */
    getNumberColor(num) {
        if (num === 0) return 'green';
        const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        return reds.includes(num) ? 'red' : 'black';
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
            roomLimitEl.textContent = `한도: ${room.minBet.toLocaleString()} ~ ${room.maxBet.toLocaleString()} Chip`;
        }

        this.initLobbyUI();
        this.renderTablePlayersBar();

        if (window.rouletteApp) {
            window.rouletteApp.onRoomChanged(room);
        }
    }

    /**
     * 테이블 상단 참석자 바 렌더링 (나 + 봇 3명, 최대 8명)
     */
    renderTablePlayersBar() {
        const container = document.getElementById('table-players-bar');
        if (!container) return;

        const room = this.getCurrentRoom();
        const userBet = window.rouletteTable ? window.rouletteTable.totalBetAmount : 0;

        let html = `
            <div class="players-bar-header">
                <span class="bar-title">👥 TABLE PLAYERS</span>
                <span class="bar-count-badge">${room.currentPlayers} / ${this.maxPlayers}명 참석 중</span>
            </div>
            <div class="players-chips-list">
                <!-- 나 (Player) -->
                <div class="player-badge is-me">
                    <span class="p-avatar">🧑</span>
                    <div class="p-info">
                        <span class="p-name">나 (YOU)</span>
                        <span class="p-bet" id="my-bar-bet">${userBet > 0 ? userBet.toLocaleString() + ' Chip' : '배팅 대기'}</span>
                    </div>
                    <span class="p-color-dot my-dot"></span>
                </div>
        `;

        // 봇 플레이어들
        this.activeBots.forEach(bot => {
            const betText = bot.lastBet ? `${bot.lastBet.amount.toLocaleString()} Chip (${bot.lastBet.targetName})` : '배팅 중...';
            html += `
                <div class="player-badge bot-badge" id="player-badge-${bot.id}">
                    <span class="p-avatar">${bot.avatar}</span>
                    <div class="p-info">
                        <span class="p-name">${bot.name}</span>
                        <span class="p-bet" id="badge-bet-${bot.id}">${betText}</span>
                    </div>
                    <span class="p-color-dot" style="background-color: ${bot.chipColor}"></span>
                </div>
            `;
        });

        // 빈 좌석 (최대 8명 표시)
        const emptySeats = this.maxPlayers - (1 + this.activeBots.length);
        for (let i = 0; i < emptySeats; i++) {
            html += `
                <div class="player-badge empty-seat">
                    <span class="p-avatar">🪑</span>
                    <span class="p-name">빈 좌석</span>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;
    }

    /**
     * 봇 플레이어들의 실시간 테이블 배팅 시뮬레이션
     * 배팅 타임(15초) 동안 봇들이 1~9초 간격으로 테이블 여러 스팟에 직접 칩을 배치
     */
    simulateAiBets() {
        this.botTimeouts.forEach(t => clearTimeout(t));
        this.botTimeouts = [];
        this.currentAiBets = [];

        const room = this.getCurrentRoom();

        this.activeBots.forEach((bot, index) => {
            bot.lastBet = null;
            const betEl = document.getElementById(`badge-bet-${bot.id}`);
            if (betEl) betEl.textContent = '배팅 고민 중...';

            // 각 봇마다 1~2회에 걸쳐 분산 배팅 수행
            const betCount = Math.random() > 0.4 ? 2 : 1;
            for (let b = 0; b < betCount; b++) {
                const delay = 1200 + index * 1400 + b * 3200 + Math.random() * 1800;

                const t = setTimeout(() => {
                    if (!window.rouletteTable || (window.rouletteApp && window.rouletteApp.currentPhase !== 'BETTING')) return;

                    const chipUnit = room.minBet >= 1000 ? (room.minBet >= 5000 ? 10000 : 5000) : 500;
                    const multiplier = Math.floor(Math.random() * 3) + 1;
                    const amount = Math.min(room.maxBet, Math.max(room.minBet, chipUnit * multiplier));

                    let targetSpot = '';
                    let targetName = '';

                    if (bot.preference === 'straight') {
                        const luckyNum = Math.floor(Math.random() * 37);
                        targetSpot = luckyNum.toString();
                        targetName = `#${luckyNum}`;
                    } else if (bot.preference === 'outside') {
                        const outsides = [
                            { spot: 'red', name: 'RED' },
                            { spot: 'black', name: 'BLACK' },
                            { spot: 'even', name: 'EVEN' },
                            { spot: 'odd', name: 'ODD' }
                        ];
                        const pick = outsides[Math.floor(Math.random() * outsides.length)];
                        targetSpot = pick.spot;
                        targetName = pick.name;
                    } else {
                        const dozens = [
                            { spot: '1-12', name: '1st 12' },
                            { spot: '13-24', name: '2nd 12' },
                            { spot: '25-36', name: '3rd 12' }
                        ];
                        const pick = dozens[Math.floor(Math.random() * dozens.length)];
                        targetSpot = pick.spot;
                        targetName = pick.name;
                    }

                    bot.lastBet = { targetSpot, targetName, amount };

                    // 테이블에 실제 봇 칩 배치
                    window.rouletteTable.placeBotBet(bot, targetSpot, amount);

                    // 참석자 바 배팅 현황 갱신
                    const badgeBet = document.getElementById(`badge-bet-${bot.id}`);
                    if (badgeBet) {
                        badgeBet.textContent = `${amount.toLocaleString()} Chip (${targetName})`;
                        badgeBet.classList.add('pop-animation');
                        setTimeout(() => badgeBet.classList.remove('pop-animation'), 1000);
                    }

                    this.currentAiBets.push({
                        bot: bot,
                        targetSpot: targetSpot,
                        amount: amount
                    });
                }, delay);

                this.botTimeouts.push(t);
            }
        });
    }

    /**
     * 회차 당첨 번호 결과 시 봇 정산
     */
    onSpinResult(winningNumber) {
        const isRed = this.getNumberColor(winningNumber) === 'red';
        const isEven = winningNumber !== 0 && winningNumber % 2 === 0;

        this.currentAiBets.forEach(bet => {
            let won = false;
            let winAmount = 0;

            if (bet.targetSpot === winningNumber.toString()) {
                won = true;
                winAmount = bet.amount * 36;
            } else if (winningNumber !== 0) {
                if (bet.targetSpot === 'red' && isRed) { won = true; winAmount = bet.amount * 2; }
                else if (bet.targetSpot === 'black' && !isRed) { won = true; winAmount = bet.amount * 2; }
                else if (bet.targetSpot === 'even' && isEven) { won = true; winAmount = bet.amount * 2; }
                else if (bet.targetSpot === 'odd' && !isEven) { won = true; winAmount = bet.amount * 2; }
                else if (bet.targetSpot === '1-12' && winningNumber <= 12) { won = true; winAmount = bet.amount * 3; }
                else if (bet.targetSpot === '13-24' && winningNumber >= 13 && winningNumber <= 24) { won = true; winAmount = bet.amount * 3; }
                else if (bet.targetSpot === '25-36' && winningNumber >= 25) { won = true; winAmount = bet.amount * 3; }
            }

            const badgeBet = document.getElementById(`badge-bet-${bet.bot.id}`);
            if (badgeBet) {
                if (won) {
                    bet.bot.balance += winAmount;
                    badgeBet.textContent = `🎉 +${winAmount.toLocaleString()} Chip 적중!`;
                    badgeBet.style.color = '#fbbf24';
                } else {
                    bet.bot.balance -= bet.amount;
                    badgeBet.textContent = `낙첨 (-${bet.amount.toLocaleString()})`;
                    badgeBet.style.color = '#94a3b8';
                }
            }
        });
    }
}

// 글로벌 인스턴스
window.rouletteLobby = new RouletteLobby();
