/**
 * 🎡 최고급 전통 카지노 6개 룰렛 방(Room) 로비 & 가상 AI 플레이어 시스템
 * 방별 등급, 베팅 한도, 최근 10회 히스토리, 핫/콜드 번호 통계 및 실감 나는 테이블 착석 연출
 */

class RouletteLobby {
    constructor() {
        this.currentRoomId = 1;
        this.rooms = [
            {
                id: 1,
                name: "모나코 클래식",
                subName: "Monaco Classic",
                minBet: 1000,
                maxBet: 500000,
                playersCount: 4,
                accentColor: "#2ecc71",
                history: [7, 28, 12, 35, 3, 26, 0, 32, 15, 19],
                description: "유럽 지중해의 정취가 살아있는 모나코 정통 카지노 룸"
            },
            {
                id: 2,
                name: "라스베이거스 벨라지오",
                subName: "Bellagio Suite",
                minBet: 5000,
                maxBet: 2000000,
                playersCount: 6,
                accentColor: "#3498db",
                history: [22, 18, 29, 7, 28, 12, 17, 34, 6, 27],
                description: "화려한 분수와 네온이 빛나는 라스베이거스 프리미엄 룸"
            },
            {
                id: 3,
                name: "몬테카를로 로열",
                subName: "Monte Carlo Royal",
                minBet: 10000,
                maxBet: 5000000,
                playersCount: 5,
                accentColor: "#f1c40f",
                history: [11, 30, 8, 23, 10, 5, 24, 16, 33, 1],
                description: "유럽 귀족들의 사교 클럽을 재현한 럭셔리 하이롤러 살롱"
            },
            {
                id: 4,
                name: "마카오 갤럭시 VIP",
                subName: "Galaxy VIP Club",
                minBet: 50000,
                maxBet: 10000000,
                playersCount: 7,
                accentColor: "#e67e22",
                history: [4, 21, 2, 25, 17, 34, 6, 20, 14, 31],
                description: "화려한 황금빛 아시아 최대 카지노 마카오 VIP 전용 룸"
            },
            {
                id: 5,
                name: "런던 리츠 프라이빗",
                subName: "The Ritz Private",
                minBet: 100000,
                maxBet: 20000000,
                playersCount: 3,
                accentColor: "#9b59b6",
                history: [13, 36, 11, 30, 8, 23, 10, 29, 7, 28],
                description: "영국 메이페어 귀족 클럽의 품격을 담은 프라이빗 하이리밋 룸"
            },
            {
                id: 6,
                name: "두바이 엠페러 스위트",
                subName: "Emperor Suite",
                minBet: 500000,
                maxBet: 50000000,
                playersCount: 2,
                accentColor: "#e74c3c",
                history: [0, 32, 15, 19, 4, 21, 35, 3, 26, 9],
                description: "초호화 7성급 펜트하우스에서 펼쳐지는 최고 권위의 VVIP 룸"
            }
        ];

        // 가상 카지노 AI VIP 플레이어들
        this.aiPlayers = [
            { id: 'ai-1', name: '알렉산더 🇬🇧', balance: 50000000, avatar: '👑', betPreference: 'outside' },
            { id: 'ai-2', name: '이자벨라 🇲🇨', balance: 80000000, avatar: '💎', betPreference: 'straight' },
            { id: 'ai-3', name: '첸웨이 🇲🇴', balance: 120000000, avatar: '🐉', betPreference: 'dozen' },
            { id: 'ai-4', name: '켄지 🇯🇵', balance: 45000000, avatar: '⚡', betPreference: 'column' }
        ];

        this.initLobbyUI();
    }

    /**
     * 현재 활성화된 룸 정보 반환
     */
    getCurrentRoom() {
        return this.rooms.find(r => r.id === this.currentRoomId) || this.rooms[0];
    }

