/**
 * 📊 VIP European Roulette 실시간 통계 및 카지노 관리자(Admin Console) 모듈
 * - 실시간 통계: 최근 100회 분석, 빨강/검정 비율, 홀/짝 비율, 다즌 출현 비율, 핫/콜드 번호
 * - 개인 통계: 총 게임 판수, 승률, 최고 당첨금, 누적 수익
 * - 관리자 기능:
 *   1) 회원 관리: 회원 검색, 이용 정지(Active/Banned 토글), 개별 회원 게임 기록 조회
 *   2) 게임 관리: 10대 배팅별 배당률 커스텀 설정 및 저장, 실시간 공지사항 작성 및 티커 연동
 *   3) 로그 관리: 로그인 이력, 배팅 이력, 당첨 및 정산 이력
 */

class RouletteStats {
    constructor() {
        this.STORAGE_KEY_HISTORY = 'roulette_history_100_v1';
        this.STORAGE_KEY_PAYOUTS = 'roulette_admin_payouts_v1';
        this.STORAGE_KEY_NOTICE = 'roulette_admin_notice_v1';
        this.STORAGE_KEY_BET_LOGS = 'roulette_bet_logs_v1';
        this.STORAGE_KEY_WIN_LOGS = 'roulette_win_logs_v1';

        this.history = this.loadHistory(); // 최대 100회 최근 당첨 결과
        this.betLogs = this.loadBetLogs();
        this.winLogs = this.loadWinLogs();

        // 10대 배팅 기본 배당률 (기본 정통 공식)
        this.payouts = this.loadPayouts();

        // 공지사항
        this.notice = this.loadNotice();

        this.userStats = {
            totalGames: 0,
            totalWins: 0,
            totalBetAmount: 0,
            totalWinAmount: 0,
            maxWinAmount: 0,
            netProfit: 0
        };

        // 초기 데이터가 부족할 경우 100회 정밀 샘플 생성
        if (this.history.length < 50) {
            this.initSampleHistory();
        }
    }

