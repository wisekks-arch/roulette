/**
 * 👤 VIP European Roulette 회원 및 인증(Auth) 관리 모듈
 * 회원가입(이메일, SNS), 로그인, 프로필 관리(닉네임, 아바타, 전적) 및 세션 유지
 */

class RouletteAuth {
    constructor() {
        this.STORAGE_KEY_USERS = 'roulette_members_v1';
        this.STORAGE_KEY_CURRENT = 'roulette_current_user_v1';
        this.STORAGE_KEY_LOGS = 'roulette_login_logs_v1';

        this.avatars = [
            { id: 'av-crown', icon: '👑', name: '황금 왕관' },
            { id: 'av-diamond', icon: '💎', name: '블루 다이아몬드' },
            { id: 'av-lion', icon: '🦁', name: '골든 라이언' },
            { id: 'av-tiger', icon: '🐯', name: '로열 타이거' },
            { id: 'av-eagle', icon: '🦅', name: '실버 이글' },
            { id: 'av-dragon', icon: '🐉', name: '임페리얼 드래곤' }
        ];

        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
        this.loginLogs = this.loadLoginLogs();

        // 기본 데모 회원 준비 (없을 경우)
        if (this.users.length === 0) {
            this.initDefaultUsers();
        }

        this.isMandatoryEntrance = false;
    }