    /**
     * 로비 카드 목록 렌더링
     */
    initLobbyUI() {
        const lobbyGrid = document.getElementById('lobby-room-grid');
        if (!lobbyGrid) return;

        let html = '';
        this.rooms.forEach(room => {
            const stats = this.calculateRoomStats(room.history);
            html += `
                <div class="lobby-room-card" data-room-id="${room.id}" style="--room-accent: ${room.accentColor};">
                    <div class="room-card-badge">ROOM ${room.id}</div>
                    <div class="room-card-header">
                        <h3 class="room-title">${room.name}</h3>
                        <span class="room-subtitle">${room.subName}</span>
                    </div>
                    <p class="room-desc">${room.description}</p>
                    
                    <div class="room-limits">
                        <div class="limit-item">
                            <span class="label">최소 배팅</span>
                            <span class="value">${room.minBet.toLocaleString()} 원</span>
                        </div>
                        <div class="limit-item">
                            <span class="label">최대 배팅</span>
                            <span class="value">${room.maxBet.toLocaleString()} 원</span>
                        </div>
                    </div>

                    <!-- 최근 당첨 번호 히스토리 -->
                    <div class="room-history-preview">
                        <span class="history-label">최근 당첨 번호:</span>
                        <div class="history-chips">
                            ${room.history.slice(-6).map(n => {
                                const c = this.getNumberColor(n);
                                return `<span class="h-chip h-${c}">${n}</span>`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="room-card-footer">
                        <span class="players-online">👥 현재 착석: <strong>${room.playersCount}명</strong></span>
                        <button class="btn-enter-room" onclick="window.rouletteLobby.enterRoom(${room.id})">
                            입장하기 ENTER
                        </button>
                    </div>
                </div>
            `;
        });

        lobbyGrid.innerHTML = html;
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
     * 방별 핫/콜드 번호 통계 계산
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
     * @param {number} roomId - 방 ID (1~6)
     */
    enterRoom(roomId) {
        this.currentRoomId = roomId;
        const room = this.getCurrentRoom();

        // 로비 닫고 게임 화면 전환
        const lobbyModal = document.getElementById('lobby-modal');
        const gameContainer = document.getElementById('game-screen');
        if (lobbyModal) lobbyModal.classList.add('hidden');
        if (gameContainer) gameContainer.classList.remove('hidden');

        // 상단 네비게이션 룸 정보 업데이트
        const roomNameEl = document.getElementById('nav-room-name');
        const roomLimitEl = document.getElementById('nav-room-limits');
        if (roomNameEl) roomNameEl.textContent = `${room.name} (${room.subName})`;
        if (roomLimitEl) roomLimitEl.textContent = `한도: ₩${room.minBet.toLocaleString()} ~ ₩${room.maxBet.toLocaleString()}`;

        // 테이블 최근 히스토리 판 업데이트
        this.updateGameHistoryBar();

        if (window.rouletteApp) {
            window.rouletteApp.onRoomChanged(room);
        }
    }

    /**
     * 게임 화면 상단 최근 당첨 번호 히스토리 보드 업데이트
     */
    updateGameHistoryBar() {
        const historyBar = document.getElementById('table-history-list');
        if (!historyBar) return;

        const room = this.getCurrentRoom();
        let html = '';
        room.history.slice(-10).reverse().forEach(n => {
            const color = this.getNumberColor(n);
            html += `<span class="history-badge badge-${color}">${n}</span>`;
        });
        historyBar.innerHTML = html;
    }

    /**
     * 새 라운드 결과 번호 기록 추가
     * @param {number} winningNumber - 당첨 번호
     */
    recordWinningNumber(winningNumber) {
        const room = this.getCurrentRoom();
        room.history.push(winningNumber);
        if (room.history.length > 20) {
            room.history.shift();
        }
        this.updateGameHistoryBar();
    }

    /**
     * 가상 AI 플레이어들의 자동 베팅 시뮬레이션
     * 테이블에 활기찬 분위기 조성
     */
    simulateAiBets() {
        const aiBets = [];
        const room = this.getCurrentRoom();

        this.aiPlayers.forEach(ai => {
            const betAmount = Math.max(room.minBet, Math.min(room.maxBet, room.minBet * (1 + Math.floor(Math.random() * 5))));
            let betTarget = '';

            if (ai.betPreference === 'outside') {
                const outsides = ['red', 'black', 'even', 'odd', 'low', 'high'];
                betTarget = outsides[Math.floor(Math.random() * outsides.length)];
            } else if (ai.betPreference === 'straight') {
                betTarget = Math.floor(Math.random() * 37).toString();
            } else if (ai.betPreference === 'dozen') {
                const dozens = ['1-12', '13-24', '25-36'];
                betTarget = dozens[Math.floor(Math.random() * dozens.length)];
            } else {
                const cols = ['col1', 'col2', 'col3'];
                betTarget = cols[Math.floor(Math.random() * cols.length)];
            }

            aiBets.push({
                ai: ai,
                target: betTarget,
                amount: betAmount
            });
        });

        this.currentAiBets = aiBets;
        this.renderAiPlayersBar();
        return aiBets;
    }

    /**
     * 가상 AI 플레이어 바 렌더링
     */
    renderAiPlayersBar() {
        const container = document.getElementById('table-ai-players');
        if (!container) return;

        let html = '';
        this.aiPlayers.forEach(ai => {
            const currentBet = this.currentAiBets ? this.currentAiBets.find(b => b.ai.id === ai.id) : null;
            const betText = currentBet ? `베팅: ${currentBet.amount.toLocaleString()}원 (${currentBet.target})` : '대기 중';
            html += `
                <div class="ai-player-card" id="card-${ai.id}">
                    <div class="ai-avatar">${ai.avatar}</div>
                    <div class="ai-info">
                        <span class="ai-name">${ai.name}</span>
                        <span class="ai-bet" id="bet-text-${ai.id}">${betText}</span>
                    </div>
                    <div class="ai-win-bubble" id="win-${ai.id}" style="display: none;"></div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    /**
     * 라운드 종료 시 당첨된 AI 플레이어 축하 연출
     * @param {number} winningNumber - 당첨 번호
     */
    evaluateAiWins(winningNumber) {
        if (!this.currentAiBets) return;

        const isRed = this.getNumberColor(winningNumber) === 'red';
        const isEven = winningNumber !== 0 && winningNumber % 2 === 0;

        this.currentAiBets.forEach(bet => {
            let won = false;
            let winAmount = 0;

            if (bet.target === winningNumber.toString()) {
                won = true;
                winAmount = bet.amount * 36;
            } else if (winningNumber !== 0) {
                if (bet.target === 'red' && isRed) { won = true; winAmount = bet.amount * 2; }
                else if (bet.target === 'black' && !isRed) { won = true; winAmount = bet.amount * 2; }
                else if (bet.target === 'even' && isEven) { won = true; winAmount = bet.amount * 2; }
                else if (bet.target === 'odd' && !isEven) { won = true; winAmount = bet.amount * 2; }
            }

            if (won) {
                bet.ai.balance += winAmount;
                const bubble = document.getElementById(`win-${bet.ai.id}`);
                if (bubble) {
                    bubble.textContent = `+${winAmount.toLocaleString()}원 당첨! 🎉`;
                    bubble.style.display = 'block';
                    bubble.classList.add('pop-animation');
                    setTimeout(() => {
                        bubble.style.display = 'none';
                        bubble.classList.remove('pop-animation');
                    }, 4000);
                }
            }
        });
    }
}

// 글로벌 인스턴스
window.rouletteLobby = new RouletteLobby();
