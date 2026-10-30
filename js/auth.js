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
     * [초간편 비밀번호 재설정] 아이디(이메일) + 닉네임 일치 확인 후 즉시 새 비밀번호 갱신
     * @param {string} email 
     * @param {string} nickname 
     * @param {string} newPassword 
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
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            this.users[idx] = { ...user };
        }
        this.saveUsers();

        // 새 비밀번호로 즉시 로그인 처리
        this.currentUser = user;
        this.saveCurrentUser();
        this.addLoginLog(user, 'PW_RESET');

        return { success: true, user: user, message: '비밀번호가 성공적으로 변경되었습니다! VIP 카지노 룸에 입장합니다.' };
    }

    /**
     * 일반 이메일 로그인
     */
    loginEmail(email, password) {
        if (!email || !password) {
            return { success: false, message: '이메일과 비밀번호를 입력해주세요.' };
        }

        const user = this.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) {
            return { success: false, message: '등록되지 않은 이메일 주소입니다.' };
        }

        if (user.status === 'BANNED') {
            return { success: false, message: '해당 계정은 관리자에 의해 이용 정지 상태입니다. 고객센터에 문의하세요.' };
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
                    <input type="email" id="login-email" placeholder="example@casino.com" value="vip_player@casino.com" required>
                </div>
                <div class="auth-input-group">
                    <label>비밀번호</label>
                    <input type="password" id="login-password" placeholder="비밀번호를 입력하세요" value="1234" required>
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
     * [초간편] 아이디/비밀번호 찾기 화면 템플릿 (상시 가이드 박스 및 ❓ 바로 볼 수 있는 도움말 포함)
     */
    getFindAccountTemplate() {
        return `
            <div class="find-account-container">
                <!-- 상단 헤더 및 ❓ 바로 볼 수 있는 가이드 버튼 -->
                <div class="find-header-row">
                    <div class="find-title-group">
                        <span class="find-title">🔍 계정 정보 찾기</span>
                        <button type="button" class="btn-guide-help btn-guide-prominent" id="btn-find-tab-guide" title="도움말 가이드 열기">❓ [가이드]</button>
                    </div>
                    <span class="find-subtitle">아이디 확인 또는 새 비밀번호를 3초 만에 재설정하세요.</span>
                </div>

                <!-- ❓ 바로 볼 수 있는 사용자 가이드 안내 박스 -->
                <div id="find-guide-box" class="find-guide-box">
                    <div class="fgb-title">💡 플레이어 계정 찾기 사용자 가이드</div>
                    <div class="fgb-desc">
                        • <strong>아이디(이메일)를 잊으셨나요?</strong> 가입 시 설정한 <u>닉네임</u>만 입력하시면 화면에서 3초 만에 즉시 확인됩니다.<br>
                        • <strong>비밀번호를 잊으셨나요?</strong> 등록된 <u>아이디</u>와 <u>닉네임</u>을 입력하시면 본인 확인 즉시 <u>새 비밀번호</u>로 변경되어 바로 입장됩니다.
                    </div>
                </div>

                <!-- 1. 초간편 아이디 찾기 폼 -->
                <div class="find-section-card">
                    <div class="fsc-header">
                        <span class="fsc-badge">STEP 1</span>
                        <span class="fsc-title">닉네임으로 아이디 찾기</span>
                    </div>
                    <form id="form-find-id" class="find-mini-form">
                        <div class="auth-input-group">
                            <label>가입 시 닉네임</label>
                            <input type="text" id="find-id-nickname" placeholder="가입 닉네임 입력 (예: 로열_플레이어)" required>
                        </div>
                        <button type="submit" class="auth-submit-btn btn-find-action">🔎 아이디 즉시 확인</button>
                    </form>
                    <div id="find-id-result" class="find-result-box hidden"></div>
                </div>

                <!-- 2. 초간편 비밀번호 재설정 폼 -->
                <div class="find-section-card">
                    <div class="fsc-header">
                        <span class="fsc-badge">STEP 2</span>
                        <span class="fsc-title">비밀번호 재설정 및 즉시 입장</span>
                    </div>
                    <form id="form-reset-pw" class="find-mini-form">
                        <div class="auth-input-group">
                            <label>가입 아이디 (이메일 주소)</label>
                            <input type="email" id="reset-pw-email" placeholder="example@casino.com" required>
                        </div>
                        <div class="auth-input-group">
                            <label>가입 시 닉네임</label>
                            <input type="text" id="reset-pw-nickname" placeholder="본인 닉네임 입력" required>
                        </div>
                        <div class="auth-input-group">
                            <label>새로 사용할 비밀번호</label>
                            <input type="password" id="reset-pw-newpass" placeholder="새 비밀번호 입력" required>
                        </div>
                        <button type="submit" class="auth-submit-btn btn-reset-gold">🔑 비밀번호 변경 및 즉시 입장</button>
                    </form>
                </div>

                <div class="auth-switch-note text-center">
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
                                    <div class="rs-email">${res.email}</div>
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

        // ② 비밀번호 재설정 폼 제출
        const formResetPw = document.getElementById('form-reset-pw');
        if (formResetPw) {
            formResetPw.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('reset-pw-email').value;
                const nick = document.getElementById('reset-pw-nickname').value;
                const newpass = document.getElementById('reset-pw-newpass').value;
                const res = this.resetPassword(email, nick, newpass);
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
}

// 전역 인스턴스 초기화
window.rouletteAuth = new RouletteAuth();
