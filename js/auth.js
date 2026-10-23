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

        // 로그인된 회원이 없으면 첫 번째 데모 회원을 기본 로그인
        if (!this.currentUser && this.users.length > 0) {
            this.currentUser = this.users[0];
            this.saveCurrentUser();
        }
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
     * SNS 간편 가입 및 로그인 (카카오, 구글, 네이버)
     */
    loginWithSNS(provider) {
        const providerNames = {
            'KAKAO': { name: '카카오', icon: '🟡', domain: '@kakao.com' },
            'GOOGLE': { name: '구글', icon: '🔴', domain: '@gmail.com' },
            'NAVER': { name: '네이버', icon: '🟢', domain: '@naver.com' }
        };

        const info = providerNames[provider] || { name: provider, icon: '🌐', domain: '@sns.com' };
        const randId = Math.floor(1000 + Math.random() * 9000);
        const email = `${provider.toLowerCase()}_user${randId}${info.domain}`;

        // 이미 존재하는지 확인, 없으면 자동 생성
        let user = this.users.find(u => u.email === email);
        if (!user) {
            user = {
                id: 'user_sns_' + Date.now(),
                email: email,
                nickname: `${info.name}_VIP${randId}`,
                avatar: provider === 'KAKAO' ? '🦁' : (provider === 'GOOGLE' ? '💎' : '🐉'),
                balance: 10000000,
                status: 'ACTIVE',
                type: provider,
                totalGames: 0,
                totalWins: 0,
                netProfit: 0,
                createdAt: new Date().toISOString()
            };
            this.users.unshift(user);
            this.saveUsers();
        }

        if (user.status === 'BANNED') {
            return { success: false, message: '해당 계정은 관리자에 의해 이용 정지되었습니다.' };
        }

        this.currentUser = user;
        this.saveCurrentUser();
        this.addLoginLog(user, provider);

        return { success: true, user: user, message: `${info.name} 계정으로 로그인되었습니다.` };
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
                    <button class="auth-tab-btn ${activeTab === 'register' ? 'active' : ''}" data-tab="register">회원가입</button>
                `}
                <button class="auth-tab-btn ${activeTab === 'sns' ? 'active' : ''}" data-tab="sns">SNS 간편로그인</button>
            </div>

            <div class="auth-tab-content">
                ${activeTab === 'login' ? this.getLoginTemplate() : ''}
                ${activeTab === 'register' ? this.getRegisterTemplate() : ''}
                ${activeTab === 'profile' ? this.getProfileTemplate() : ''}
                ${activeTab === 'sns' ? this.getSnsTemplate() : ''}
            </div>
        `;

        this.bindAuthEvents();
    }

    getLoginTemplate() {
        return `
            <form id="form-login" class="auth-form">
                <div class="auth-input-group">
                    <label>이메일 주소</label>
                    <input type="email" id="login-email" placeholder="example@casino.com" value="vip_player@casino.com" required>
                </div>
                <div class="auth-input-group">
                    <label>비밀번호</label>
                    <input type="password" id="login-password" placeholder="비밀번호를 입력하세요" value="1234" required>
                </div>
                <button type="submit" class="auth-submit-btn">🔐 카지노 입장 (로그인)</button>
                <div class="auth-switch-note">
                    계정이 없으신가요? <a href="#" id="link-to-register">회원가입하기</a>
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

    getSnsTemplate() {
        return `
            <div class="sns-login-box">
                <p class="sns-desc">별도의 복잡한 회원가입 없이 클릭 한 번으로 바로 카지노에 입장하세요!</p>
                <div class="sns-btn-list">
                    <button type="button" class="sns-btn sns-kakao" data-provider="KAKAO">
                        <span class="sns-icon">🟡</span>
                        <span class="sns-text">카카오 계정으로 간편 로그인</span>
                    </button>
                    <button type="button" class="sns-btn sns-google" data-provider="GOOGLE">
                        <span class="sns-icon">🔴</span>
                        <span class="sns-text">Google 계정으로 계속하기</span>
                    </button>
                    <button type="button" class="sns-btn sns-naver" data-provider="NAVER">
                        <span class="sns-icon">🟢</span>
                        <span class="sns-text">네이버 계정으로 간편 로그인</span>
                    </button>
                </div>
                <div class="sns-chip-bonus">
                    🎁 SNS 로그인 시 <strong>₩ 10,000,000</strong> 환영 칩 즉시 지급
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
                    this.closeAuthModal();
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
                    this.closeAuthModal();
                } else {
                    alert(res.message);
                }
            });
        }

        // SNS 로그인 클릭
        document.querySelectorAll('.sns-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const provider = e.currentTarget.getAttribute('data-provider');
                const res = this.loginWithSNS(provider);
                if (res.success) {
                    if (window.rouletteApp) {
                        window.rouletteApp.showToast(res.message);
                        window.rouletteApp.setBalance(res.user.balance);
                    }
                    this.renderHeaderProfile();
                    this.closeAuthModal();
                } else {
                    alert(res.message);
                }
            });
        });

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
                if (window.rouletteApp) {
                    window.rouletteApp.showToast("성공적으로 로그아웃되었습니다.");
                }
                this.renderHeaderProfile();
                this.renderAuthModal('login');
            });
        }
    }

    openAuthModal(tab = 'auto') {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            this.renderAuthModal(tab);
            modal.classList.remove('hidden');
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    }
}

// 전역 인스턴스 초기화
window.rouletteAuth = new RouletteAuth();