    /**
     * 현재 정식 로그인 여부 판정 (회원 인증 게이트웨이용)
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * 로컬 스토리지 데이터 로드
     */
    loadUsers() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_USERS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveUsers() {
        try {
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(this.users));
        } catch (e) { }
    }

    loadCurrentUser() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_CURRENT);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    saveCurrentUser() {
        try {
            if (this.currentUser) {
                localStorage.setItem(this.STORAGE_KEY_CURRENT, JSON.stringify(this.currentUser));
            } else {
                localStorage.removeItem(this.STORAGE_KEY_CURRENT);
            }
        } catch (e) { }
    }

    loadLoginLogs() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY_LOGS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveLoginLogs() {
        try {
            localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(this.loginLogs.slice(0, 100)));
        } catch (e) { }
    }

    /**
     * 기본 데모 회원 초기화
     */
    initDefaultUsers() {
        this.users = [
            {
                id: 'user_vip01',
                email: 'vip_player@casino.com',
                password: '1234',
                nickname: '로열_플레이어',
                avatar: '👑',
                balance: 10000000,
                status: 'ACTIVE', // 'ACTIVE', 'BANNED'
                type: 'EMAIL',
                totalGames: 42,
                totalWins: 21,
                netProfit: 1850000,
                createdAt: new Date().toISOString()
            },
            {
                id: 'user_lucky7',
                email: 'lucky777@kakao.com',
                password: '1234',
                nickname: '행운의사자',
                avatar: '🦁',
                balance: 5500000,
                status: 'ACTIVE',
                type: 'KAKAO',
                totalGames: 28,
                totalWins: 14,
                netProfit: 620000,
                createdAt: new Date().toISOString()
            },
            {
                id: 'user_dragon',
                email: 'monaco_dragon@google.com',
                password: '1234',
                nickname: '몬테카를로용',
                avatar: '🐉',
                balance: 12000000,
                status: 'ACTIVE',
                type: 'GOOGLE',
                totalGames: 89,
                totalWins: 45,
                netProfit: 3400000,
                createdAt: new Date().toISOString()
            }
        ];
        this.saveUsers();
    }

    /**
     * 로그인 이력 기록
     */
    addLoginLog(user, provider = 'EMAIL') {
        const logItem = {
            id: 'log_' + Date.now(),
            userId: user.id,
            nickname: user.nickname,
            email: user.email,
            provider: provider,
            ip: '127.0.0.1 (Web Session)',
            time: new Date().toLocaleString('ko-KR')
        };
        this.loginLogs.unshift(logItem);
        this.saveLoginLogs();
    }

    /**
     * 이메일 회원가입
     */
    registerEmail(email, nickname, password) {
        if (!email || !nickname || !password) {
            return { success: false, message: '모든 입력 항목을 채워주세요.' };
        }

        const existing = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return { success: false, message: '이미 가입된 이메일 주소입니다.' };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            email: email.trim(),
            nickname: nickname.trim(),
            password: password.trim(), // 회원가입 비밀번호 저장
            avatar: '👑',
            balance: 10000000, // 신규 가입 축하 1,000만 칩
            status: 'ACTIVE',
            type: 'EMAIL',
            totalGames: 0,
            totalWins: 0,
            netProfit: 0,
            createdAt: new Date().toISOString()
        };

        this.users.unshift(newUser);
        this.saveUsers();
        this.currentUser = newUser;
        this.saveCurrentUser();
        this.addLoginLog(newUser, 'EMAIL');

        return { success: true, user: newUser, message: '회원가입이 완료되었습니다! 1,000만 칩이 지급되었습니다.' };
    }

    /**
     * [초간편 아이디 찾기] 닉네임으로 등록된 아이디(이메일) 조회
     * @param {string} nickname 
     */
    findIdByNickname(nickname) {
        if (!nickname || !nickname.trim()) {
            return { success: false, message: '가입 시 설정한 닉네임을 입력해 주세요.' };
        }
        const user = this.users.find(u => u.nickname && u.nickname.trim().toLowerCase() === nickname.trim().toLowerCase());
        if (!user) {
            return { success: false, message: `입력하신 닉네임("${nickname}")으로 등록된 계정을 찾을 수 없습니다.` };
        }
        return { success: true, email: user.email, nickname: user.nickname, message: '아이디를 성공적으로 찾았습니다!' };
    }

    /**
     * [보안] 안전한 임시 비밀번호 자동 생성 (예: VIP7829, ROYAL3921)
     */
    generateTempPassword() {
        const prefix = ['VIP', 'ROYAL', 'ACE', 'LUCKY', 'GOLD'][Math.floor(Math.random() * 5)];
        const num = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}${num}`;
    }

    /**
     * [임시 비밀번호 발급] 아이디 + 닉네임 일치 확인 후 임시 비밀번호 발급 및 로그인 처리
     * @param {string} email 
     * @param {string} nickname 
     */
    issueTempPassword(email, nickname) {
        if (!email || !nickname) {
            return { success: false, message: '아이디(이메일)와 닉네임을 모두 입력해 주세요.' };
        }
        const user = this.users.find(u =>
            u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
            u.nickname && u.nickname.trim().toLowerCase() === nickname.trim().toLowerCase()
        );
        if (!user) {
            return { success: false, message: '입력하신 아이디와 닉네임이 일치하지 않습니다. 등록 정보를 다시 확인해 주세요.' };
        }

        const tempPass = this.generateTempPassword();
        user.password = tempPass;
        user.isTemporaryPassword = true; // 임시 비밀번호 사용 플래그

        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            this.users[idx] = { ...user };
        }
        this.saveUsers();

        // 임시 비밀번호 계정으로 로그인 처리
        this.currentUser = user;
        this.saveCurrentUser();
        this.addLoginLog(user, 'TEMP_PW_ISSUED');

        return {
            success: true,
            user: user,
            tempPassword: tempPass,
            message: '임시 비밀번호가 안전하게 발급되었습니다. 카지노 룸으로 입장합니다.'
        };
    }

    /**
     * [새 비밀번호로 변경] 현재 로그인 유저의 비밀번호를 안전한 정식 비밀번호로 갱신
     * @param {string} newPassword 
     */
    changePassword(newPassword) {
        if (!this.currentUser) {
            return { success: false, message: '로그인 상태에서만 비밀번호를 변경할 수 있습니다.' };
        }
        if (!newPassword || newPassword.trim().length < 4) {
            return { success: false, message: '새 비밀번호는 최소 4자 이상 입력해 주세요.' };
        }

        const cleanPass = newPassword.trim();
        this.currentUser.password = cleanPass;
        this.currentUser.isTemporaryPassword = false; // 임시 비밀번호 플래그 해제

        const idx = this.users.findIndex(u => u.id === this.currentUser.id);
        if (idx !== -1) {
            this.users[idx] = { ...this.currentUser };
        }
        this.saveUsers();
        this.saveCurrentUser();

        return { success: true, user: this.currentUser, message: '새 비밀번호로 안전하게 변경되었습니다!' };
    }

    /**
     * [초간편 비밀번호 재설정] 하위 호환성 유지용 메서드
     */
    resetPassword(email, nickname, newPassword) {
        if (!email || !nickname || !newPassword) {
            return { success: false, message: '모든 항목(아이디, 닉네임, 새 비밀번호)을 입력해 주세요.' };
        }
        const user = this.users.find(u =>
            u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
            u.nickname && u.nickname.trim().toLowerCase() === nickname.trim().toLowerCase()
        );
        if (!user) {
            return { success: false, message: '아이디와 닉네임 정보가 일치하는 회원을 찾을 수 없습니다. 정보를 다시 확인해 주세요.' };
        }

        user.password = newPassword.trim();
        user.isTemporaryPassword = false;
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            this.users[idx] = { ...user };
        }
        this.saveUsers();

        this.currentUser = user;
        this.saveCurrentUser();
        this.addLoginLog(user, 'PW_RESET');

        return { success: true, user: user, message: '비밀번호가 성공적으로 변경되었습니다! VIP 카지노 룸에 입장합니다.' };
    }

    /**
     * [클립보드 복사 헬퍼] 마우스 클릭 또는 텍스트 복사 시 토스트 및 버튼 상태 갱신
     * @param {string} text 
     * @param {HTMLElement} btnElement 
     */
    copyToClipboard(text, btnElement) {
        if (!text) return;
        const fallbackCopy = (val) => {
            const ta = document.createElement('textarea');
            ta.value = val;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                this.onCopySuccess(btnElement, val);
            } catch (err) {
                console.warn('Fallback copy failed', err);
            }
            document.body.removeChild(ta);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => this.onCopySuccess(btnElement, text))
                .catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    onCopySuccess(btnElement, text) {
        if (btnElement) {
            const originText = btnElement.innerHTML;
            btnElement.innerHTML = '✓ 복사완료!';
            btnElement.classList.add('copied');
            setTimeout(() => {
                btnElement.innerHTML = originText;
                btnElement.classList.remove('copied');
            }, 1500);
        }
        if (window.rouletteApp) {
            window.rouletteApp.showToast(`📋 클립보드에 복사되었습니다: [${text}]`);
        }
    }

    /**
     * 일반 이메일 로그인 (정밀 비밀번호 및 임시 비밀번호 일치 검증)
     */
    loginEmail(email, password) {
        if (!email || !password) {
            return { success: false, message: '이메일(아이디)과 비밀번호를 모두 입력해 주세요.' };
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        const user = this.users.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
        if (!user) {
            return { success: false, message: '등록되지 않은 이메일 주소입니다. 회원가입 또는 아이디 찾기를 진행해 주세요.' };
        }

        if (user.status === 'BANNED') {
            return { success: false, message: '해당 계정은 관리자에 의해 이용 정지 상태입니다. 고객센터에 문의하세요.' };
        }

        // 비밀번호 정밀 대조 검증 (등록된 비밀번호 또는 시스템 발급 임시 비밀번호)
        if (user.password && user.password !== cleanPassword) {
            return {
                success: false,
                message: '비밀번호가 일치하지 않습니다. 발급받으신 임시 비밀번호 또는 기존 비밀번호를 다시 확인해 주세요.'
            };
        }

        this.currentUser = user;
        this.saveCurrentUser();
        this.addLoginLog(user, 'EMAIL');

        return { success: true, user: user, message: '성공적으로 로그인되었습니다.' };
    }

    /**
     * 로그아웃
     */
    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        return { success: true, message: '로그아웃되었습니다.' };
    }

    /**
     * 프로필 닉네임 및 아바타 변경
     */
    updateProfile(newNickname, newAvatar) {
        if (!this.currentUser) return { success: false, message: '로그인이 필요합니다.' };

        if (newNickname && newNickname.trim().length >= 2) {
            this.currentUser.nickname = newNickname.trim();
        }
        if (newAvatar) {
            this.currentUser.avatar = newAvatar;
        }

        // 전체 유저 목록에서도 동기화
        const idx = this.users.findIndex(u => u.id === this.currentUser.id);
        if (idx !== -1) {
            this.users[idx] = { ...this.currentUser };
            this.saveUsers();
        }
        this.saveCurrentUser();

        return { success: true, user: this.currentUser, message: '프로필이 성공적으로 변경되었습니다.' };
    }

    /**
     * 현재 유저의 잔고 및 전적 업데이트
     */
    syncUserStats(balance, won, netGain) {
        if (!this.currentUser) return;

        this.currentUser.balance = balance;
        this.currentUser.totalGames = (this.currentUser.totalGames || 0) + 1;
        if (won) {
            this.currentUser.totalWins = (this.currentUser.totalWins || 0) + 1;
        }
        this.currentUser.netProfit = (this.currentUser.netProfit || 0) + netGain;

        const idx = this.users.findIndex(u => u.id === this.currentUser.id);
        if (idx !== -1) {
            this.users[idx] = { ...this.currentUser };
            this.saveUsers();
        }
        this.saveCurrentUser();
    }

    /**
     * 헤더 프로필 뱃지 갱신
     */
    renderHeaderProfile() {
        const btn = document.getElementById('btn-open-auth');
        if (!btn) return;

        if (this.currentUser) {
            btn.innerHTML = `
                <span class="auth-avatar-icon">${this.currentUser.avatar || '👑'}</span>
                <span class="auth-nickname">${this.currentUser.nickname}</span>
                <span class="auth-status-tag">VIP</span>
            `;
            btn.classList.add('logged-in');
        } else {
            btn.innerHTML = `
                <span class="icon">👤</span>
                <span class="text">로그인 / 가입</span>
            `;
            btn.classList.remove('logged-in');
        }
    }

    /**
     * 회원 모달 렌더링 (로그인 / 회원가입 / 프로필 탭)
     */
    renderAuthModal(tab = 'auto') {
        const modalBody = document.getElementById('auth-modal-body');
        if (!modalBody) return;

        const activeTab = (tab === 'auto') ? (this.currentUser ? 'profile' : 'login') : tab;

        modalBody.innerHTML = `
            <div class="auth-tabs">
                ${this.currentUser ? `
                    <button class="auth-tab-btn ${activeTab === 'profile' ? 'active' : ''}" data-tab="profile">내 프로필</button>
                ` : `
                    <button class="auth-tab-btn ${activeTab === 'login' ? 'active' : ''}" data-tab="login">일반 로그인</button>
                    <button class="auth-tab-btn ${activeTab === 'register' ? 'active' : ''}" data-tab="register">무료 회원가입</button>
                    <button class="auth-tab-btn ${activeTab === 'find' ? 'active' : ''}" data-tab="find">ID/PW 찾기</button>
                `}
            </div>

            <div class="auth-tab-content">
                ${activeTab === 'login' ? this.getLoginTemplate() : ''}
                ${activeTab === 'register' ? this.getRegisterTemplate() : ''}
                ${activeTab === 'profile' ? this.getProfileTemplate() : ''}
                ${activeTab === 'find' ? this.getFindAccountTemplate() : ''}
            </div>
        `;

        this.bindAuthEvents();
    }

    getLoginTemplate() {
        return `
            <form id="form-login" class="auth-form">
                <div class="auth-input-group">
                    <label>이메일 주소 (아이디)</label>
                    <input type="email" id="login-email" placeholder="가입 이메일 주소 입력" required>
                </div>
                <div class="auth-input-group">
                    <label>비밀번호</label>
                    <input type="password" id="login-password" placeholder="비밀번호 또는 발급된 임시 비밀번호" required>
                </div>
                <button type="submit" class="auth-submit-btn">🔐 카지노 입장 (로그인)</button>
                <div class="auth-switch-note auth-links-row">
                    <div class="auth-find-group">
                        <a href="#" id="link-to-find">아이디/비밀번호 찾기</a>
                        <button type="button" class="btn-guide-help" id="btn-quick-guide-help" title="계정 찾기 가이드 보기">❓</button>
                    </div>
                    <span class="auth-sep">|</span>
                    <a href="#" id="link-to-register">무료 회원가입</a>
                </div>

                <!-- ❓ 바로 보는 팝오버 가이드 (원클릭 토글) -->
                <div id="quick-guide-popover" class="quick-guide-popover hidden">
                    <div class="qg-header">
                        <span class="qg-title">💡 계정 찾기 초간편 가이드</span>
                        <button type="button" class="qg-close" id="btn-close-qg">✕</button>
                    </div>
                    <ul class="qg-list">
                        <li><strong>아이디 찾기:</strong> 가입 시 등록한 <em>[닉네임]</em>만 입력하면 즉시 아이디를 확인하실 수 있습니다.</li>
                        <li><strong>비밀번호 재설정:</strong> <em>[아이디]</em>와 <em>[닉네임]</em>을 입력하시면 본인 확인 즉시 새 비밀번호로 변경되어 바로 카지노에 입장됩니다.</li>
                    </ul>
                </div>
            </form>
        `;
    }

    getRegisterTemplate() {
        return `
            <form id="form-register" class="auth-form">
                <div class="auth-input-group">
                    <label>이메일 주소 (아이디)</label>
                    <input type="email" id="reg-email" placeholder="사용할 이메일 입력" required>
                </div>
                <div class="auth-input-group">
                    <label>플레이어 닉네임</label>
                    <input type="text" id="reg-nickname" placeholder="2~10자 닉네임" required>
                </div>
                <div class="auth-input-group">
                    <label>비밀번호</label>
                    <input type="password" id="reg-password" placeholder="비밀번호 입력" required>
                </div>
                <div class="welcome-chip-benefit">
                    🎁 신규 회원 가입 즉시 <strong>₩ 10,000,000 (1,000만 칩)</strong> 환영 머니 지급!
                </div>
                <button type="submit" class="auth-submit-btn btn-register-gold">✨ 무료 회원가입 완료</button>
            </form>
        `;
    }

    getProfileTemplate() {
        if (!this.currentUser) return '';
        const user = this.currentUser;
        const winRate = user.totalGames > 0 ? ((user.totalWins / user.totalGames) * 100).toFixed(1) : '0.0';

        return `
            <div class="profile-view">
                <div class="profile-hero">
                    <div class="profile-avatar-large">${user.avatar || '👑'}</div>
                    <div class="profile-main-info">
                        <div class="profile-name-row">
                            <h3 id="display-profile-name">${user.nickname}</h3>
                            <span class="profile-badge-vip">VIP MEMBER</span>
                        </div>
                        <p class="profile-email">${user.email} (${user.type} 가입)</p>
                    </div>
                </div>

                <!-- 아바타 변경 선택기 -->
                <div class="avatar-select-box">
                    <label>👑 VIP 아바타 선택</label>
                    <div class="avatar-list">
                        ${this.avatars.map(av => `
                            <button type="button" class="avatar-choice-btn ${user.avatar === av.icon ? 'selected' : ''}" data-avatar="${av.icon}" title="${av.name}">
                                <span>${av.icon}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 닉네임 변경 입력 -->
                <div class="auth-input-group mt-15">
                    <label>닉네임 변경</label>
                    <div class="input-with-btn">
                        <input type="text" id="profile-new-nickname" value="${user.nickname}" maxlength="12">
                        <button type="button" id="btn-save-profile" class="btn-save-sm">저장</button>
                    </div>
                </div>

                <!-- 비밀번호 변경 섹션 (언제든 비밀번호 수정 가능) -->
                <div class="profile-pw-section">
                    <div class="profile-pw-header">
                        <label>🔑 계정 비밀번호 변경</label>
                        ${user.isTemporaryPassword ? '<span class="badge-temp-warn">⚠️ 임시 비밀번호 사용 중 (변경 권장)</span>' : ''}
                    </div>
                    <div class="profile-pw-inputs">
                        <input type="password" id="profile-new-pw" placeholder="새 비밀번호 입력 (4자 이상)" autocomplete="new-password">
                        <input type="password" id="profile-new-pw-confirm" placeholder="새 비밀번호 확인" autocomplete="new-password">
                        <button type="button" id="btn-save-new-pw" class="btn-save-sm btn-pw-change">비밀번호 변경</button>
                    </div>
                    <div id="profile-pw-msg" class="profile-pw-msg hidden"></div>
                </div>

                <!-- 회원 게임 통계 요약 -->
                <div class="profile-stats-grid">
                    <div class="p-stat-card">
                        <span class="lbl">보유 머니</span>
                        <strong class="val gold">₩ ${(user.balance || 0).toLocaleString()}</strong>
                    </div>
                    <div class="p-stat-card">
                        <span class="lbl">총 플레이</span>
                        <strong class="val">${user.totalGames || 0} 판</strong>
                    </div>
                    <div class="p-stat-card">
                        <span class="lbl">승률</span>
                        <strong class="val">${winRate}%</strong>
                    </div>
                    <div class="p-stat-card">
                        <span class="lbl">누적 순수익</span>
                        <strong class="val ${(user.netProfit || 0) >= 0 ? 'profit-plus' : 'profit-minus'}">
                            ${(user.netProfit || 0) >= 0 ? '+' : ''}${(user.netProfit || 0).toLocaleString()} 칩
                        </strong>
                    </div>
                </div>

                <div class="profile-actions">
                    <button type="button" id="btn-logout" class="btn-logout">🚪 로그아웃</button>
                </div>
            </div>
        `;
    }

    /**
     * [초간편] 아이디/비밀번호 찾기 화면 템플릿 (초컴팩트 디자인 & ❓ 원클릭 가이드 토글)
     */
    getFindAccountTemplate() {
        return `
            <div class="find-account-container compact-mode">
                <!-- 상단 헤더 및 ❓ 바로 볼 수 있는 가이드 버튼 -->
                <div class="find-header-row">
                    <div class="find-title-group">
                        <span class="find-title">🔍 계정 정보 찾기</span>
                        <button type="button" class="btn-guide-help btn-guide-prominent" id="btn-find-tab-guide" title="도움말 가이드 열기">❓ [가이드]</button>
                    </div>
                    <span class="find-subtitle">3초 만에 아이디를 확인하고 새 비밀번호로 재설정하세요.</span>
                </div>

                <!-- ❓ 바로 볼 수 있는 사용자 가이드 안내 박스 (기본 hidden으로 공간 절약) -->
                <div id="find-guide-box" class="find-guide-box hidden">
                    <div class="fgb-title">💡 플레이어 계정 찾기 가이드</div>
                    <div class="fgb-desc">
                        • <strong>아이디 찾기:</strong> 가입 닉네임만 입력하시면 아이디가 즉시 확인됩니다.<br>
                        • <strong>비밀번호 찾기:</strong> 아이디와 닉네임을 입력하시면 임시 비밀번호가 즉시 발급되어 입장됩니다. (입장 후 새 비밀번호로 수정 가능)
                    </div>
                </div>

                <!-- 1. 초간편 아이디 찾기 폼 -->
                <div class="find-section-card compact-card">
                    <div class="fsc-header">
                        <span class="fsc-badge">STEP 1</span>
                        <span class="fsc-title">닉네임으로 아이디 찾기</span>
                    </div>
                    <form id="form-find-id" class="find-mini-form">
                        <div class="find-input-inline">
                            <input type="text" id="find-id-nickname" placeholder="가입 닉네임 입력 (예: 로열_플레이어)" required>
                            <button type="submit" class="auth-submit-btn btn-find-action">아이디 확인</button>
                        </div>
                    </form>
                    <div id="find-id-result" class="find-result-box hidden"></div>
                </div>

                <!-- 2. 초간편 임시 비밀번호 발급 폼 -->
                <div class="find-section-card compact-card">
                    <div class="fsc-header">
                        <span class="fsc-badge">STEP 2</span>
                        <span class="fsc-title">임시 비밀번호 발급 및 즉시 입장</span>
                    </div>
                    <form id="form-reset-pw" class="find-mini-form">
                        <div class="find-inputs-row">
                            <div class="auth-input-group compact-group flex-1">
                                <label>가입 아이디 (이메일)</label>
                                <input type="email" id="reset-pw-email" placeholder="example@casino.com" required>
                            </div>
                            <div class="auth-input-group compact-group flex-1">
                                <label>가입 시 닉네임</label>
                                <input type="text" id="reset-pw-nickname" placeholder="닉네임 입력" required>
                            </div>
                        </div>
                        <button type="submit" class="auth-submit-btn btn-reset-gold btn-compact-submit">🔑 임시 비밀번호 발급 및 즉시 입장</button>
                    </form>
                    <!-- 임시 비밀번호 발급 결과 알림 박스 (일치/불일치 명확한 피드백) -->
                    <div id="reset-pw-result" class="find-result-box hidden"></div>
                </div>

                <div class="auth-switch-note text-center compact-note">
                    이미 계정을 기억하고 계신가요? <a href="#" id="link-back-to-login">로그인 화면으로 돌아가기</a>
                </div>
            </div>
        `;
    }

    /**
     * 모달 이벤트 바인딩
     */
    bindAuthEvents() {
        // 탭 버튼 클릭
        document.querySelectorAll('.auth-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.renderAuthModal(tab);
            });
        });

        // 회원가입 링크
        const linkReg = document.getElementById('link-to-register');
        if (linkReg) {
            linkReg.addEventListener('click', (e) => {
                e.preventDefault();
                this.renderAuthModal('register');
            });
        }

        // 아이디/비밀번호 찾기 링크
        const linkFind = document.getElementById('link-to-find');
        if (linkFind) {
            linkFind.addEventListener('click', (e) => {
                e.preventDefault();
                this.renderAuthModal('find');
            });
        }

        // 로그인 화면으로 돌아가기 링크
        const linkBackToLogin = document.getElementById('link-back-to-login');
        if (linkBackToLogin) {
            linkBackToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.tempEntranceTimer) {
                    clearTimeout(this.tempEntranceTimer);
                    this.tempEntranceTimer = null;
                }
                this.renderAuthModal('login');
            });
        }

        // ❓ 로그인 폼 내 원클릭 계정 찾기 가이드 팝오버 토글
        const btnQuickGuide = document.getElementById('btn-quick-guide-help');
        const popover = document.getElementById('quick-guide-popover');
        if (btnQuickGuide && popover) {
            btnQuickGuide.addEventListener('click', (e) => {
                e.stopPropagation();
                popover.classList.toggle('hidden');
            });
        }
        const btnCloseQg = document.getElementById('btn-close-qg');
        if (btnCloseQg && popover) {
            btnCloseQg.addEventListener('click', () => {
                popover.classList.add('hidden');
            });
        }

        // ❓ 계정 찾기 탭 내 가이드 토글 및 하이라이트
        const btnFindTabGuide = document.getElementById('btn-find-tab-guide');
        const findGuideBox = document.getElementById('find-guide-box');
        if (btnFindTabGuide && findGuideBox) {
            btnFindTabGuide.addEventListener('click', () => {
                findGuideBox.classList.toggle('highlight-guide');
                setTimeout(() => findGuideBox.classList.remove('highlight-guide'), 1500);
            });
        }

        // ① 닉네임으로 아이디 찾기 폼 제출
        const formFindId = document.getElementById('form-find-id');
        if (formFindId) {
            formFindId.addEventListener('submit', (e) => {
                e.preventDefault();
                const nick = document.getElementById('find-id-nickname').value;
                const res = this.findIdByNickname(nick);
                const resultBox = document.getElementById('find-id-result');
                if (resultBox) {
                    resultBox.classList.remove('hidden');
                    if (res.success) {
                        resultBox.innerHTML = `
                            <div class="result-success-box">
                                <span class="rs-icon">✅</span>
                                <div class="rs-info">
                                    <div class="rs-text">회원님의 가입 아이디(이메일)</div>
                                    <div class="copy-row">
                                        <span class="rs-email selectable-text">${res.email}</span>
                                        <button type="button" class="btn-copy-tag" onclick="window.rouletteAuth.copyToClipboard('${res.email}', this)" title="아이디 복사">📋 복사</button>
                                    </div>
                                </div>
                                <button type="button" class="btn-use-found-id" id="btn-use-found-id" data-email="${res.email}">이 아이디로 로그인</button>
                            </div>
                        `;
                        const btnUse = document.getElementById('btn-use-found-id');
                        if (btnUse) {
                            btnUse.addEventListener('click', () => {
                                this.renderAuthModal('login');
                                const emailInput = document.getElementById('login-email');
                                if (emailInput) {
                                    emailInput.value = res.email;
                                    emailInput.focus();
                                }
                            });
                        }
                    } else {
                        resultBox.innerHTML = `
                            <div class="result-fail-box">
                                <span class="rs-icon">❌</span>
                                <span>${res.message}</span>
                            </div>
                        `;
                    }
                }
            });
        }

        // ② 임시 비밀번호 발급 폼 제출
        const formResetPw = document.getElementById('form-reset-pw');
        if (formResetPw) {
            formResetPw.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('reset-pw-email').value;
                const nick = document.getElementById('reset-pw-nickname').value;
                const resultBox = document.getElementById('reset-pw-result');
                const res = this.issueTempPassword(email, nick);

                if (resultBox) {
                    resultBox.classList.remove('hidden');
                }

                if (res.success) {
                    // [사용자 요구 반영] 마우스로 자유롭게 복사 가능, [📋 복사] 및 [🔑 이 임시 비밀번호로 로그인하기] 제공!
                    if (resultBox) {
                        resultBox.innerHTML = `
                            <div class="result-success-box highlight-pulse">
                                <span class="rs-icon">🎉</span>
                                <div class="rs-info">
                                    <div class="rs-text">임시 비밀번호 발급 및 로그인 준비 완료!</div>
                                    <div class="rs-credentials-summary">
                                        <div class="copy-row">
                                            <span class="lbl-dim">• 아이디:</span>
                                            <strong class="selectable-text highlight-email">${email}</strong>
                                            <button type="button" class="btn-copy-tag" onclick="window.rouletteAuth.copyToClipboard('${email}', this)" title="아이디 복사">📋 복사</button>
                                        </div>
                                        <div class="copy-row mt-4">
                                            <span class="lbl-dim">• 발급된 임시 비밀번호:</span>
                                            <strong class="selectable-text highlight-pw">${res.tempPassword}</strong>
                                            <button type="button" class="btn-copy-tag" onclick="window.rouletteAuth.copyToClipboard('${res.tempPassword}', this)" title="임시 비밀번호 복사">📋 복사</button>
                                        </div>
                                    </div>
                                    <div class="rs-action-buttons">
                                        <button type="button" class="btn-use-temp-pw" id="btn-login-with-temp-pw">🔑 이 임시 비밀번호로 로그인하기</button>
                                    </div>
                                    <div class="rs-subtext">💡 위 버튼을 누르면 일반 로그인 창에 자동 입력되며, 4초 후 자동 입장도 가능합니다.</div>
                                </div>
                            </div>
                        `;

                        // [이 임시 비밀번호로 로그인하기] 버튼 이벤트
                        const btnLoginWithTemp = document.getElementById('btn-login-with-temp-pw');
                        if (btnLoginWithTemp) {
                            btnLoginWithTemp.addEventListener('click', () => {
                                if (this.tempEntranceTimer) {
                                    clearTimeout(this.tempEntranceTimer);
                                    this.tempEntranceTimer = null;
                                }
                                this.renderAuthModal('login');
                                const emailInput = document.getElementById('login-email');
                                const pwInput = document.getElementById('login-password');
                                if (emailInput) emailInput.value = email;
                                if (pwInput) pwInput.value = res.tempPassword;
                                if (window.rouletteApp) {
                                    window.rouletteApp.showToast("💡 아이디와 임시 비밀번호가 자동 입력되었습니다. [카지노 입장]을 누르세요!");
                                }
                            });
                        }
                    }
                    if (window.rouletteApp) {
                        window.rouletteApp.showToast(`🎉 [${email}] 임시 비밀번호(${res.tempPassword})가 발급되었습니다!`);
                        window.rouletteApp.setBalance(res.user.balance);
                    }

                    // 여유 있게 복사하거나 직접 로그인할 수 있도록 4초 대기 타이머
                    if (this.tempEntranceTimer) clearTimeout(this.tempEntranceTimer);
                    this.tempEntranceTimer = setTimeout(() => {
                        this.renderHeaderProfile();
                        this.isMandatoryEntrance = false;
                        this.closeAuthModal();
                        if (window.rouletteApp && typeof window.rouletteApp.onUserLoggedIn === 'function') {
                            window.rouletteApp.onUserLoggedIn(res.user);
                        }
                    }, 4000);
                } else {
                    // [사용자 요구 반영] 안 맞으면 안 맞는다고 명확하게 경고 알림 표시!
                    if (resultBox) {
                        resultBox.innerHTML = `
                            <div class="result-fail-box shake-box">
                                <span class="rs-icon">❌</span>
                                <div class="rs-fail-info">
                                    <strong>계정 정보 불일치 안내</strong><br>
                                    입력하신 아이디(<code>${email}</code>)와 닉네임(<code>${nick}</code>)이 일치하지 않습니다.<br>
                                    등록된 회원 정보를 다시 확인해 주세요.
                                </div>
                            </div>
                        `;
                    }
                    if (window.rouletteApp) {
                        window.rouletteApp.showToast("⚠️ 입력하신 아이디와 닉네임이 일치하지 않습니다.");
                    }
                }
            });
        }

        // 로그인 폼 제출
        const formLogin = document.getElementById('form-login');
        if (formLogin) {
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const pw = document.getElementById('login-password').value;
                const res = this.loginEmail(email, pw);
                if (res.success) {
                    if (window.rouletteApp) {
                        window.rouletteApp.showToast(res.message);
                        window.rouletteApp.setBalance(res.user.balance);
                    }
                    this.renderHeaderProfile();
                    this.isMandatoryEntrance = false;
                    this.closeAuthModal();
                    if (window.rouletteApp && typeof window.rouletteApp.onUserLoggedIn === 'function') {
                        window.rouletteApp.onUserLoggedIn(res.user);
                    }
                } else {
                    alert(res.message);
                }
            });
        }

        // 회원가입 폼 제출
        const formReg = document.getElementById('form-register');
        if (formReg) {
            formReg.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('reg-email').value;
                const nick = document.getElementById('reg-nickname').value;
                const pw = document.getElementById('reg-password').value;
                const res = this.registerEmail(email, nick, pw);
                if (res.success) {
                    if (window.rouletteApp) {
                        window.rouletteApp.showToast(res.message);
                        window.rouletteApp.setBalance(res.user.balance);
                    }
                    this.renderHeaderProfile();
                    this.isMandatoryEntrance = false;
                    this.closeAuthModal();
                    if (window.rouletteApp && typeof window.rouletteApp.onUserLoggedIn === 'function') {
                        window.rouletteApp.onUserLoggedIn(res.user);
                    }
                } else {
                    alert(res.message);
                }
            });
        }



        // 아바타 선택
        document.querySelectorAll('.avatar-choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.avatar-choice-btn').forEach(b => b.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                const avatar = e.currentTarget.getAttribute('data-avatar');
                this.updateProfile(null, avatar);
                this.renderHeaderProfile();
                const large = document.querySelector('.profile-avatar-large');
                if (large) large.textContent = avatar;
            });
        });

        // 닉네임 저장
        const btnSaveProfile = document.getElementById('btn-save-profile');
        if (btnSaveProfile) {
            btnSaveProfile.addEventListener('click', () => {
                const newNick = document.getElementById('profile-new-nickname').value;
                const res = this.updateProfile(newNick, null);
                if (res.success) {
                    if (window.rouletteApp) window.rouletteApp.showToast(res.message);
                    this.renderHeaderProfile();
                    const nameEl = document.getElementById('display-profile-name');
                    if (nameEl) nameEl.textContent = res.user.nickname;
                } else {
                    alert(res.message);
                }
            });
        }

        // [내 프로필] 새 비밀번호 변경 저장 리스너
        const btnSaveNewPw = document.getElementById('btn-save-new-pw');
        if (btnSaveNewPw) {
            btnSaveNewPw.addEventListener('click', () => {
                const newPw = document.getElementById('profile-new-pw').value;
                const confirmPw = document.getElementById('profile-new-pw-confirm').value;
                const msgBox = document.getElementById('profile-pw-msg');

                if (!newPw || newPw.trim().length < 4) {
                    if (msgBox) {
                        msgBox.className = 'profile-pw-msg error';
                        msgBox.textContent = '새 비밀번호는 최소 4자 이상 입력해 주세요.';
                        msgBox.classList.remove('hidden');
                    }
                    return;
                }

                if (newPw !== confirmPw) {
                    if (msgBox) {
                        msgBox.className = 'profile-pw-msg error';
                        msgBox.textContent = '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
                        msgBox.classList.remove('hidden');
                    }
                    return;
                }

                const res = this.changePassword(newPw);
                if (res.success) {
                    if (msgBox) {
                        msgBox.className = 'profile-pw-msg success';
                        msgBox.textContent = '🎉 비밀번호가 안전하게 변경되었습니다!';
                        msgBox.classList.remove('hidden');
                    }
                    if (window.rouletteApp) {
                        window.rouletteApp.showToast("🎉 새 비밀번호로 안전하게 변경되었습니다!");
                    }
                    // 인풋 초기화 및 탭 갱신
                    document.getElementById('profile-new-pw').value = '';
                    document.getElementById('profile-new-pw-confirm').value = '';
                    setTimeout(() => {
                        this.renderAuthModal('profile');
                    }, 1200);
                } else {
                    if (msgBox) {
                        msgBox.className = 'profile-pw-msg error';
                        msgBox.textContent = res.message;
                        msgBox.classList.remove('hidden');
                    }
                }
            });
        }

        // 로그아웃
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                this.logout();
                this.renderHeaderProfile();
                if (window.rouletteApp) {
                    window.rouletteApp.showToast("성공적으로 로그아웃되었습니다. 카지노 게이트웨이로 전환합니다.");
                    if (typeof window.rouletteApp.onUserLoggedOut === 'function') {
                        window.rouletteApp.onUserLoggedOut();
                    }
                }
                this.openAuthModal('login', true);
            });
        }
    }

    openAuthModal(tab = 'auto', isMandatory = false) {
        this.isMandatoryEntrance = !!isMandatory;
        const modal = document.getElementById('auth-modal');
        const closeBtn = document.getElementById('btn-close-auth');
        const titleH2 = document.querySelector('.auth-modal-title h2');
        const titleP = document.querySelector('.auth-modal-title p');

        if (modal) {
            if (this.isMandatoryEntrance) {
                modal.classList.add('mandatory-entrance');
                if (closeBtn) closeBtn.style.display = 'none';
                if (titleH2) titleH2.textContent = '👑 VIP CASINO ENTRANCE (입장 게이트웨이)';
                if (titleP) titleP.textContent = '카지노 입장 및 게임 플레이를 위해 로그인해 주세요. 미가입자는 무료 회원가입 후 1,000만 칩을 지급받아 플레이하세요!';
            } else {
                modal.classList.remove('mandatory-entrance');
                if (closeBtn) closeBtn.style.display = 'block';
                if (titleH2) titleH2.textContent = '👤 VIP CASINO MEMBERSHIP';
                if (titleP) titleP.textContent = '무료 회원가입 및 로그인하여 1,000만 칩 혜택과 전적을 관리하세요.';
            }

            this.renderAuthModal(tab);
            modal.classList.remove('hidden');
        }
    }

    closeAuthModal() {
        if (this.isMandatoryEntrance && !this.currentUser) {
            if (window.rouletteApp) {
                window.rouletteApp.showToast("카지노 입장 및 게임 플레이를 위해 먼저 로그인해 주세요.");
            }
            return;
        }
        this.isMandatoryEntrance = false;
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * [보안 강화] 카지노 입장 후 임시 비밀번호 변경 전용 팝업 모달
     */
    renderChangePasswordModal() {
        if (!this.currentUser) return;

        let modal = document.getElementById('change-pw-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'change-pw-modal';
            modal.className = 'modal-overlay hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="change-pw-modal-content highlight-pulse-gold">
                <div class="cpw-header">
                    <div class="cpw-title-wrap">
                        <span class="cpw-shield-icon">🔒</span>
                        <h3>VIP 계정 보안 : 임시 비밀번호 변경</h3>
                    </div>
                    <button type="button" id="btn-close-change-pw" class="btn-close-modal" title="창 닫기">✕</button>
                </div>

                <div class="cpw-body">
                    <div class="cpw-notice-box">
                        <div class="cpw-notice-title">💡 안전한 카지노 이용을 위한 필수 보안 안내</div>
                        <div class="cpw-notice-desc">
                            현재 시스템에서 자동 발급된 <strong>임시 비밀번호</strong>로 로그인 중입니다.<br>
                            회원님의 소중한 머니와 계정 보호를 위해 <strong>새로운 정식 비밀번호</strong>로 변경해 주세요.
                        </div>
                    </div>

                    <div class="cpw-current-temp-badge">
                        <span class="lbl">현재 발급된 임시 비밀번호</span>
                        <div class="copy-row inline-copy">
                            <strong class="val selectable-text highlight-gold">${this.currentUser.password || '임시 비밀번호'}</strong>
                            <button type="button" class="btn-copy-tag" onclick="window.rouletteAuth.copyToClipboard('${this.currentUser.password}', this)" title="임시 비밀번호 복사">📋 복사</button>
                        </div>
                    </div>

                    <form id="form-change-temp-pw" class="cpw-form">
                        <div class="auth-input-group">
                            <label>새로 사용할 정식 비밀번호</label>
                            <input type="password" id="cpw-new-input" placeholder="새 비밀번호 입력 (4자 이상)" required autocomplete="new-password">
                        </div>
                        <div class="auth-input-group">
                            <label>새 비밀번호 확인</label>
                            <input type="password" id="cpw-confirm-input" placeholder="새 비밀번호 재입력" required autocomplete="new-password">
                        </div>

                        <div id="cpw-feedback" class="cpw-feedback-msg hidden"></div>

                        <div class="cpw-actions">
                            <button type="submit" class="auth-submit-btn btn-confirm-new-pw">🔐 새 비밀번호로 안전하게 변경</button>
                            <button type="button" id="btn-skip-change-pw" class="btn-skip-secondary">다음에 변경하기 (게임 먼저 진행)</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // 이벤트 바인딩
        const closeModal = () => {
            modal.classList.add('hidden');
        };

        const btnClose = document.getElementById('btn-close-change-pw');
        if (btnClose) {
            btnClose.addEventListener('click', closeModal);
        }

        const btnSkip = document.getElementById('btn-skip-change-pw');
        if (btnSkip) {
            btnSkip.addEventListener('click', () => {
                closeModal();
                if (window.rouletteApp) {
                    window.rouletteApp.showToast("💡 상단 [내 프로필]에서 언제든지 비밀번호를 변경하실 수 있습니다.");
                }
            });
        }

        const formChange = document.getElementById('form-change-temp-pw');
        if (formChange) {
            formChange.addEventListener('submit', (e) => {
                e.preventDefault();
                const newPw = document.getElementById('cpw-new-input').value;
                const confirmPw = document.getElementById('cpw-confirm-input').value;
                const fbBox = document.getElementById('cpw-feedback');

                if (!newPw || newPw.trim().length < 4) {
                    if (fbBox) {
                        fbBox.className = 'cpw-feedback-msg error shake-box';
                        fbBox.textContent = '새 비밀번호는 최소 4자 이상 입력해 주세요.';
                        fbBox.classList.remove('hidden');
                    }
                    return;
                }

                if (newPw !== confirmPw) {
                    if (fbBox) {
                        fbBox.className = 'cpw-feedback-msg error shake-box';
                        fbBox.textContent = '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
                        fbBox.classList.remove('hidden');
                    }
                    return;
                }

                const res = this.changePassword(newPw);
                if (res.success) {
                    if (fbBox) {
                        fbBox.className = 'cpw-feedback-msg success highlight-pulse';
                        fbBox.textContent = '🎉 새 비밀번호로 안전하게 변경되었습니다! 즐거운 게임 되세요.';
                        fbBox.classList.remove('hidden');
                    }
                    if (window.rouletteApp) {
                        window.rouletteApp.showToast("🎉 정식 비밀번호로 성공적으로 변경되었습니다!");
                    }
                    setTimeout(() => {
                        closeModal();
                    }, 1200);
                } else {
                    if (fbBox) {
                        fbBox.className = 'cpw-feedback-msg error shake-box';
                        fbBox.textContent = res.message;
                        fbBox.classList.remove('hidden');
                    }
                }
            });
        }
    }
}

// 전역 인스턴스 초기화
window.rouletteAuth = new RouletteAuth();
