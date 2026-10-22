/**
 * 📊 Lucky Roulette 실시간 데이터 통계 및 카지노 관리자 모듈
 * 최근 100회 당첨 분석, 핫/콜드 번호, 개인 전적 통계 및 관리자 콘솔 연동
 */

class RouletteStats {
    constructor() {
        this.history = []; // 최대 100회 최근 당첨 결과
        this.userStats = {
            totalGames: 0,
            totalWins: 0,
            totalBetAmount: 0,
            totalWinAmount: 0,
            maxWinAmount: 0,
            netProfit: 0
        };

        // 초기 카지노 시뮬레이션 데이터 30회 생성
        this.initSampleHistory();
    }

    /**
     * 초기 샘플 히스토리 데이터 생성
     */
    initSampleHistory() {
        const numbers = [
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
            24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ];
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

        for (let i = 0; i < 35; i++) {
            const randNum = numbers[Math.floor(Math.random() * numbers.length)];
            const color = randNum === 0 ? 'green' : (redNumbers.includes(randNum) ? 'red' : 'black');
            this.history.unshift({
                round: 1520 - (35 - i),
                number: randNum,
                color: color,
                timestamp: new Date(Date.now() - (35 - i) * 35000)
            });
        }
    }

    /**
     * 회차 결과 기록
     */
    recordSpin(round, number, color) {
        this.history.unshift({
            round: round,
            number: number,
            color: color,
            timestamp: new Date()
        });

        if (this.history.length > 100) {
            this.history.pop();
        }
    }

    /**
     * 유저 전적 갱신
     */
    recordUserGame(betAmount, winAmount) {
        this.userStats.totalGames += 1;
        this.userStats.totalBetAmount += betAmount;
        this.userStats.totalWinAmount += winAmount;
        this.userStats.netProfit = this.userStats.totalWinAmount - this.userStats.totalBetAmount;

        if (winAmount > 0) {
            this.userStats.totalWins += 1;
            if (winAmount > this.userStats.maxWinAmount) {
                this.userStats.maxWinAmount = winAmount;
            }
        }
    }

    /**
     * 통계 분석 데이터 계산
     */
    getAnalysis() {
        const total = this.history.length;
        if (total === 0) return null;

        let redCount = 0;
        let blackCount = 0;
        let greenCount = 0;
        let oddCount = 0;
        let evenCount = 0;
        let d1Count = 0; // 1~12
        let d2Count = 0; // 13~24
        let d3Count = 0; // 25~36

        const freqMap = {};
        for (let i = 0; i <= 36; i++) {
            freqMap[i] = 0;
        }

        this.history.forEach(item => {
            freqMap[item.number] += 1;

            if (item.number === 0) {
                greenCount++;
            } else {
                if (item.color === 'red') redCount++;
                else blackCount++;

                if (item.number % 2 === 1) oddCount++;
                else evenCount++;

                if (item.number <= 12) d1Count++;
                else if (item.number <= 24) d2Count++;
                else d3Count++;
            }
        });

        // 핫/콜드 번호 정렬
        const sortedFreq = Object.entries(freqMap).map(([num, count]) => ({
            number: parseInt(num, 10),
            count: count
        })).sort((a, b) => b.count - a.count);

        const hotNumbers = sortedFreq.slice(0, 5);
        const coldNumbers = [...sortedFreq].reverse().slice(0, 5);

        return {
            total,
            redPct: Math.round((redCount / total) * 100),
            blackPct: Math.round((blackCount / total) * 100),
            greenPct: Math.round((greenCount / total) * 100),
            oddPct: Math.round((oddCount / total) * 100),
            evenPct: Math.round((evenCount / total) * 100),
            d1Pct: Math.round((d1Count / total) * 100),
            d2Pct: Math.round((d2Count / total) * 100),
            d3Pct: Math.round((d3Count / total) * 100),
            hotNumbers,
            coldNumbers
        };
    }

