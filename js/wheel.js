/**
 * 🎡 최고급 전통 카지노 유러피언 룰렛 휠 렌더러 & 물리 엔진
 * HTML5 Canvas 2D 기반 고해상도 3D 입체 렌더링 및 구슬 물리 시뮬레이션
 */

class RouletteWheel {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        // 유러피언 룰렛 37개 번호 공식 배치 순서
        this.numbers = [
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ];
        this.totalSlices = 37;
        this.sliceAngle = (Math.PI * 2) / this.totalSlices;

        // 번호 색상 정의
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
        if (num === 0) return 'green';
        return this.redNumbers.has(num) ? 'red' : 'black';
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
            // 평상시 부드러운 아이들 회전
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
        const pocketRadius = this.outerRadius * 0.58;

        if (this.ballPhase === 'rolling') {
            // 구슬이 외곽 림을 타고 역방향으로 질주
            this.ballAngle -= this.ballSpeed;
            this.ballRadius = trackRadius;

            // 구슬 감속
            this.ballSpeed *= 0.988;

            // 오디오 회전 소리 속도 업데이트
            if (window.rouletteAudio) {
                const normSpeed = Math.min(1.0, this.ballSpeed / 0.12);
                window.rouletteAudio.updateRollingSpeed(normSpeed);
            }

            // 속도가 떨어지면 림에서 내부로 낙하 시작
            if (this.ballSpeed < 0.045) {
                this.ballPhase = 'dropping';
                if (window.rouletteAudio) {
                    window.rouletteAudio.stopBallRolling();
                }
            }
        } else if (this.ballPhase === 'dropping') {
            // 안쪽으로 떨어지는 단계
            this.ballAngle -= this.ballSpeed;
            this.ballRadius -= (this.ballRadius - pocketRadius) * 0.08;
            this.ballSpeed *= 0.98;

            if (this.ballRadius <= pocketRadius + 4) {
                this.ballPhase = 'bouncing';
                this.bouncesLeft = 3;
                if (window.rouletteAudio) {
                    window.rouletteAudio.playBounce();
                }
            }
        } else if (this.ballPhase === 'bouncing') {
            // 포켓 격벽에 부딪히며 통통 튀는 단계
            this.ballAngle -= this.ballSpeed;

            // 목표 번호 포켓 각도로 부드럽게 유도 (자연스러운 포켓 안착 연출)
            const targetIndex = this.numbers.indexOf(this.targetNumber);
            const targetAngle = this.wheelAngle + targetIndex * this.sliceAngle + this.sliceAngle / 2;
            let angleDiff = Math.atan2(Math.sin(targetAngle - this.ballAngle), Math.cos(targetAngle - this.ballAngle));
            this.ballAngle += angleDiff * 0.15;

            // 미세한 반발 탄성 궤적
            const bounceOffset = Math.sin(this.bouncesLeft * Math.PI) * 4;
            this.ballRadius = pocketRadius + bounceOffset;
            this.ballSpeed *= 0.88;

            if (this.ballSpeed < 0.008) {
                if (this.bouncesLeft > 1) {
                    this.bouncesLeft--;
                    this.ballSpeed = 0.012;
                    if (window.rouletteAudio) {
                        window.rouletteAudio.playBounce();
                    }
                } else {
                    // 최종 안착
                    this.ballPhase = 'pocketed';
                    this.ballActive = false;
                    this.isSpinning = false;
                    this.wheelSpeed = 0.003; // 아이들 속도로 복귀

                    // 당첨 번호 포켓과 일치하도록 각도 정확히 고정
                    const targetIndex = this.numbers.indexOf(this.targetNumber);
                    this.ballAngle = this.wheelAngle + targetIndex * this.sliceAngle + this.sliceAngle / 2;
                    this.ballRadius = pocketRadius;

                    if (window.rouletteAudio) {
                        window.rouletteAudio.playDrop();
                    }

                    if (this.onCompleteCallback) {
                        this.onCompleteCallback(this.targetNumber);
                    }
                }
            }
        } else if (this.ballPhase === 'pocketed') {
            // 안착 후 휠과 함께 회전
            const targetIndex = this.numbers.indexOf(this.targetNumber);
            this.ballAngle = this.wheelAngle + targetIndex * this.sliceAngle + this.sliceAngle / 2;
            this.ballRadius = pocketRadius;
        }
    }

    /**
     * 스핀 시작
     * @param {number} winningNumber - 이번 라운드 당첨 번호 (0~36)
     * @param {function} onComplete - 회전 완료 시 콜백
     */
    spin(winningNumber, onComplete) {
        if (this.isSpinning) return;

        this.targetNumber = winningNumber;
        this.onCompleteCallback = onComplete;
        this.isSpinning = true;
        this.ballActive = true;
        this.ballPhase = 'rolling';

        // 휠 회전 속도 부여 (약간의 감속 회전)
        this.wheelSpeed = 0.012 + Math.random() * 0.004;

        // 구슬 초기 속도 (반대 방향 고속)
        this.ballSpeed = 0.14 + Math.random() * 0.02;
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

            // 포켓 배경
            ctx.beginPath();
            ctx.arc(0, 0, pocketOuterR, startAngle, endAngle);
            ctx.arc(0, 0, pocketInnerR, endAngle, startAngle, true);
            ctx.closePath();

            if (colorType === 'green') {
                ctx.fillStyle = '#0f7b3c';
            } else if (colorType === 'red') {
                ctx.fillStyle = '#b71212';
            } else {
                ctx.fillStyle = '#181818';
            }
            ctx.fill();

            // 황동 격벽 (Frets)
            ctx.beginPath();
            ctx.moveTo(Math.cos(startAngle) * pocketInnerR, Math.sin(startAngle) * pocketInnerR);
            ctx.lineTo(Math.cos(startAngle) * pocketOuterR, Math.sin(startAngle) * pocketOuterR);
            ctx.strokeStyle = '#e6c35c';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // 번호 텍스트 렌더링
            ctx.save();
            const midAngle = startAngle + this.sliceAngle / 2;
            const textRadius = (pocketInnerR + pocketOuterR) / 2 + 2;
            const tx = Math.cos(midAngle) * textRadius;
            const ty = Math.sin(midAngle) * textRadius;

            ctx.translate(tx, ty);
            ctx.rotate(midAngle + Math.PI / 2);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(10, r * 0.075)}px 'Cinzel', 'Outfit', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 3;
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

        // 7. 은구슬(Ball) 그리기 (외곽 좌표계)
        if (this.ballPhase !== 'idle') {
            const bx = cx + Math.cos(this.ballAngle) * this.ballRadius;
            const by = cy + Math.sin(this.ballAngle) * this.ballRadius;
            const bSize = Math.max(5, r * 0.038);

            // 구슬 그림자
            ctx.beginPath();
            ctx.arc(bx + 2, by + 2, bSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fill();

            // 은구슬 3D 광택 렌더링
            const ballGrad = ctx.createRadialGradient(bx - bSize * 0.35, by - bSize * 0.35, bSize * 0.1, bx, by, bSize);
            ballGrad.addColorStop(0, '#ffffff');
            ballGrad.addColorStop(0.4, '#e6e8eb');
            ballGrad.addColorStop(0.8, '#9aa0a6');
            ballGrad.addColorStop(1, '#5f6368');

            ctx.beginPath();
            ctx.arc(bx, by, bSize, 0, Math.PI * 2);
            ctx.fillStyle = ballGrad;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 4;
            ctx.fill();
        }
    }
}

// 창 크기 변경 시 리사이즈 연동
window.addEventListener('resize', () => {
    if (window.rouletteWheel) {
        window.rouletteWheel.initCanvas();
    }
});
