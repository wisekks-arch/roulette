/**
 * 🎡 최고급 전통 카지노 유러피언 룰렛 휠 렌더러 & 물리 엔진
 * HTML5 Canvas 2D 기반 고해상도 3D 입체 렌더링 및 구슬 물리 시뮬레이션
 */

class RouletteWheel {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        // 아메리칸 룰렛 38개 번호 공식 배치 순서 (0 및 00 포함 - 3D 라이브 캠과 100% 일치)
        this.numbers = [
            '0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1',
            '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2'
        ];
        this.totalSlices = 38;
        this.sliceAngle = (Math.PI * 2) / this.totalSlices;

        // 번호 색상 정의 (1~36)
        this.redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
        this.blackNumbers = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

        // 애니메이션 상태
        this.wheelAngle = 0;          // 휠 현재 각도 (라디안)
        this.wheelSpeed = 0.003;      // 평상시 아이들 회전 속도
        this.isSpinning = false;      // 스핀 진행 여부

        // 구슬(Ball) 상태
        this.ballActive = false;
        this.ballAngle = 0;           // 구슬 각도
        this.ballRadius = 0;          // 구슬의 중심으로부터 거리 (px)
        this.ballSpeed = 0;           // 구슬 각속도
        this.targetNumber = null;     // 최종 당첨 번호
        this.targetAngle = 0;         // 목표 각도
        this.ballPhase = 'idle';      // 'idle', 'rolling', 'dropping', 'bouncing', 'pocketed'
        this.bouncesLeft = 0;
        this.onCompleteCallback = null;