    loadHistory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.history.slice(0, 100)));
        } catch (e) {}
    }

    loadPayouts() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_PAYOUTS);
            if (data) return JSON.parse(data);
        } catch (e) {}

        return {
            straight: 35,  // 35:1
            split: 17,     // 17:1
            street: 11,    // 11:1
            corner: 8,     // 8:1
            sixline: 5,    // 5:1
            dozen: 2,      // 2:1
            column: 2,     // 2:1
            evenodd: 1,    // 1:1
            redblack: 1,   // 1:1
            highlow: 1     // 1:1
        };
    }

    savePayouts(newPayouts) {
        this.payouts = { ...this.payouts, ...newPayouts };
        try {
            localStorage.setItem(this.STORAGE_KEY_PAYOUTS, JSON.stringify(this.payouts));
        } catch (e) {}
    }

    loadNotice() {
        try {
            const notice = localStorage.getItem(this.STORAGE_KEY_NOTICE);
            return notice || "👑 VIP European Roulette에 오신 것을 환영합니다! 공정한 라이브 난수 시스템과 즉시 출금 지원.";
        } catch (e) {
            return "VIP European Roulette 라이브 테이블 가동 중";
        }
    }

    saveNotice(noticeText) {
        this.notice = noticeText;
        try {
            localStorage.setItem(this.STORAGE_KEY_NOTICE, noticeText);
        } catch (e) {}
    }

    loadBetLogs() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_BET_LOGS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveBetLogs() {
        try {
            localStorage.setItem(this.STORAGE_KEY_BET_LOGS, JSON.stringify(this.betLogs.slice(0, 100)));
        } catch (e) {}
    }

    loadWinLogs() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_WIN_LOGS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveWinLogs() {
        try {
            localStorage.setItem(this.STORAGE_KEY_WIN_LOGS, JSON.stringify(this.winLogs.slice(0, 100)));
        } catch (e) {}
    }

    /**
     * 초기 샘플 100회 정밀 데이터 생성
     */
    initSampleHistory() {
        const numbers = [
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
            24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ];
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

        this.history = [];
        const baseRound = 1520;

        for (let i = 0; i < 100; i++) {
            const randNum = numbers[Math.floor(Math.random() * numbers.length)];
            const color = randNum === 0 ? 'green' : (redNumbers.includes(randNum) ? 'red' : 'black');
            const timeOffset = (100 - i) * 35000;
            this.history.unshift({
                round: baseRound - (100 - i),
                number: randNum,
                color: color,
                timestamp: new Date(Date.now() - timeOffset).toISOString()
            });
        }
        this.saveHistory();
    }

    /**
     * 신규 회차 당첨 결과 기록
     */
    recordSpin(round, number, color) {
        this.history.unshift({
            round: round,
            number: number,
            color: color,
            timestamp: new Date().toISOString()
        });

        if (this.history.length > 100) {
            this.history.pop();
        }
        this.saveHistory();
    }

    /**
     * 배팅 로그 기록
     */
    addBetLog(round, nickname, betType, numbers, amount) {
        this.betLogs.unshift({
            id: 'bet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            round: round,
            nickname: nickname || '로열_플레이어',
            betType: betType,
            numbers: numbers,
            amount: amount,
            time: new Date().toLocaleTimeString('ko-KR')
        });
        this.saveBetLogs();
    }

    /**
     * 당첨 정산 로그 기록
     */
    addWinLog(round, winningNumber, totalBet, totalPayout, winnersCount = 1) {
        this.winLogs.unshift({
            id: 'win_' + Date.now(),
            round: round,
            winningNumber: winningNumber,
            totalBet: totalBet,
            totalPayout: totalPayout,
            winnersCount: winnersCount,
            time: new Date().toLocaleTimeString('ko-KR')
        });
        this.saveWinLogs();
    }

    /**
     * 유저 개인 전적 갱신
     */
    recordUserGame(betAmount, winAmount) {
        this.userStats.totalGames += 1;
        this.userStats.totalBetAmount += betAmount;
        this.userStats.totalWinAmount += winAmount;
        this.userStats.netProfit = this.userStats.totalWinAmount - this.userStats.totalBetAmount;

        const won = winAmount > 0;
        if (won) {
            this.userStats.totalWins += 1;
            if (winAmount > this.userStats.maxWinAmount) {
                this.userStats.maxWinAmount = winAmount;
            }
        }

        // Auth 모듈과 동기화
        if (window.rouletteAuth && window.rouletteAuth.currentUser) {
            window.rouletteAuth.syncUserStats(
                window.rouletteApp ? window.rouletteApp.balance : 0,
                won,
                winAmount - betAmount
            );
        }
    }

    /**
     * 100회 통계 정밀 분석
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
            freqMap[item.number] = (freqMap[item.number] || 0) + 1;

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

        const sortedFreq = Object.entries(freqMap).map(([num, count]) => ({
            number: parseInt(num, 10),
            count: count
        })).sort((a, b) => b.count - a.count);

        const hotNumbers = sortedFreq.slice(0, 5);
        const coldNumbers = [...sortedFreq].reverse().slice(0, 5);

        return {
            total,
            redCount,
            blackCount,
            greenCount,
            redPct: Math.round((redCount / total) * 100),
            blackPct: Math.round((blackCount / total) * 100),
            greenPct: Math.round((greenCount / total) * 100),
            oddCount,
            evenCount,
            oddPct: Math.round((oddCount / total) * 100),
            evenPct: Math.round((evenCount / total) * 100),
            d1Count,
            d2Count,
            d3Count,
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
        const user = (window.rouletteAuth && window.rouletteAuth.currentUser)
            ? window.rouletteAuth.currentUser
            : { totalGames: this.userStats.totalGames, totalWins: this.userStats.totalWins, netProfit: this.userStats.netProfit };

        const games = user.totalGames || 0;
        const wins = user.totalWins || 0;
        const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';
        const netProfit = user.netProfit || 0;

        container.innerHTML = `
            <div class="stats-grid-container">
                <!-- 1. 최근 100회 통계 및 비율 바 -->
                <div class="stats-card">
                    <h3 class="stats-card-title">📊 최근 ${analysis.total}회 당첨 비율 분석</h3>
                    <div class="stats-bars">
                        <!-- 레드 / 블랙 -->
                        <div class="bar-row">
                            <div class="bar-header">
                                <span class="bar-label">🔴 빨강 vs 🟢 0 vs ⚫ 검정</span>
                                <span class="bar-counts">${analysis.redCount}회 : ${analysis.greenCount}회 : ${analysis.blackCount}회</span>
                            </div>
                            <div class="dual-bar">
                                <div class="bar-segment red-segment" style="width: ${analysis.redPct}%">${analysis.redPct}% Red</div>
                                ${analysis.greenPct > 0 ? `<div class="bar-segment green-segment" style="width: ${analysis.greenPct}%">${analysis.greenPct}%</div>` : ''}
                                <div class="bar-segment black-segment" style="width: ${analysis.blackPct}%">${analysis.blackPct}% Black</div>
                            </div>
                        </div>

                        <!-- 홀수 / 짝수 -->
                        <div class="bar-row">
                            <div class="bar-header">
                                <span class="bar-label">⚖️ 홀수(Odd) vs 짝수(Even)</span>
                                <span class="bar-counts">${analysis.oddCount}회 : ${analysis.evenCount}회</span>
                            </div>
                            <div class="dual-bar">
                                <div class="bar-segment odd-segment" style="width: ${analysis.oddPct}%">${analysis.oddPct}% 홀수</div>
                                <div class="bar-segment even-segment" style="width: ${analysis.evenPct}%">${analysis.evenPct}% 짝수</div>
                            </div>
                        </div>

                        <!-- 다즌 3분할 -->
                        <div class="bar-row">
                            <div class="bar-header">
                                <span class="bar-label">🎲 다즌 출현 (1st 12 / 2nd 12 / 3rd 12)</span>
                                <span class="bar-counts">${analysis.d1Count}회 : ${analysis.d2Count}회 : ${analysis.d3Count}회</span>
                            </div>
                            <div class="triple-bar">
                                <div class="bar-segment d1-segment" style="width: ${analysis.d1Pct}%">${analysis.d1Pct}% (1~12)</div>
                                <div class="bar-segment d2-segment" style="width: ${analysis.d2Pct}%">${analysis.d2Pct}% (13~24)</div>
                                <div class="bar-segment d3-segment" style="width: ${analysis.d3Pct}%">${analysis.d3Pct}% (25~36)</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. 핫 & 콜드 번호 -->
                <div class="stats-card">
                    <h3 class="stats-card-title">🔥 HOT & ❄️ COLD 번호 TOP 5</h3>
                    <div class="hot-cold-box">
                        <div class="hot-section">
                            <span class="hc-title hot-text">🔥 HOT NUMBERS (최다 출현)</span>
                            <div class="hc-badges">
                                ${analysis.hotNumbers.map(n => `
                                    <span class="hc-badge hot-badge">${n.number} <small>(${n.count}회)</small></span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="cold-section">
                            <span class="hc-title cold-text">❄️ COLD NUMBERS (최소 출현)</span>
                            <div class="hc-badges">
                                ${analysis.coldNumbers.map(n => `
                                    <span class="hc-badge cold-badge">${n.number} <small>(${n.count}회)</small></span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. 개인 플레이 전적 통계 -->
                <div class="stats-card user-perf-card">
                    <h3 class="stats-card-title">🏆 나의 VIP 게임 전적</h3>
                    <div class="perf-grid">
                        <div class="perf-item">
                            <span class="perf-label">총 게임 수</span>
                            <span class="perf-val">${games} 판</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">승률 (Win Rate)</span>
                            <span class="perf-val gold-val">${winRate}% (${wins}승)</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">최고 당첨금</span>
                            <span class="perf-val gold-glow">+${(this.userStats.maxWinAmount || 360000).toLocaleString()} 칩</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">누적 수익</span>
                            <span class="perf-val ${netProfit >= 0 ? 'profit-plus' : 'profit-minus'}">
                                ${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} 칩
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 4. 최근 100회 당첨 히스토리 리스트 -->
                <div class="stats-card history-full-card">
                    <h3 class="stats-card-title">📜 최근 100회 당첨 번호 기록 (최신순)</h3>
                    <div class="stats-history-grid">
                        ${this.history.map(h => {
                            const badgeColor = h.number === 0 ? 'badge-green' : (h.color === 'red' ? 'badge-red' : 'badge-black');
                            return `
                                <div class="stat-hist-item ${badgeColor}" title="ROUND #${h.round} (${new Date(h.timestamp).toLocaleTimeString()})">
                                    <span class="num">${h.number}</span>
                                    <span class="rnd">#${h.round}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 관리자 모달 UI 렌더링 (회원 관리, 게임 관리, 로그 관리)
     */
    renderAdminModal(activeTab = 'members') {
        const container = document.getElementById('admin-modal-body');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-nav-tabs">
                <button class="admin-tab-btn ${activeTab === 'members' ? 'active' : ''}" data-tab="members">👥 회원 관리</button>
                <button class="admin-tab-btn ${activeTab === 'payouts' ? 'active' : ''}" data-tab="payouts">⚙️ 게임 관리 (배당률/공지)</button>
                <button class="admin-tab-btn ${activeTab === 'logs' ? 'active' : ''}" data-tab="logs">📜 로그 관리</button>
            </div>

            <div class="admin-tab-content">
                ${activeTab === 'members' ? this.getAdminMembersTemplate() : ''}
                ${activeTab === 'payouts' ? this.getAdminGameManageTemplate() : ''}
                ${activeTab === 'logs' ? this.getAdminLogsTemplate() : ''}
            </div>
        `;

        this.bindAdminEvents();
    }

    getAdminMembersTemplate() {
        const users = window.rouletteAuth ? window.rouletteAuth.users : [];

        return `
            <div class="admin-section">
                <div class="admin-section-header">
                    <h3>👥 전체 회원 관리 및 검색 (${users.length}명)</h3>
                    <div class="admin-search-box">
                        <input type="text" id="admin-user-search" placeholder="닉네임 또는 이메일 검색...">
                        <button type="button" id="btn-admin-search" class="btn-sm-gold">검색</button>
                    </div>
                </div>

                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>회원 정보</th>
                                <th>가입 방식</th>
                                <th>보유 칩</th>
                                <th>게임 전적 (승률)</th>
                                <th>누적 순수익</th>
                                <th>상태</th>
                                <th>관리 조작</th>
                            </tr>
                        </thead>
                        <tbody id="admin-user-list-body">
                            ${this.renderUserRows(users)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderUserRows(users) {
        if (!users || users.length === 0) {
            return `<tr><td colspan="7" class="text-center">등록된 회원이 없습니다.</td></tr>`;
        }

        return users.map(u => {
            const isBanned = u.status === 'BANNED';
            const games = u.totalGames || 0;
            const wins = u.totalWins || 0;
            const rate = games > 0 ? ((wins / games) * 100).toFixed(0) : 0;
            const profit = u.netProfit || 0;

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <span class="user-avatar">${u.avatar || '👑'}</span>
                            <div>
                                <strong class="user-nick">${u.nickname}</strong>
                                <small class="user-email">${u.email}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge-type">${u.type || 'EMAIL'}</span></td>
                    <td class="gold">₩ ${(u.balance || 0).toLocaleString()}</td>
                    <td>${games}판 (${rate}%)</td>
                    <td class="${profit >= 0 ? 'profit-plus' : 'profit-minus'}">
                        ${profit >= 0 ? '+' : ''}${profit.toLocaleString()}
                    </td>
                    <td>
                        <span class="status-badge ${isBanned ? 'badge-banned' : 'badge-active'}">
                            ${isBanned ? '🚫 이용정지' : '✅ 정상이용'}
                        </span>
                    </td>
                    <td>
                        <div class="admin-action-btns">
                            <button class="btn-toggle-ban ${isBanned ? 'btn-unban' : 'btn-ban'}" data-userid="${u.id}">
                                ${isBanned ? '정지 해제' : '이용 정지'}
                            </button>
                            <button class="btn-view-records" data-userid="${u.id}" title="게임 기록 조회">
                                📊 기록
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getAdminGameManageTemplate() {
        const p = this.payouts;

        return `
            <div class="admin-section">
                <!-- 1. 긴급 공지사항 작성 -->
                <div class="notice-manage-box mb-25">
                    <h3>📢 실시간 카지노 공지사항 등록</h3>
                    <p class="admin-help-text">작성하신 공지사항은 상단 딜러 배너 및 공지 티커에 실시간으로 반영됩니다.</p>
                    <div class="notice-input-row">
                        <input type="text" id="admin-notice-input" value="${this.notice}" placeholder="공지할 내용을 입력하세요...">
                        <button type="button" id="btn-save-notice" class="btn-gold-action">공지 등록</button>
                    </div>
                </div>

                <!-- 2. 10대 배팅별 공식 배당률 설정 -->
                <div class="payout-manage-box">
                    <h3>💰 10대 공식 배팅 배당률 실시간 설정</h3>
                    <p class="admin-help-text">카지노 정책에 맞춰 각 배팅 항목의 순수 배당 비율을 자유롭게 설정할 수 있습니다. (예: 35배 = 35:1)</p>

                    <form id="form-admin-payouts" class="payout-setting-grid">
                        <div class="payout-field">
                            <label>🎯 스트레이트 (1개 번호)</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-straight" value="${p.straight}" min="1" max="100">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>
                        <div class="payout-field">
                            <label>↔ 스플릿 (2개 번호)</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-split" value="${p.split}" min="1" max="50">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>
                        <div class="payout-field">
                            <label>☰ 스트리트 (3개 번호)</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-street" value="${p.street}" min="1" max="40">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>
                        <div class="payout-field">
                            <label>✛ 코너 (4개 번호)</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-corner" value="${p.corner}" min="1" max="30">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>
                        <div class="payout-field">
                            <label>▦ 식스라인 (6개 번호)</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-sixline" value="${p.sixline}" min="1" max="20">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>
                        <div class="payout-field">
                            <label>🎲 다즌 (12개 번호)</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-dozen" value="${p.dozen}" min="1" max="10">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>
                        <div class="payout-field">
                            <label>🏛️ 컬럼 (12개 열)</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-column" value="${p.column}" min="1" max="10">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>
                        <div class="payout-field">
                            <label>⚖️ 홀/짝, 빨강/검정, 하이/로우</label>
                            <div class="input-ratio">
                                <input type="number" id="pay-evenodd" value="${p.evenodd}" min="1" max="5">
                                <span>배 ( : 1)</span>
                            </div>
                        </div>

                        <div class="payout-submit-box">
                            <button type="submit" class="btn-save-payouts">💾 배당률 설정 저장 및 게임 즉시 적용</button>
                            <button type="button" id="btn-reset-payouts" class="btn-reset-payouts">↺ 정통 기본값 초기화</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    getAdminLogsTemplate() {
        const loginLogs = (window.rouletteAuth ? window.rouletteAuth.loginLogs : []) || [];
        const betLogs = this.betLogs || [];
        const winLogs = this.winLogs || [];

        return `
            <div class="admin-section">
                <!-- 서브 탭 -->
                <div class="log-subtabs">
                    <button class="log-subtab-btn active" data-subtab="login">🔑 로그인 이력 (${loginLogs.length})</button>
                    <button class="log-subtab-btn" data-subtab="bet">🎲 배팅 이력 (${betLogs.length})</button>
                    <button class="log-subtab-btn" data-subtab="win">🏆 당첨 및 정산 이력 (${winLogs.length})</button>
                </div>

                <!-- 1. 로그인 로그 뷰어 -->
                <div id="subtab-content-login" class="log-content-panel active">
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>회원 닉네임</th>
                                    <th>이메일</th>
                                    <th>로그인 방식</th>
                                    <th>접속 환경</th>
                                    <th>접속 시간</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${loginLogs.length === 0 ? '<tr><td colspan="5" class="text-center">기록된 로그인 이력이 없습니다.</td></tr>' : loginLogs.map(l => `
                                    <tr>
                                        <td><strong>${l.nickname}</strong></td>
                                        <td>${l.email}</td>
                                        <td><span class="badge-type">${l.provider}</span></td>
                                        <td>${l.ip}</td>
                                        <td>${l.time}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. 배팅 이력 뷰어 -->
                <div id="subtab-content-bet" class="log-content-panel">
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>회차</th>
                                    <th>회원 닉네임</th>
                                    <th>배팅 구분</th>
                                    <th>배팅 대상</th>
                                    <th>배팅 금액</th>
                                    <th>배팅 시간</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${betLogs.length === 0 ? '<tr><td colspan="6" class="text-center">기록된 배팅 이력이 없습니다.</td></tr>' : betLogs.map(b => `
                                    <tr>
                                        <td>ROUND #${b.round}</td>
                                        <td>${b.nickname}</td>
                                        <td><span class="badge-bet-type">${b.betType}</span></td>
                                        <td>${b.numbers}</td>
                                        <td class="gold">${b.amount.toLocaleString()} Chip</td>
                                        <td>${b.time}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 3. 당첨 및 정산 이력 뷰어 -->
                <div id="subtab-content-win" class="log-content-panel">
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>회차</th>
                                    <th>당첨 번호</th>
                                    <th>총 배팅액</th>
                                    <th>총 지급액</th>
                                    <th>정산 결과</th>
                                    <th>정산 시간</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${winLogs.length === 0 ? '<tr><td colspan="6" class="text-center">기록된 당첨 정산 이력이 없습니다.</td></tr>' : winLogs.map(w => {
                                    const houseProfit = w.totalBet - w.totalPayout;
                                    return `
                                        <tr>
                                            <td>ROUND #${w.round}</td>
                                            <td><span class="admin-num-badge">${w.winningNumber}</span></td>
                                            <td>${w.totalBet.toLocaleString()} Chip</td>
                                            <td class="gold">${w.totalPayout.toLocaleString()} Chip</td>
                                            <td class="${houseProfit >= 0 ? 'profit-plus' : 'profit-minus'}">
                                                하우스 ${houseProfit >= 0 ? '+' : ''}${houseProfit.toLocaleString()}
                                            </td>
                                            <td>${w.time}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 관리자 이벤트 바인딩
     */
    bindAdminEvents() {
        // 메인 탭 전환
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.renderAdminModal(tab);
            });
        });

        // 서브 로그 탭 전환
        document.querySelectorAll('.log-subtab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.log-subtab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.log-content-panel').forEach(p => p.classList.remove('active'));

                e.currentTarget.classList.add('active');
                const subtab = e.currentTarget.getAttribute('data-subtab');
                const panel = document.getElementById(`subtab-content-${subtab}`);
                if (panel) panel.classList.add('active');
            });
        });

        // 회원 검색
        const searchInput = document.getElementById('admin-user-search');
        const btnSearch = document.getElementById('btn-admin-search');
        const filterUsers = () => {
            if (!searchInput || !window.rouletteAuth) return;
            const query = searchInput.value.toLowerCase().trim();
            const filtered = window.rouletteAuth.users.filter(u =>
                u.nickname.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
            );
            const tbody = document.getElementById('admin-user-list-body');
            if (tbody) tbody.innerHTML = this.renderUserRows(filtered);
            this.bindUserActionButtons();
        };

        if (btnSearch) btnSearch.addEventListener('click', filterUsers);
        if (searchInput) searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') filterUsers();
        });

        this.bindUserActionButtons();

        // 공지 등록
        const btnSaveNotice = document.getElementById('btn-save-notice');
        if (btnSaveNotice) {
            btnSaveNotice.addEventListener('click', () => {
                const noticeInput = document.getElementById('admin-notice-input');
                if (noticeInput) {
                    const text = noticeInput.value.trim();
                    this.saveNotice(text);
                    if (window.rouletteApp) {
                        window.rouletteApp.updateNoticeTicker(text);
                        window.rouletteApp.showToast("📢 공지사항이 성공적으로 등록 및 반영되었습니다.");
                    }
                }
            });
        }

        // 배당률 폼 저장
        const formPayouts = document.getElementById('form-admin-payouts');
        if (formPayouts) {
            formPayouts.addEventListener('submit', (e) => {
                e.preventDefault();
                const newP = {
                    straight: parseInt(document.getElementById('pay-straight').value, 10) || 35,
                    split: parseInt(document.getElementById('pay-split').value, 10) || 17,
                    street: parseInt(document.getElementById('pay-street').value, 10) || 11,
                    corner: parseInt(document.getElementById('pay-corner').value, 10) || 8,
                    sixline: parseInt(document.getElementById('pay-sixline').value, 10) || 5,
                    dozen: parseInt(document.getElementById('pay-dozen').value, 10) || 2,
                    column: parseInt(document.getElementById('pay-column').value, 10) || 2,
                    evenodd: parseInt(document.getElementById('pay-evenodd').value, 10) || 1,
                    redblack: parseInt(document.getElementById('pay-evenodd').value, 10) || 1,
                    highlow: parseInt(document.getElementById('pay-evenodd').value, 10) || 1
                };
                this.savePayouts(newP);
                if (window.rouletteApp) {
                    window.rouletteApp.showToast("💰 배당률 설정이 저장되었으며 실시간 게임에 적용됩니다.");
                }
            });
        }

        // 배당률 초기화
        const btnReset = document.getElementById('btn-reset-payouts');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                const defaultP = { straight: 35, split: 17, street: 11, corner: 8, sixline: 5, dozen: 2, column: 2, evenodd: 1, redblack: 1, highlow: 1 };
                this.savePayouts(defaultP);
                this.renderAdminModal('payouts');
                if (window.rouletteApp) {
                    window.rouletteApp.showToast("배당률이 정통 기본값으로 초기화되었습니다.");
                }
            });
        }
    }

    bindUserActionButtons() {
        // 정지 토글
        document.querySelectorAll('.btn-toggle-ban').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uid = e.currentTarget.getAttribute('data-userid');
                if (!window.rouletteAuth) return;

                const user = window.rouletteAuth.users.find(u => u.id === uid);
                if (!user) return;

                user.status = user.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
                window.rouletteAuth.saveUsers();

                if (window.rouletteAuth.currentUser && window.rouletteAuth.currentUser.id === uid) {
                    window.rouletteAuth.currentUser.status = user.status;
                    window.rouletteAuth.saveCurrentUser();
                }

                if (window.rouletteApp) {
                    window.rouletteApp.showToast(`[${user.nickname}] 회원의 상태가 '${user.status === 'BANNED' ? '이용 정지' : '정상 이용'}'으로 변경되었습니다.`);
                }

                this.renderAdminModal('members');
            });
        });

        // 개인 기록 모달 조회
        document.querySelectorAll('.btn-view-records').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uid = e.currentTarget.getAttribute('data-userid');
                if (!window.rouletteAuth) return;

                const user = window.rouletteAuth.users.find(u => u.id === uid);
                if (!user) return;

                const games = user.totalGames || 0;
                const wins = user.totalWins || 0;
                const rate = games > 0 ? ((wins / games) * 100).toFixed(1) : 0;
                alert(`[${user.nickname} (${user.email}) 전적 기록]\n\n• 가입일: ${new Date(user.createdAt).toLocaleDateString()}\n• 보유 칩: ${(user.balance || 0).toLocaleString()} Chip\n• 총 게임 수: ${games}회 (${wins}승 ${games - wins}패)\n• 승률: ${rate}%\n• 누적 순수익: ${(user.netProfit || 0).toLocaleString()} Chip\n• 계정 상태: ${user.status}`);
            });
        });
    }
}

// 글로벌 인스턴스 초기화
window.rouletteStats = new RouletteStats();