    /**
     * 통계 모달 UI 렌더링
     */
    renderStatsModal() {
        const container = document.getElementById('stats-modal-body');
        if (!container) return;

        const analysis = this.getAnalysis();
        const winRate = this.userStats.totalGames > 0
            ? Math.round((this.userStats.totalWins / this.userStats.totalGames) * 100)
            : 0;

        container.innerHTML = `
            <div class="stats-grid-container">
                <!-- 1. 최근 100회 색상/속성 비율 -->
                <div class="stats-card">
                    <h3 class="stats-card-title">🎨 최근 ${analysis.total}회 당첨 비율</h3>
                    <div class="stats-bars">
                        <div class="bar-row">
                            <span class="bar-label">레드 / 블랙</span>
                            <div class="dual-bar">
                                <div class="bar-segment red-segment" style="width: ${analysis.redPct}%">${analysis.redPct}%</div>
                                <div class="bar-segment black-segment" style="width: ${analysis.blackPct}%">${analysis.blackPct}%</div>
                            </div>
                        </div>
                        <div class="bar-row">
                            <span class="bar-label">홀수 / 짝수</span>
                            <div class="dual-bar">
                                <div class="bar-segment odd-segment" style="width: ${analysis.oddPct}%">${analysis.oddPct}%</div>
                                <div class="bar-segment even-segment" style="width: ${analysis.evenPct}%">${analysis.evenPct}%</div>
                            </div>
                        </div>
                        <div class="bar-row">
                            <span class="bar-label">다즌 (1st / 2nd / 3rd)</span>
                            <div class="triple-bar">
                                <div class="bar-segment d1-segment" style="width: ${analysis.d1Pct}%">${analysis.d1Pct}%</div>
                                <div class="bar-segment d2-segment" style="width: ${analysis.d2Pct}%">${analysis.d2Pct}%</div>
                                <div class="bar-segment d3-segment" style="width: ${analysis.d3Pct}%">${analysis.d3Pct}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. 핫 & 콜드 넘버 -->
                <div class="stats-card">
                    <h3 class="stats-card-title">🔥 핫 & ❄️ 콜드 번호</h3>
                    <div class="hot-cold-box">
                        <div class="hot-section">
                            <span class="hc-title hot-text">🔥 HOT NUMBERS</span>
                            <div class="hc-badges">
                                ${analysis.hotNumbers.map(n => `
                                    <span class="hc-badge hot-badge">${n.number} <small>(${n.count}회)</small></span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="cold-section">
                            <span class="hc-title cold-text">❄️ COLD NUMBERS</span>
                            <div class="hc-badges">
                                ${analysis.coldNumbers.map(n => `
                                    <span class="hc-badge cold-badge">${n.number} <small>(${n.count}회)</small></span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. 나의 게임 전적 -->
                <div class="stats-card user-perf-card">
                    <h3 class="stats-card-title">🏆 나의 플레이 전적</h3>
                    <div class="perf-grid">
                        <div class="perf-item">
                            <span class="perf-label">진행 판수</span>
                            <span class="perf-val">${this.userStats.totalGames}회</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">승률 (Win Rate)</span>
                            <span class="perf-val gold-val">${winRate}%</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">총 베팅액</span>
                            <span class="perf-val">${this.userStats.totalBetAmount.toLocaleString()} Chip</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">순수익 (Net Profit)</span>
                            <span class="perf-val ${this.userStats.netProfit >= 0 ? 'profit-plus' : 'profit-minus'}">
                                ${this.userStats.netProfit >= 0 ? '+' : ''}${this.userStats.netProfit.toLocaleString()} Chip
                            </span>
                        </div>
                        <div class="perf-item highlight-item">
                            <span class="perf-label">최고 당첨금 (Record Win)</span>
                            <span class="perf-val gold-glow">+${this.userStats.maxWinAmount.toLocaleString()} Chip</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 관리자 모달 UI 렌더링
     */
    renderAdminModal() {
        const tableBody = document.getElementById('admin-logs-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = this.history.slice(0, 15).map(h => {
            const timeStr = h.timestamp.toLocaleTimeString();
            const badgeClass = h.number === 0 ? 'badge-green' : (h.color === 'red' ? 'badge-red' : 'badge-black');
            const totalBet = (Math.floor(Math.random() * 50) + 10) * 10000;
            const payout = (Math.floor(Math.random() * 45) + 5) * 10000;

            return `
                <tr>
                    <td>ROUND #${h.round}</td>
                    <td><span class="admin-num-badge ${badgeClass}">${h.number}</span></td>
                    <td>${totalBet.toLocaleString()} Chip</td>
                    <td>${payout.toLocaleString()} Chip</td>
                    <td>${timeStr}</td>
                </tr>
            `;
        }).join('');
    }
}

// 글로벌 인스턴스 생성
window.rouletteStats = new RouletteStats();