        this.initCanvas();
        this.startRenderLoop();
    }

    /**
     * 고해상도(Retina Display) 지원 캔버스 리사이즈
     */
    initCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const size = Math.min(rect.width || 420, rect.height || 420);

        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.ctx.scale(dpr, dpr);
        this.size = size;
        this.center = size / 2;
        this.outerRadius = size * 0.47;
    }

    /**
     * 번호의 색상 반환 ('red', 'black', 'green')
     */
    getNumberColor(num) {
        const s = String(num);
        if (s === '0' || s === '00') return 'green';
        const parsed = parseInt(s, 10);
        return this.redNumbers.has(parsed) ? 'red' : 'black';
    }

    /**
     * 지속적인 렌더링 루프
     */
    startRenderLoop() {
        const loop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    /**
     * 물리 및 회전 상태 업데이트
     */
    update() {
        if (!this.isSpinning) {
            // [사용자 요청] 당첨 번호에 구슬이 안착되면 룰렛판과 구슬이 100% 완벽히 정지/고정됨
            if (this.ballPhase === 'pocketed') {
                this.wheelSpeed = 0;
                if (this.targetNumber !== null) {
                    const targetIndex = this.numbers.findIndex(n => String(n) === String(this.targetNumber));
                    if (targetIndex !== -1) {
                        this.ballAngle = this.wheelAngle + targetIndex * this.sliceAngle + this.sliceAngle / 2;
                    }
                }
                return;
            }

            // 스핀 전 대기 상태에서의 부드러운 기본 회전
            this.wheelAngle += this.wheelSpeed;
            if (this.wheelAngle >= Math.PI * 2) {
                this.wheelAngle -= Math.PI * 2;
            }
            return;
        }

        // 휠 회전 감속
        this.wheelAngle += this.wheelSpeed;
        if (this.wheelAngle >= Math.PI * 2) {
            this.wheelAngle -= Math.PI * 2;
        }

        if (this.ballActive) {
            this.updateBallPhysics();
        }
    }

    /**
     * 실감 나는 구슬 물리 궤적 시뮬레이션
     */
    updateBallPhysics() {
        const trackRadius = this.outerRadius * 0.88;
        const pocketRadius = this.outerRadius * 0.60; // 번호와 포켓 홈에 자연스럽게 안착하는 반경

        if (this.ballPhase === 'rolling') {
            // 구슬이 외곽 림을 타고 역방향으로 맹렬하게 질주
            this.ballAngle -= this.ballSpeed;
            this.ballRadius = trackRadius;

            // 6~7초 실감 나는 카지노 물리 감속
            this.ballSpeed *= 0.992;

            if (window.rouletteAudio) {
                const normSpeed = Math.min(1.0, this.ballSpeed / 0.18);
                window.rouletteAudio.updateRollingSpeed(normSpeed);
            }

            // 속도가 떨어지면 림에서 내부로 낙하 시작 (약 3.5초 시점)
            if (this.ballSpeed < 0.065) {
                this.ballPhase = 'dropping';
                if (window.rouletteAudio) {
                    window.rouletteAudio.stopBallRolling();
                }
            }
        } else if (this.ballPhase === 'dropping') {
            // 안쪽 포켓 트랙으로 부드럽게 하강 (약 1.5초 소요)
            this.ballAngle -= this.ballSpeed;
            this.ballRadius -= (this.ballRadius - pocketRadius) * 0.06;
            this.ballSpeed *= 0.985;

            if (this.ballRadius <= pocketRadius + 3) {
                this.ballPhase = 'bouncing';
                this.bouncesLeft = 3; // 3회 탄성 바운스
                if (window.rouletteAudio) {
                    window.rouletteAudio.playBounce();
                }
            }
        } else if (this.ballPhase === 'bouncing') {
            // 포켓 격벽에 부딪히며 통통 튀는 단계 (약 1.5~2초 소요)
            this.ballAngle -= this.ballSpeed;

            // 목표 번호 포켓 각도로 정밀 유도
            const targetIndex = this.numbers.indexOf(this.targetNumber);
            const targetAngle = this.wheelAngle + targetIndex * this.sliceAngle + this.sliceAngle / 2;
            let angleDiff = Math.atan2(Math.sin(targetAngle - this.ballAngle), Math.cos(targetAngle - this.ballAngle));
            this.ballAngle += angleDiff * 0.12;

            const bounceOffset = Math.sin(this.bouncesLeft * Math.PI) * 2.8;
            this.ballRadius = pocketRadius + bounceOffset;
            this.ballSpeed *= 0.95;

            if (this.ballSpeed < 0.007) {
                if (this.bouncesLeft > 1) {
                    this.bouncesLeft--;
                    this.ballSpeed = 0.012 + (this.bouncesLeft * 0.002);
                    if (window.rouletteAudio) {
                        window.rouletteAudio.playBounce();
                    }
                } else {
                    // [핵심 변경] 최종 포켓 안착 시 룰렛판 및 구슬 100% 완전 고정 정지 (속도 0)
                    this.ballPhase = 'pocketed';
                    this.ballActive = false;
                    this.isSpinning = false;
                    this.wheelSpeed = 0; // 룰렛판 완전 정지 (더 이상 회전하지 않고 고정)

                    // 당첨 번호 포켓 중심각과 구슬 각도 영구 일치 락인
                    this.ballAngle = this.wheelAngle + targetIndex * this.sliceAngle + this.sliceAngle / 2;
                    this.ballRadius = pocketRadius;

                    if (window.rouletteAudio) {
                        window.rouletteAudio.playDrop();
                    }

                    // 콜백 호출: 당첨 번호 및 색상 정확히 전달
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback(this.targetNumber, this.getNumberColor(this.targetNumber));
                    }
                }
            }
        } else if (this.ballPhase === 'pocketed') {
            // 안착 후 룰렛판과 구슬이 완전 고정 정지 상태 유지
            this.wheelSpeed = 0;
            const targetIndex = this.numbers.findIndex(n => String(n) === String(this.targetNumber));
            if (targetIndex !== -1) {
                this.ballAngle = this.wheelAngle + targetIndex * this.sliceAngle + this.sliceAngle / 2;
                this.ballRadius = pocketRadius;
            }
        }
    }

    /**
     * 스핀 시작 (6~8초 감속 물리 회전 및 100% 당첨번호 보장)
     * @param {string|number} winningNumber - 이번 라운드 당첨 번호 (0~36 또는 '00')
     * @param {function} onComplete - 회전 완료 시 콜백
     */
    spin(winningNumber, onComplete) {
        if (this.isSpinning) return;

        // 인자 방어 로직: winningNumber가 콜백인 경우 또는 유효하지 않은 경우 처리
        if (typeof winningNumber === 'function') {
            onComplete = winningNumber;
            const randIdx = Math.floor(Math.random() * this.numbers.length);
            winningNumber = this.numbers[randIdx];
        } else if (winningNumber === undefined || winningNumber === null) {
            const randIdx = Math.floor(Math.random() * this.numbers.length);
            winningNumber = this.numbers[randIdx];
        }

        this.targetNumber = String(winningNumber);
        this.onCompleteCallback = onComplete;
        this.isSpinning = true;
        this.ballActive = true;
        this.ballPhase = 'rolling';

        // 휠 회전 속도 부여
        this.wheelSpeed = 0.012 + Math.random() * 0.003;

        // 구슬 초기 속도 (6~8초 지속 물리 모드)
        this.ballSpeed = 0.22 + Math.random() * 0.02;
        this.ballAngle = Math.random() * Math.PI * 2;
        this.ballRadius = this.outerRadius * 0.88;

        if (window.rouletteAudio) {
            window.rouletteAudio.startBallRolling();
        }
    }

    /**
     * 전체 룰렛 휠 및 구슬 그리기
     */
    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const cx = this.center;
        const cy = this.center;
        const r = this.outerRadius;

        ctx.clearRect(0, 0, this.size, this.size);

        // 1. 외부 마호가니 원목 림 (Wood Rim)
        const woodGrad = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r * 1.05);
        woodGrad.addColorStop(0, '#3a1808');
        woodGrad.addColorStop(0.3, '#5c290d');
        woodGrad.addColorStop(0.7, '#240d04');
        woodGrad.addColorStop(1, '#150602');

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
        ctx.fillStyle = woodGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.fill();
        ctx.restore();

        // 2. 황동 금빛 테두리 링
        const brassGrad = ctx.createRadialGradient(cx, cy, r * 0.94, cx, cy, r * 0.98);
        brassGrad.addColorStop(0, '#ffd700');
        brassGrad.addColorStop(0.5, '#b8860b');
        brassGrad.addColorStop(1, '#664d03');

        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
        ctx.strokeStyle = brassGrad;
        ctx.lineWidth = 4;
        ctx.stroke();

        // 3. 외곽 볼 트랙 (Ball Track - 짙은 메탈/골드 라이닝)
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
        ctx.fillStyle = '#111317';
        ctx.fill();
        ctx.strokeStyle = '#2b2313';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. 번호 포켓 링 렌더링 (휠 회전 각도 적용)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.wheelAngle);

        const pocketInnerR = r * 0.48;
        const pocketOuterR = r * 0.82;

        for (let i = 0; i < this.totalSlices; i++) {
            const startAngle = i * this.sliceAngle;
            const endAngle = startAngle + this.sliceAngle;
            const num = this.numbers[i];
            const colorType = this.getNumberColor(num);

            const isWinner = (this.ballPhase === 'pocketed' && String(num) === String(this.targetNumber));

            // 포켓 배경
            ctx.beginPath();
            ctx.arc(0, 0, pocketOuterR, startAngle, endAngle);
            ctx.arc(0, 0, pocketInnerR, endAngle, startAngle, true);
            ctx.closePath();

            if (isWinner) {
                // [당첨 포켓] 황금빛 네온 스포트라이트 (펄스 광채)
                const pulseAlpha = 0.78 + Math.sin(Date.now() * 0.009) * 0.22;
                ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
                ctx.fill();

                // 테두리 강력 강조
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.8;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 12;
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else {
                if (colorType === 'green') {
                    ctx.fillStyle = '#0f7b3c';
                } else if (colorType === 'red') {
                    ctx.fillStyle = '#b71212';
                } else {
                    ctx.fillStyle = '#181818';
                }
                ctx.fill();
            }

            // 황동 격벽 (Frets)
            ctx.beginPath();
            ctx.moveTo(Math.cos(startAngle) * pocketInnerR, Math.sin(startAngle) * pocketInnerR);
            ctx.lineTo(Math.cos(startAngle) * pocketOuterR, Math.sin(startAngle) * pocketOuterR);
            ctx.strokeStyle = isWinner ? '#ffffff' : '#e6c35c';
            ctx.lineWidth = isWinner ? 2.5 : 1.8;
            ctx.stroke();

            // 번호 텍스트 렌더링
            ctx.save();
            const midAngle = startAngle + this.sliceAngle / 2;
            const textRadius = (pocketInnerR + pocketOuterR) / 2 + 2;
            const tx = Math.cos(midAngle) * textRadius;
            const ty = Math.sin(midAngle) * textRadius;

            ctx.translate(tx, ty);
            ctx.rotate(midAngle + Math.PI / 2);

            if (isWinner) {
                // 당첨 번호는 1.4배 크고 또렷한 텍스트로 강조
                ctx.fillStyle = '#0a0a0a'; // 황금 바탕 위 선명한 가독성
                ctx.font = `900 ${Math.max(13, r * 0.095)}px 'Cinzel', 'Outfit', sans-serif`;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(10, r * 0.075)}px 'Cinzel', 'Outfit', sans-serif`;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 3;
            }
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num.toString(), 0, 0);
            ctx.restore();
        }

        // 5. 내부 황동 콘 (Cone) & 중심부
        const coneGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pocketInnerR);
        coneGrad.addColorStop(0, '#ffd700');
        coneGrad.addColorStop(0.3, '#d4af37');
        coneGrad.addColorStop(0.7, '#856404');
        coneGrad.addColorStop(1, '#3d2d02');

        ctx.beginPath();
        ctx.arc(0, 0, pocketInnerR, 0, Math.PI * 2);
        ctx.fillStyle = coneGrad;
        ctx.fill();
        ctx.strokeStyle = '#e6c35c';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 6. 중앙 4방향 황동 터렛 (Turret Handles)
        ctx.beginPath();
        const turretLength = pocketInnerR * 0.7;
        for (let j = 0; j < 4; j++) {
            const tAngle = (j * Math.PI) / 2;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(tAngle) * turretLength, Math.sin(tAngle) * turretLength);
        }
        ctx.strokeStyle = '#fff1a8';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 중앙 보석 캡
        const centerCap = ctx.createRadialGradient(-2, -2, 1, 0, 0, pocketInnerR * 0.28);
        centerCap.addColorStop(0, '#ffffff');
        centerCap.addColorStop(0.3, '#ffd700');
        centerCap.addColorStop(1, '#664d03');

        ctx.beginPath();
        ctx.arc(0, 0, pocketInnerR * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = centerCap;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fill();

        ctx.restore(); // 회전 복원

        // 7. 크리스탈 유리구슬(Crystal Ball) 3D 정밀 렌더링
        if (this.ballPhase !== 'idle') {
            const bx = cx + Math.cos(this.ballAngle) * this.ballRadius;
            const by = cy + Math.sin(this.ballAngle) * this.ballRadius;
            const bSize = Math.max(5.5, r * 0.04);

            // 유리구슬 깊은 그림자
            ctx.beginPath();
            ctx.arc(bx + 2.5, by + 3, bSize * 0.95, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.filter = 'blur(1.5px)';
            ctx.fill();
            ctx.filter = 'none';

            // 크리스탈 유리구슬 본체 (영롱한 유리 굴절 그라디언트)
            const glassGrad = ctx.createRadialGradient(
                bx - bSize * 0.35, by - bSize * 0.35, bSize * 0.08,
                bx, by, bSize
            );
            glassGrad.addColorStop(0, '#ffffff');       // 강한 하이라이트 반사
            glassGrad.addColorStop(0.35, '#f0f9ff');     // 맑은 크리스탈 면
            glassGrad.addColorStop(0.65, '#cce7f5');     // 내부 굴절 아쿠아 틴트
            glassGrad.addColorStop(0.9, '#82b5d1');      // 림 굴절 음영
            glassGrad.addColorStop(1, '#3b6278');        // 외곽 림 에지

            ctx.beginPath();
            ctx.arc(bx, by, bSize, 0, Math.PI * 2);
            ctx.fillStyle = glassGrad;
            ctx.shadowColor = 'rgba(180, 230, 255, 0.9)';
            ctx.shadowBlur = 6;
            ctx.fill();

            // 유리구슬 하단 2차 반사광 (Rim Caustic)
            ctx.beginPath();
            ctx.arc(bx + bSize * 0.25, by + bSize * 0.25, bSize * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();

            // 상단 정밀 핀포인트 크리스탈 광채
            ctx.beginPath();
            ctx.arc(bx - bSize * 0.38, by - bSize * 0.38, bSize * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 3;
            ctx.fill();

            // 8. 당첨 구슬 안착 시 펄스 회전 황금 타겟 조준 링(Golden Target Ring) 렌더링
            if (this.ballPhase === 'pocketed') {
                const targetR = bSize * 1.9 + Math.sin(Date.now() * 0.008) * 2;
                ctx.save();
                ctx.beginPath();
                ctx.arc(bx, by, targetR, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2.2;
                ctx.shadowColor = '#fff5a0';
                ctx.shadowBlur = 8;
                ctx.setLineDash([5, 3]);
                ctx.lineDashOffset = (Date.now() * 0.02) % 8;
                ctx.stroke();
                ctx.restore();
            }
        }
    }
}

// 창 크기 변경 시 리사이즈 연동
window.addEventListener('resize', () => {
    if (window.rouletteWheel) {
        window.rouletteWheel.initCanvas();
    }
});
