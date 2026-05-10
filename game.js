// ============================================
// Super Adventure - Mario-Style Platformer Game
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Fullscreen canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mario Face Canvas
const marioFaceCanvas = document.getElementById('mario-face');
const mfCtx = marioFaceCanvas.getContext('2d');
let marioMood = 'happy'; // happy, laugh, scared, wink
let marioBlinkTimer = 0;
let marioLaughTimer = 0;

// ---- Game State ----
let gameState = 'menu'; // menu, playing, boss, gameover, win
let score = 0;
let coins = 0;
let lives = 3;
let currentLevel = 0;
let cameraX = 0;
let particles = [];
let floatingTexts = [];
let gameTime = 0;

// ---- Boss ----
let boss = null;
let bossActive = false;
let princessCage = null;
let rescueAnimTimer = 0;

// ---- Input ----
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ---- Mobile Controls ----
function setupMobile() {
    if ('ontouchstart' in window) {
        document.getElementById('mobile-controls').style.display = 'flex';
        const map = { 'btn-left': 'ArrowLeft', 'btn-right': 'ArrowRight', 'btn-jump': 'Space' };
        for (const [id, code] of Object.entries(map)) {
            const btn = document.getElementById(id);
            btn.addEventListener('touchstart', e => { e.preventDefault(); keys[code] = true; });
            btn.addEventListener('touchend', e => { e.preventDefault(); keys[code] = false; });
        }
    }
}
setupMobile();

// ---- Colors / Sprites (Pixel Art via Canvas) ----
const COLORS = {
    sky: ['#5c94fc', '#87CEEB'],
    ground: '#8B4513',
    groundTop: '#4a8f3f',
    brick: '#c84c09',
    brickLine: '#8b3506',
    question: '#f5c542',
    questionDark: '#c49a2f',
    pipe: '#30a030',
    pipeDark: '#208020',
    coin: '#ffd700',
    coinDark: '#daa520',
    player: '#e52521',
    playerSkin: '#ffb894',
    playerShirt: '#2070e0',
    enemy: '#5a0a30',
    enemyDark: '#2a0018',
    enemyGlow: '#ff0040',
    enemyEye: '#ff0000',
    enemyTeeth: '#fff',
    cloud: 'rgba(255,255,255,0.9)',
    hill: '#3a8f3a',
    hillDark: '#2d7a2d',
    castle: '#c0c0c0',
    flag: '#00cc00',
};

const TILE = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const MAX_FALL = 14;
const WALL_SLIDE_SPEED = 2;
const WALL_JUMP_FORCE_X = 8;
const WALL_JUMP_FORCE_Y = -11;
const BOUNCE_PAD_FORCE = -18;

// ---- Player ----
const player = {
    x: 80, y: 0, w: 32, h: 40,
    vx: 0, vy: 0,
    onGround: false,
    facing: 1,
    frame: 0,
    frameTimer: 0,
    invincible: 0,
    dead: false,
    wallSliding: false,
    wallDir: 0,
    canWallJump: false,
    ducking: false,
    dashTimer: 0,
    lastGroundY: 0,
    landingEffect: 0,
    trailParticles: [],
};

// ---- Level Data ----
// Legend: 1=ground, 2=brick, 3=question, 4=pipe_bottom_left, 5=pipe_bottom_right,
// 6=pipe_top_left, 7=pipe_top_right, C=coin, E=enemy, F=flag, G=goal, B=bounce pad
const LEVELS = [
    // Level 1
    {
        width: 3200,
        bg: '#5c94fc',
        map: [
            '                                                                                ',
            '                                                                                ',
            '                                                                                ',
            '                                                                                ',
            '                                                                                ',
            '                     3 3 3                         33333                        ',
            '                                                                                ',
            '               222       222          67                     F                   ',
            '                                      45       222          F                   ',
            '       C C C       C         C C      45                    F                   ',
            '   E         E       E          E     45    E    B    E     G                   ',
            '1111111111  11111111111  1111B11111111111111111B1  111111111111111111111111111    ',
            '1111111111  11111111111  111111111111111111111111  111111111111111111111111111    ',
            '                                                                                ',
        ],
        clouds: [{x:100,y:40,s:1.2},{x:350,y:60,s:0.8},{x:600,y:30,s:1},{x:950,y:55,s:1.3},{x:1300,y:35,s:0.9},{x:1700,y:50,s:1.1},{x:2100,y:40,s:1},{x:2500,y:60,s:0.8}],
        hills: [{x:0,h:80,w:200},{x:400,h:60,w:150},{x:800,h:90,w:220},{x:1400,h:70,w:180},{x:2000,h:85,w:200},{x:2600,h:65,w:160}],
    },
    // Level 2
    {
        width: 3600,
        bg: '#1a0a3e',
        map: [
            '                                                                                      ',
            '                                                                                      ',
            '                                                                                      ',
            '                                          C C C                                       ',
            '                                         222222                                       ',
            '              C     3 3               C                   C C C                       ',
            '             222                     22            C     333333                       ',
            '         C          222      67           222     22                    F              ',
            '        22    E           E  45  C              E           E           F              ',
            '   C         222    C        45 222   E   C C       222         C       F              ',
            '  222   E        E      E    45      222       E    B    E     222      G              ',
            '1111111111  1111111  1111111111B1111111111  11B111  1111111111111111111111111111        ',
            '1111111111  1111111  111111111111111111111  111111  1111111111111111111111111111        ',
            '                                                                                      ',
        ],
        clouds: [{x:200,y:30,s:1},{x:500,y:55,s:0.7},{x:900,y:40,s:1.1},{x:1400,y:35,s:0.9},{x:1900,y:50,s:1.2},{x:2400,y:30,s:0.8},{x:2900,y:45,s:1}],
        hills: [{x:100,h:70,w:180},{x:500,h:55,w:140},{x:1000,h:85,w:210},{x:1600,h:65,w:170},{x:2200,h:80,w:190},{x:2800,h:60,w:150}],
    },
    // Level 3
    {
        width: 4000,
        bg: '#fc9838',
        map: [
            '                                                                                            ',
            '                                                                                            ',
            '                                                                                            ',
            '                                                    C C C C                                  ',
            '                    C                              22222222                                  ',
            '        3 3 3      222      C C         67     C              C                              ',
            '                          33333         45    222            222        C C                   ',
            '   C          222              222  67  45          E              C   33333     F            ',
            '  222    E              E           45  45  C           222       222            F            ',
            '       222    C    C       C   E    45  45 222  C          E   E           E     F            ',
            '  E         E    E    E        222  45  45      222   C   B  222  222            G            ',
            '11111  11111111  1111111  111B1111111111111  1111B11  11111111111111111111111111111111         ',
            '11111  11111111  1111111  11111111111111111  1111111  11111111111111111111111111111111         ',
            '                                                                                            ',
        ],
        clouds: [{x:150,y:35,s:1.1},{x:450,y:50,s:0.9},{x:800,y:30,s:1.2},{x:1200,y:55,s:0.8},{x:1700,y:40,s:1},{x:2200,y:35,s:1.1},{x:2700,y:50,s:0.9},{x:3200,y:30,s:1}],
        hills: [{x:50,h:75,w:190},{x:450,h:60,w:160},{x:900,h:80,w:200},{x:1500,h:70,w:180},{x:2100,h:85,w:210},{x:2700,h:65,w:170},{x:3300,h:75,w:190}],
    }
];

let tiles = [];
let coinObjects = [];
let enemies = [];
let bouncePads = [];
let flagObj = null;
let goalObj = null;

// ---- Parse Level ----
function loadLevel(idx) {
    const level = LEVELS[idx];
    tiles = [];
    coinObjects = [];
    enemies = [];
    bouncePads = [];
    flagObj = null;
    goalObj = null;
    particles = [];
    floatingTexts = [];

    const map = level.map;
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            const ch = map[r][c];
            const x = c * TILE, y = r * TILE;
            if (ch === '1') tiles.push({ x, y, w: TILE, h: TILE, type: 'ground' });
            else if (ch === '2') tiles.push({ x, y, w: TILE, h: TILE, type: 'brick' });
            else if (ch === '3') tiles.push({ x, y, w: TILE, h: TILE, type: 'question', hit: false });
            else if (ch === '4') tiles.push({ x, y, w: TILE, h: TILE, type: 'pipe_bl' });
            else if (ch === '5') tiles.push({ x, y, w: TILE, h: TILE, type: 'pipe_br' });
            else if (ch === '6') tiles.push({ x, y, w: TILE, h: TILE, type: 'pipe_tl' });
            else if (ch === '7') tiles.push({ x, y, w: TILE, h: TILE, type: 'pipe_tr' });
            else if (ch === 'C') coinObjects.push({ x: x + 8, y: y + 8, w: 24, h: 24, collected: false, bob: Math.random() * Math.PI * 2 });
            else if (ch === 'B') bouncePads.push({ x, y: y + TILE - 14, w: TILE, h: 14, bounceTime: 0 });
            else if (ch === 'E') enemies.push({ x, y: y, w: 36, h: 36, vx: -1.5, vy: 0, alive: true, frame: 0, frameTimer: 0 });
            else if (ch === 'F') flagObj = { x: x, baseY: y };
            else if (ch === 'G') goalObj = { x, y, w: TILE, h: TILE };
        }
    }

    player.x = 80;
    player.y = 0;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.dead = false;
    player.invincible = 0;
    player.wallSliding = false;
    player.wallDir = 0;
    player.canWallJump = false;
    player.ducking = false;
    player.dashTimer = 0;
    player.lastGroundY = 0;
    player.landingEffect = 0;
    player.trailParticles = [];
    cameraX = 0;
}

// ---- Drawing Functions ----
function drawSky(level) {
    const bg = level.bg;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (bg === '#1a0a3e') {
        grad.addColorStop(0, '#0a0520');
        grad.addColorStop(1, '#1a0a3e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Stars
        for (let i = 0; i < 60; i++) {
            const sx = (i * 137 + i * i * 13) % canvas.width;
            const sy = (i * 97 + i * 17) % (canvas.height * 0.7);
            const ss = 1 + (i % 3);
            ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(gameTime * 3 + i) * 0.3})`;
            ctx.fillRect(sx, sy, ss, ss);
        }
    } else if (bg === '#fc9838') {
        grad.addColorStop(0, '#fc9838');
        grad.addColorStop(0.5, '#fcd088');
        grad.addColorStop(1, '#4a8f3f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        grad.addColorStop(0, '#5c94fc');
        grad.addColorStop(0.7, '#87CEEB');
        grad.addColorStop(1, '#4a8f3f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawClouds(level) {
    level.clouds.forEach(c => {
        const cx = c.x - cameraX * 0.3;
        const wrappedX = ((cx % (canvas.width + 200)) + canvas.width + 200) % (canvas.width + 200) - 100;
        drawCloud(wrappedX, c.y, c.s);
    });
}

function drawCloud(x, y, s) {
    ctx.fillStyle = COLORS.cloud;
    ctx.beginPath();
    ctx.arc(x, y, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 25 * s, y - 10 * s, 25 * s, 0, Math.PI * 2);
    ctx.arc(x + 50 * s, y, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 25 * s, y + 5 * s, 22 * s, 0, Math.PI * 2);
    ctx.fill();
}

function drawHills(level) {
    level.hills.forEach(h => {
        const hx = h.x - cameraX * 0.2;
        const baseY = canvas.height - 80;
        ctx.fillStyle = COLORS.hill;
        ctx.beginPath();
        ctx.moveTo(hx, baseY);
        ctx.quadraticCurveTo(hx + h.w / 2, baseY - h.h, hx + h.w, baseY);
        ctx.fill();
        ctx.fillStyle = COLORS.hillDark;
        ctx.beginPath();
        ctx.moveTo(hx + h.w * 0.3, baseY);
        ctx.quadraticCurveTo(hx + h.w / 2, baseY - h.h * 0.7, hx + h.w * 0.7, baseY);
        ctx.fill();
    });
}

// ---- Background Grass Decoration ----
function drawBackgroundGrass(level) {
    const groundY = canvas.height - 80;
    // Dense grass patches behind the level
    for (let i = 0; i < 80; i++) {
        const seed = i * 47;
        const gx = (seed * 3.7 + i * 23) % (level.width) - cameraX * 0.6;
        if (gx < -20 || gx > canvas.width + 20) continue;
        const gy = groundY + (seed % 20) - 10;
        const gh = 12 + (seed % 18);
        const sway = Math.sin(gameTime * 1.5 + i * 0.7) * 3;

        const colors = ['#2a7a2a', '#3a9a3a', '#4aaa4a', '#358535'];
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + sway * 0.5, gy - gh * 0.5, gx + sway, gy - gh);
        ctx.stroke();

        // Second blade
        ctx.strokeStyle = colors[(i + 1) % colors.length];
        ctx.beginPath();
        ctx.moveTo(gx + 4, gy);
        ctx.quadraticCurveTo(gx + 4 - sway * 0.3, gy - gh * 0.6, gx + 4 - sway * 0.5, gy - gh * 0.8);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Bushes in background
    for (let i = 0; i < 15; i++) {
        const bx = (i * 237 + 50) % level.width - cameraX * 0.4;
        if (bx < -60 || bx > canvas.width + 60) continue;
        const by = groundY - 5 + (i % 3) * 5;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#2d7a2d';
        ctx.beginPath();
        ctx.arc(bx, by, 18 + (i % 5) * 3, 0, Math.PI * 2);
        ctx.arc(bx + 20, by - 5, 15 + (i % 4) * 2, 0, Math.PI * 2);
        ctx.arc(bx + 35, by + 2, 16 + (i % 3) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawTile(t) {
    const x = t.x - cameraX, y = t.y;
    if (x < -TILE || x > canvas.width + TILE) return;

    if (t.type === 'ground') {
        // Grass top
        ctx.fillStyle = COLORS.groundTop;
        ctx.fillRect(x, y, TILE, 6);
        // Dirt
        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(x, y + 6, TILE, TILE - 6);
        // Texture dots
        ctx.fillStyle = '#7a3b10';
        ctx.fillRect(x + 8, y + 16, 3, 3);
        ctx.fillRect(x + 24, y + 26, 3, 3);
        ctx.fillRect(x + 14, y + 32, 2, 2);

        // Grass blades on top (only draw if no tile above)
        const hasTileAbove = tiles.some(tt => tt.x === t.x && tt.y === t.y - TILE);
        if (!hasTileAbove) {
            const seed = (t.x * 7 + t.y * 13) % 100;
            for (let i = 0; i < 6; i++) {
                const gx = x + (seed + i * 7) % TILE;
                const gh = 5 + ((seed + i * 3) % 8);
                const sway = Math.sin(gameTime * 2 + t.x * 0.1 + i) * 2;
                const shade = (i % 3 === 0) ? '#2d8a2d' : (i % 3 === 1) ? '#4aaf4a' : '#3d9d3d';
                ctx.strokeStyle = shade;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(gx, y);
                ctx.quadraticCurveTo(gx + sway, y - gh / 2, gx + sway * 1.5, y - gh);
                ctx.stroke();
            }
            // Small flowers occasionally
            if (seed % 17 === 0) {
                const fx = x + seed % 30 + 5;
                const fSway = Math.sin(gameTime * 1.5 + t.x) * 1.5;
                ctx.fillStyle = seed % 2 === 0 ? '#ff6688' : '#ffee44';
                ctx.beginPath();
                ctx.arc(fx + fSway, y - 8, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(fx + fSway, y - 8, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#3a8f3a';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(fx, y);
                ctx.lineTo(fx + fSway, y - 6);
                ctx.stroke();
            }
        }
    }
    else if (t.type === 'brick') {
        ctx.fillStyle = COLORS.brick;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.brickLine;
        ctx.lineWidth = 2;
        // Brick lines
        ctx.strokeRect(x, y, TILE, TILE);
        ctx.beginPath();
        ctx.moveTo(x, y + TILE / 2); ctx.lineTo(x + TILE, y + TILE / 2);
        ctx.moveTo(x + TILE / 2, y); ctx.lineTo(x + TILE / 2, y + TILE / 2);
        ctx.moveTo(x + TILE / 4, y + TILE / 2); ctx.lineTo(x + TILE / 4, y + TILE);
        ctx.moveTo(x + TILE * 3 / 4, y + TILE / 2); ctx.lineTo(x + TILE * 3 / 4, y + TILE);
        ctx.stroke();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 2, y + 2, TILE - 4, 3);
    }
    else if (t.type === 'question') {
        const bounce = t.hit ? 0 : Math.sin(gameTime * 4) * 2;
        ctx.fillStyle = t.hit ? '#888' : COLORS.question;
        ctx.fillRect(x, y + bounce, TILE, TILE);
        ctx.strokeStyle = t.hit ? '#666' : COLORS.questionDark;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y + bounce, TILE, TILE);
        if (!t.hit) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', x + TILE / 2, y + TILE / 2 + 8 + bounce);
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(x + 4, y + 4 + bounce, 8, 4);
        }
    }
    else if (t.type.startsWith('pipe')) {
        const isPipeTop = t.type.includes('t');
        ctx.fillStyle = isPipeTop ? COLORS.pipe : COLORS.pipeDark;
        ctx.fillRect(x, y, TILE, TILE);
        if (isPipeTop) {
            ctx.fillStyle = COLORS.pipeDark;
            ctx.fillRect(x, y, TILE, 8);
            // Rim
            if (t.type === 'pipe_tl') ctx.fillRect(x - 4, y, 8, TILE);
            if (t.type === 'pipe_tr') ctx.fillRect(x + TILE - 4, y, 8, TILE);
        }
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 4, y + 4, 6, TILE - 8);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x + TILE - 10, y + 4, 6, TILE - 8);
    }
}

function drawPlayer() {
    if (player.dead) return;
    if (player.invincible > 0 && Math.floor(player.invincible * 10) % 2) return;

    const px = player.x - cameraX;
    const py = player.y;
    const f = player.facing;
    const isMoving = Math.abs(player.vx) > 0.5;
    const frame = player.frame;

    ctx.save();
    if (f === -1) {
        ctx.translate(px + player.w, py);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(px, py);
    }

    // Shadow under player
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(16, 42, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hat - bigger to fit the head
    ctx.fillStyle = '#e52521';
    ctx.beginPath();
    ctx.moveTo(-2, 10);
    ctx.lineTo(-2, 0);
    ctx.quadraticCurveTo(16, -10, 34, 0);
    ctx.lineTo(34, 10);
    ctx.closePath();
    ctx.fill();
    // Hat brim - wider
    ctx.fillStyle = '#c41e1a';
    ctx.fillRect(-4, 8, 40, 5);
    // M logo circle - bigger
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(16, 2, 7, 0, Math.PI * 2);
    ctx.fill();
    // M letter - bigger
    ctx.fillStyle = '#e52521';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('M', 16, 6);

    // Face - BIGGER round head
    ctx.fillStyle = '#ffb894';
    ctx.beginPath();
    ctx.arc(16, 19, 12, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#f0a47a';
    ctx.beginPath();
    ctx.arc(4, 18, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - bigger
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(11, 17, 4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, 17, 4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupils - bigger
    ctx.fillStyle = '#1a3a6a';
    ctx.beginPath();
    ctx.arc(12, 17, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(23, 17, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(11, 15.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(22, 15.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Nose - bigger
    ctx.fillStyle = '#e8956a';
    ctx.beginPath();
    ctx.arc(17, 21, 4, 0, Math.PI * 2);
    ctx.fill();

    // Mustache - bigger and bolder
    ctx.fillStyle = '#4a2a0a';
    ctx.beginPath();
    ctx.moveTo(5, 24);
    ctx.quadraticCurveTo(11, 29, 17, 24);
    ctx.quadraticCurveTo(23, 29, 29, 24);
    ctx.quadraticCurveTo(23, 26, 17, 25);
    ctx.quadraticCurveTo(11, 26, 5, 24);
    ctx.fill();

    // Body / Shirt
    ctx.fillStyle = '#2070e0';
    ctx.beginPath();
    ctx.roundRect(4, 26, 24, 8, 2);
    ctx.fill();

    // Overalls
    ctx.fillStyle = '#e52521';
    ctx.fillRect(6, 28, 8, 8);
    ctx.fillRect(18, 28, 8, 8);
    // Overall buttons
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(10, 30, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(22, 30, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = '#ffb894';
    if (!player.onGround) {
        // Arms up when jumping
        ctx.fillRect(0, 22, 5, 8);
        ctx.fillRect(27, 22, 5, 8);
    } else if (isMoving) {
        const armSwing = Math.sin(gameTime * 10) * 3;
        ctx.fillRect(0, 26 + armSwing, 5, 8);
        ctx.fillRect(27, 26 - armSwing, 5, 8);
    } else {
        ctx.fillRect(0, 27, 5, 7);
        ctx.fillRect(27, 27, 5, 7);
    }
    // Gloves
    ctx.fillStyle = '#fff';
    if (!player.onGround) {
        ctx.beginPath(); ctx.arc(2, 22, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(30, 22, 3, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.arc(2, 34, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(30, 34, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Legs
    if (!player.onGround) {
        ctx.fillStyle = '#2070e0';
        ctx.fillRect(4, 34, 9, 5);
        ctx.fillRect(19, 34, 9, 5);
    } else if (isMoving) {
        ctx.fillStyle = '#2070e0';
        if (frame % 2 === 0) {
            ctx.fillRect(3, 34, 10, 5);
            ctx.fillRect(21, 34, 8, 5);
        } else {
            ctx.fillRect(5, 34, 8, 5);
            ctx.fillRect(19, 34, 10, 5);
        }
    } else {
        ctx.fillStyle = '#2070e0';
        ctx.fillRect(5, 34, 9, 5);
        ctx.fillRect(18, 34, 9, 5);
    }

    // Shoes
    ctx.fillStyle = '#5a2d0c';
    if (!player.onGround) {
        ctx.beginPath();
        ctx.ellipse(8, 40, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(24, 38, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.ellipse(8, 40, 7, 3, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(24, 40, 7, 3, 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawCoin(c) {
    if (c.collected) return;
    const cx = c.x - cameraX;
    if (cx < -30 || cx > canvas.width + 30) return;
    const bob = Math.sin(gameTime * 3 + c.bob) * 4;
    // Gold circle
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(cx + 12, c.y + 12 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.coinDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(cx + 9, c.y + 9 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    // $ symbol
    ctx.fillStyle = COLORS.coinDark;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$', cx + 12, c.y + 17 + bob);
}

function drawEnemy(e) {
    if (!e.alive) return;
    const ex = e.x - cameraX;
    if (ex < -40 || ex > canvas.width + 40) return;

    const pulse = Math.sin(gameTime * 6 + e.x) * 0.15;
    const wobble = Math.sin(gameTime * 4 + e.x * 0.5) * 2;

    // Scary shadow underneath
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(ex + 18, e.y + 38, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Evil glow aura
    const glowSize = 22 + pulse * 8;
    const glowGrad = ctx.createRadialGradient(ex + 18, e.y + 18, 8, ex + 18, e.y + 18, glowSize);
    glowGrad.addColorStop(0, 'rgba(255, 0, 60, 0.3)');
    glowGrad.addColorStop(1, 'rgba(255, 0, 60, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(ex + 18, e.y + 18, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(ex + 18, e.y + 18);
    ctx.rotate(wobble * 0.03);

    // Body - dark and scary
    ctx.fillStyle = COLORS.enemy;
    ctx.beginPath();
    ctx.arc(0, 0, 17 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();

    // Dark bottom
    ctx.fillStyle = COLORS.enemyDark;
    ctx.beginPath();
    ctx.arc(0, 4, 15, 0, Math.PI);
    ctx.fill();

    // Spikes/horns on top
    ctx.fillStyle = '#3a0020';
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.6;
        const spikeLen = 8 + Math.sin(gameTime * 5 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
        ctx.lineTo(Math.cos(angle) * (14 + spikeLen), Math.sin(angle) * (14 + spikeLen));
        ctx.lineTo(Math.cos(angle + 0.15) * 14, Math.sin(angle + 0.15) * 14);
        ctx.fill();
    }

    // Glowing red eyes
    const lookDir = e.vx < 0 ? -2 : 2;
    // Eye sockets (dark)
    ctx.fillStyle = '#000';
    ctx.fillRect(-10, -8, 9, 9);
    ctx.fillRect(2, -8, 9, 9);
    // Red glowing pupils
    ctx.fillStyle = COLORS.enemyEye;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    ctx.fillRect(-8 + lookDir, -6, 5, 5);
    ctx.fillRect(4 + lookDir, -6, 5, 5);
    // Tiny white glint
    ctx.fillStyle = '#fff';
    ctx.fillRect(-7 + lookDir, -7, 2, 2);
    ctx.fillRect(5 + lookDir, -7, 2, 2);
    ctx.shadowBlur = 0;

    // Angry thick eyebrows
    ctx.fillStyle = '#1a0008';
    ctx.save();
    ctx.translate(-6, -10);
    ctx.rotate(-0.4);
    ctx.fillRect(0, 0, 10, 3);
    ctx.restore();
    ctx.save();
    ctx.translate(2, -12);
    ctx.rotate(0.4);
    ctx.fillRect(0, 0, 10, 3);
    ctx.restore();

    // Scary mouth with teeth
    ctx.fillStyle = '#1a0008';
    ctx.beginPath();
    ctx.arc(0, 8, 10, 0.1, Math.PI - 0.1);
    ctx.fill();
    // Teeth - jagged
    ctx.fillStyle = COLORS.enemyTeeth;
    for (let i = 0; i < 5; i++) {
        const tx = -8 + i * 4;
        const th = 3 + Math.sin(i * 1.5) * 2;
        ctx.beginPath();
        ctx.moveTo(tx, 6);
        ctx.lineTo(tx + 2, 6 + th);
        ctx.lineTo(tx + 4, 6);
        ctx.fill();
    }
    // Bottom teeth
    for (let i = 0; i < 4; i++) {
        const tx = -6 + i * 4;
        ctx.beginPath();
        ctx.moveTo(tx, 14);
        ctx.lineTo(tx + 2, 11);
        ctx.lineTo(tx + 4, 14);
        ctx.fill();
    }

    ctx.restore();

    // Feet animation with claws
    const step = Math.sin(gameTime * 8 + e.x) * 3;
    ctx.fillStyle = '#1a0008';
    ctx.fillRect(ex + 4, e.y + 30 + step, 10, 6);
    ctx.fillRect(ex + 22, e.y + 30 - step, 10, 6);
    // Claws
    ctx.fillStyle = '#555';
    ctx.fillRect(ex + 2, e.y + 34 + step, 3, 4);
    ctx.fillRect(ex + 8, e.y + 34 + step, 3, 4);
    ctx.fillRect(ex + 24, e.y + 34 - step, 3, 4);
    ctx.fillRect(ex + 30, e.y + 34 - step, 3, 4);

    // Occasional evil particle
    if (Math.random() < 0.05) {
        particles.push({
            x: e.x + 18 + (Math.random() - 0.5) * 20,
            y: e.y + 10,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 2 - 0.5,
            size: 2 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#ff0040' : '#8800aa',
            life: 0.6,
        });
    }
}

function drawBouncePad(bp) {
    const bx = bp.x - cameraX;
    if (bx < -TILE || bx > canvas.width + TILE) return;
    const squish = Math.max(0, bp.bounceTime) * 6;
    const glow = Math.max(0, bp.bounceTime) * 0.5;
    
    // Base
    ctx.fillStyle = '#555';
    ctx.fillRect(bx + 4, bp.y + 8 + squish, TILE - 8, 6 - squish);
    
    // Spring coils
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        const cx = bx + 10 + i * 10;
        ctx.beginPath();
        ctx.moveTo(cx, bp.y + 8 + squish);
        ctx.lineTo(cx, bp.y + 2 + squish * 0.5);
        ctx.stroke();
    }
    
    // Top pad
    const padColor = bp.bounceTime > 0 ? '#ff4444' : '#e52521';
    ctx.fillStyle = padColor;
    ctx.fillRect(bx + 2, bp.y - 2 + squish * 0.5, TILE - 4, 6);
    
    // Glow effect
    if (glow > 0) {
        ctx.fillStyle = `rgba(255, 100, 100, ${glow})`;
        ctx.beginPath();
        ctx.arc(bx + TILE / 2, bp.y, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Arrows
    ctx.fillStyle = '#ffd700';
    const arrowBob = Math.sin(gameTime * 5) * 3;
    ctx.beginPath();
    ctx.moveTo(bx + TILE / 2 - 6, bp.y - 8 + arrowBob);
    ctx.lineTo(bx + TILE / 2, bp.y - 16 + arrowBob);
    ctx.lineTo(bx + TILE / 2 + 6, bp.y - 8 + arrowBob);
    ctx.fill();
}

function drawPlayerTrail() {
    player.trailParticles.forEach((tp, i) => {
        tp.life -= 0.05;
        if (tp.life <= 0) { player.trailParticles.splice(i, 1); return; }
        ctx.globalAlpha = tp.life * 0.4;
        ctx.fillStyle = tp.color;
        ctx.beginPath();
        ctx.arc(tp.x - cameraX, tp.y, tp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function drawLandingEffect() {
    if (player.landingEffect > 0) {
        const alpha = player.landingEffect;
        const radius = (1 - alpha) * 40;
        ctx.strokeStyle = `rgba(200, 200, 200, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(player.x + player.w / 2 - cameraX, player.y + player.h, radius, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Dust puffs
        ctx.fillStyle = `rgba(180, 160, 140, ${alpha * 0.6})`;
        const spread = (1 - alpha) * 30;
        ctx.beginPath();
        ctx.arc(player.x + player.w / 2 - cameraX - spread, player.y + player.h - 2, 6 * alpha, 0, Math.PI * 2);
        ctx.arc(player.x + player.w / 2 - cameraX + spread, player.y + player.h - 2, 6 * alpha, 0, Math.PI * 2);
        ctx.fill();
        
        // Small rocks
        ctx.fillStyle = `rgba(120, 100, 80, ${alpha})`;
        for (let i = 0; i < 4; i++) {
            const rx = player.x + player.w / 2 - cameraX + Math.sin(i * 1.5 + gameTime * 2) * spread * 0.8;
            const ry = player.y + player.h - (1 - alpha) * 15 * Math.abs(Math.sin(i * 2.1));
            ctx.fillRect(rx - 2, ry - 2, 3, 3);
        }
    }
}

function drawWallSlideEffect() {
    if (player.wallSliding) {
        const wx = player.wallDir === 1 ? player.x + player.w : player.x;
        const sx = wx - cameraX;
        // Friction sparks
        for (let i = 0; i < 3; i++) {
            const sy = player.y + 10 + i * 10 + Math.sin(gameTime * 15 + i) * 4;
            ctx.fillStyle = `rgba(255, 200, 100, ${0.5 + Math.random() * 0.5})`;
            ctx.fillRect(sx - 2, sy, 4, 3);
        }
        // Dust trail
        ctx.fillStyle = `rgba(200, 200, 200, 0.3)`;
        ctx.beginPath();
        ctx.arc(sx, player.y + player.h - 5, 6 + Math.sin(gameTime * 8) * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawFlag() {
    if (!flagObj) return;
    const fx = flagObj.x - cameraX;
    // Pole
    ctx.fillStyle = '#888';
    ctx.fillRect(fx + 18, flagObj.baseY, 4, TILE * 3);
    // Ball on top
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(fx + 20, flagObj.baseY, 6, 0, Math.PI * 2);
    ctx.fill();
    // Flag
    const wave = Math.sin(gameTime * 3) * 3;
    ctx.fillStyle = COLORS.flag;
    ctx.beginPath();
    ctx.moveTo(fx + 22, flagObj.baseY + 5);
    ctx.lineTo(fx + 50 + wave, flagObj.baseY + 15);
    ctx.lineTo(fx + 22, flagObj.baseY + 30);
    ctx.fill();
    // Star on flag
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px Arial';
    ctx.fillText('★', fx + 30 + wave * 0.5, flagObj.baseY + 22);
}

function drawParticles() {
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life -= 0.02;
        if (p.life <= 0) { particles.splice(i, 1); return; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cameraX, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
    });
}

function drawFloatingTexts() {
    floatingTexts.forEach((ft, i) => {
        ft.y -= 1.5;
        ft.life -= 0.025;
        if (ft.life <= 0) { floatingTexts.splice(i, 1); return; }
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 18px Cairo';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x - cameraX, ft.y);
        ctx.globalAlpha = 1;
    });
}

// ---- Spawn Particles ----
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 1) * 6,
            size: 3 + Math.random() * 4,
            color,
            life: 1,
        });
    }
}

function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 1 });
}

// ---- Collision ----
function rectCollide(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- Update ----
function update() {
    if (gameState !== 'playing') return;
    gameTime += 0.016;

    // Player input
    let moveX = 0;
    if (keys['ArrowRight'] || keys['KeyD']) { moveX = 1; player.facing = 1; }
    if (keys['ArrowLeft'] || keys['KeyA']) { moveX = -1; player.facing = -1; }

    // Ducking
    player.ducking = (keys['ArrowDown'] || keys['KeyS']) && player.onGround;

    // Dash (shift key)
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
        if (player.dashTimer <= 0 && Math.abs(moveX) > 0) {
            player.dashTimer = 0.2;
            player.vx = moveX * MOVE_SPEED * 3;
            // Dash particles
            for (let i = 0; i < 5; i++) {
                player.trailParticles.push({
                    x: player.x + player.w / 2,
                    y: player.y + player.h / 2 + (Math.random() - 0.5) * 20,
                    size: 3 + Math.random() * 4,
                    color: '#87CEEB',
                    life: 1,
                });
            }
            playSound('dash');
        }
    }

    if (player.dashTimer > 0) {
        player.dashTimer -= 0.016;
    } else {
        player.vx = player.ducking ? moveX * MOVE_SPEED * 0.4 : moveX * MOVE_SPEED;
    }

    // Jump
    const jumpPressed = keys['ArrowUp'] || keys['KeyW'] || keys['Space'];
    if (jumpPressed && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        // Jump dust
        spawnParticles(player.x + player.w / 2, player.y + player.h, '#bbb', 4);
        playSound('jump');
    }

    // Wall jump
    if (jumpPressed && player.wallSliding && player.canWallJump) {
        player.vy = WALL_JUMP_FORCE_Y;
        player.vx = -player.wallDir * WALL_JUMP_FORCE_X;
        player.facing = -player.wallDir;
        player.wallSliding = false;
        player.canWallJump = false;
        spawnParticles(player.x + (player.wallDir === 1 ? player.w : 0), player.y + player.h / 2, '#fff', 6);
        playSound('jump');
    }

    // Walking animation
    if (Math.abs(player.vx) > 0.5 && player.onGround) {
        player.frameTimer += 0.16;
        if (player.frameTimer > 0.2) {
            player.frame = (player.frame + 1) % 4;
            player.frameTimer = 0;
        }
    } else {
        player.frame = 0;
    }

    // Movement trail when fast
    if (Math.abs(player.vx) > MOVE_SPEED || Math.abs(player.vy) > 8) {
        player.trailParticles.push({
            x: player.x + player.w / 2,
            y: player.y + player.h / 2,
            size: 2 + Math.random() * 3,
            color: player.vy > 8 ? '#ff8844' : '#aaddff',
            life: 0.6,
        });
    }

    // Gravity
    player.vy += GRAVITY;
    // Wall sliding slows fall
    if (player.wallSliding) {
        if (player.vy > WALL_SLIDE_SPEED) player.vy = WALL_SLIDE_SPEED;
    }
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;

    // Move X
    player.x += player.vx;
    if (player.x < 0) player.x = 0;

    // Tile collision X + wall detection
    player.wallSliding = false;
    player.canWallJump = false;
    tiles.forEach(t => {
        if (rectCollide(player, t)) {
            if (player.vx > 0) {
                player.x = t.x - player.w;
                if (!player.onGround && moveX > 0) {
                    player.wallSliding = true;
                    player.wallDir = 1;
                    player.canWallJump = true;
                }
            } else if (player.vx < 0) {
                player.x = t.x + t.w;
                if (!player.onGround && moveX < 0) {
                    player.wallSliding = true;
                    player.wallDir = -1;
                    player.canWallJump = true;
                }
            }
        }
    });

    // Move Y
    player.y += player.vy;
    player.onGround = false;

    // Track falling distance for landing effect
    const wasFalling = player.vy > 6;
    const prevVy = player.vy;

    // Tile collision Y
    tiles.forEach(t => {
        if (rectCollide(player, t)) {
            if (player.vy > 0) {
                player.y = t.y - player.h;
                // Landing effect based on fall speed
                if (wasFalling) {
                    player.landingEffect = Math.min(1, Math.abs(prevVy) / MAX_FALL);
                    const intensity = Math.floor(Math.abs(prevVy) / 3);
                    spawnParticles(player.x + player.w / 2, player.y + player.h, '#bba488', intensity);
                    // Screen shake for hard landings
                    if (Math.abs(prevVy) > 10) {
                        spawnFloatingText(player.x + player.w / 2, player.y, '💥', '#fff');
                        playSound('land');
                    }
                }
                player.vy = 0;
                player.onGround = true;
            } else if (player.vy < 0) {
                player.y = t.y + t.h;
                player.vy = 0;
                // Hit question block
                if (t.type === 'question' && !t.hit) {
                    t.hit = true;
                    coins++;
                    score += 100;
                    spawnParticles(t.x + TILE / 2, t.y, COLORS.coin, 8);
                    spawnFloatingText(t.x + TILE / 2, t.y - 10, '+100', '#ffd700');
                    playSound('coin');
                    triggerMarioLaugh();
                }
                // Hit brick
                if (t.type === 'brick') {
                    spawnParticles(t.x + TILE / 2, t.y, COLORS.brick, 6);
                }
            }
        }
    });

    // Bounce Pads
    bouncePads.forEach(bp => {
        if (bp.bounceTime > 0) bp.bounceTime -= 0.03;
        if (rectCollide(player, bp) && player.vy > 0) {
            player.vy = BOUNCE_PAD_FORCE;
            player.onGround = false;
            bp.bounceTime = 1;
            score += 25;
            spawnParticles(bp.x + TILE / 2, bp.y, '#ff4444', 10);
            spawnParticles(bp.x + TILE / 2, bp.y, '#ffd700', 6);
            spawnFloatingText(bp.x + TILE / 2, bp.y - 20, '🚀 BOUNCE!', '#ff4444');
            playSound('bounce');
        }
    });

    // Landing effect decay
    if (player.landingEffect > 0) player.landingEffect -= 0.04;

    // Coins
    coinObjects.forEach(c => {
        if (!c.collected && rectCollide(player, c)) {
            c.collected = true;
            coins++;
            score += 50;
            spawnParticles(c.x + 12, c.y + 12, COLORS.coin, 6);
            spawnFloatingText(c.x + 12, c.y, '+50', '#ffd700');
            playSound('coin');
        }
    });

    // Enemies
    enemies.forEach(e => {
        if (!e.alive) return;

        // Move X
        e.x += e.vx;

        // Horizontal tile collision
        tiles.forEach(t => {
            if (rectCollide(e, t)) {
                if (e.vx > 0) { e.x = t.x - e.w; e.vx *= -1; }
                else if (e.vx < 0) { e.x = t.x + t.w; e.vx *= -1; }
            }
        });

        // Gravity
        e.vy = (e.vy || 0) + GRAVITY;
        if (e.vy > MAX_FALL) e.vy = MAX_FALL;
        e.y += e.vy;

        // Vertical tile collision
        let onPlatform = false;
        tiles.forEach(t => {
            if (rectCollide(e, t)) {
                if (e.vy >= 0) {
                    e.y = t.y - e.h;
                    e.vy = 0;
                    onPlatform = true;
                }
            }
        });

        // Edge detection - turn around before falling off platform
        if (onPlatform) {
            const checkX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
            const checkY = e.y + e.h + 2;
            let hasFloorAhead = false;
            tiles.forEach(t => {
                if (checkX >= t.x && checkX <= t.x + t.w && checkY >= t.y && checkY <= t.y + t.h) {
                    hasFloorAhead = true;
                }
            });
            if (!hasFloorAhead) {
                e.vx *= -1;
            }
        }

        // Enemy-player collision
        if (e.alive && rectCollide(player, e) && player.invincible <= 0) {
            if (player.vy > 0 && player.y + player.h - e.y < 20) {
                // Stomp!
                e.alive = false;
                player.vy = JUMP_FORCE * 0.6;
                score += 200;
                spawnParticles(e.x + 18, e.y + 18, COLORS.enemy, 10);
                spawnFloatingText(e.x + 18, e.y, '+200', '#fff');
                playSound('stomp');
                triggerMarioLaugh();
            } else {
                // Player hit
                playerHit();
            }
        }
    });

    // Goal
    if (goalObj && rectCollide(player, goalObj)) {
        score += 1000;
        spawnFloatingText(player.x, player.y - 20, '+1000', '#ffd700');
        playSound('clear');
        currentLevel++;
        if (currentLevel >= LEVELS.length) {
            // Start boss fight!
            startBossFight();
        } else {
            loadLevel(currentLevel);
        }
        updateHUD();
    }

    // Fall off
    if (player.y > canvas.height + 50) {
        playerHit(true);
    }

    // Invincibility timer
    if (player.invincible > 0) player.invincible -= 0.016;

    // Camera
    const targetCam = player.x - canvas.width / 3;
    cameraX += (targetCam - cameraX) * 0.1;
    if (cameraX < 0) cameraX = 0;
    const maxCam = LEVELS[currentLevel].width - canvas.width;
    if (cameraX > maxCam) cameraX = maxCam;

    updateHUD();
}

function playerHit(fell) {
    lives--;
    if (lives <= 0) {
        gameState = 'gameover';
        document.getElementById('gameover-screen').style.display = 'flex';
        document.getElementById('finalScore').textContent = score;
        document.getElementById('hud').style.display = 'none';
        playSound('gameover');
    } else {
        if (fell) {
            if (bossActive) {
                startBossFight();
            } else {
                loadLevel(currentLevel);
            }
        } else {
            player.invincible = 2;
            player.vy = JUMP_FORCE * 0.8;
            spawnParticles(player.x + 16, player.y + 20, '#ff0000', 8);
        }
        playSound('hit');
    }
    updateHUD();
}

function updateHUD() {
    document.getElementById('coinCount').textContent = coins;
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('levelNum').textContent = currentLevel + 1;
}

// ---- Sound (Web Audio) ----
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = 0.15;

    const t = audioCtx.currentTime;
    switch (type) {
        case 'jump':
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.linearRampToValueAtTime(800, t + 0.1);
            gain.gain.linearRampToValueAtTime(0, t + 0.15);
            osc.start(t); osc.stop(t + 0.15);
            break;
        case 'bounce':
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(1200, t + 0.15);
            osc.frequency.linearRampToValueAtTime(1600, t + 0.25);
            gain.gain.value = 0.2;
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.start(t); osc.stop(t + 0.3);
            break;
        case 'dash':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.linearRampToValueAtTime(900, t + 0.08);
            gain.gain.value = 0.1;
            gain.gain.linearRampToValueAtTime(0, t + 0.12);
            osc.start(t); osc.stop(t + 0.12);
            break;
        case 'land':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.linearRampToValueAtTime(60, t + 0.15);
            gain.gain.value = 0.2;
            gain.gain.linearRampToValueAtTime(0, t + 0.2);
            osc.start(t); osc.stop(t + 0.2);
            break;
        case 'coin':
            osc.type = 'square';
            osc.frequency.setValueAtTime(988, t);
            osc.frequency.setValueAtTime(1319, t + 0.07);
            gain.gain.linearRampToValueAtTime(0, t + 0.15);
            osc.start(t); osc.stop(t + 0.15);
            break;
        case 'stomp':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.linearRampToValueAtTime(100, t + 0.15);
            gain.gain.linearRampToValueAtTime(0, t + 0.2);
            osc.start(t); osc.stop(t + 0.2);
            break;
        case 'hit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.3);
            gain.gain.linearRampToValueAtTime(0, t + 0.35);
            osc.start(t); osc.stop(t + 0.35);
            break;
        case 'gameover':
            osc.type = 'square';
            osc.frequency.setValueAtTime(392, t);
            osc.frequency.setValueAtTime(330, t + 0.2);
            osc.frequency.setValueAtTime(262, t + 0.4);
            osc.frequency.setValueAtTime(196, t + 0.6);
            gain.gain.linearRampToValueAtTime(0, t + 0.9);
            osc.start(t); osc.stop(t + 0.9);
            break;
        case 'clear':
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, t);
            osc.frequency.setValueAtTime(659, t + 0.1);
            osc.frequency.setValueAtTime(784, t + 0.2);
            osc.frequency.setValueAtTime(1047, t + 0.3);
            gain.gain.linearRampToValueAtTime(0, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
            break;
        case 'bosshit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.3);
            gain.gain.value = 0.25;
            gain.gain.linearRampToValueAtTime(0, t + 0.4);
            osc.start(t); osc.stop(t + 0.4);
            break;
        case 'bossroar':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.setValueAtTime(120, t + 0.1);
            osc.frequency.setValueAtTime(60, t + 0.3);
            gain.gain.value = 0.3;
            gain.gain.linearRampToValueAtTime(0, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
            break;
        case 'rescue':
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, t);
            osc.frequency.setValueAtTime(659, t + 0.15);
            osc.frequency.setValueAtTime(784, t + 0.3);
            osc.frequency.setValueAtTime(1047, t + 0.45);
            osc.frequency.setValueAtTime(1319, t + 0.6);
            gain.gain.value = 0.2;
            gain.gain.linearRampToValueAtTime(0, t + 0.8);
            osc.start(t); osc.stop(t + 0.8);
            break;
    }
}

// ============================================
// BOSS FIGHT SYSTEM
// ============================================

function startBossFight() {
    gameState = 'boss';
    cameraX = 0;
    particles = [];
    floatingTexts = [];
    tiles = [];
    coinObjects = [];
    enemies = [];
    bouncePads = [];
    flagObj = null;
    goalObj = null;

    // Build boss arena
    const arenaW = canvas.width;
    for (let i = 0; i < Math.ceil(arenaW / TILE) + 2; i++) {
        tiles.push({ x: i * TILE, y: canvas.height - TILE * 2, w: TILE, h: TILE, type: 'ground' });
        tiles.push({ x: i * TILE, y: canvas.height - TILE, w: TILE, h: TILE, type: 'ground' });
    }
    // Walls
    for (let i = 0; i < 10; i++) {
        tiles.push({ x: 0, y: canvas.height - TILE * (i + 2), w: TILE, h: TILE, type: 'brick' });
        tiles.push({ x: arenaW - TILE, y: canvas.height - TILE * (i + 2), w: TILE, h: TILE, type: 'brick' });
    }
    // Platforms
    tiles.push({ x: TILE * 3, y: canvas.height - TILE * 5, w: TILE, h: TILE, type: 'brick' });
    tiles.push({ x: TILE * 4, y: canvas.height - TILE * 5, w: TILE, h: TILE, type: 'brick' });
    tiles.push({ x: TILE * 5, y: canvas.height - TILE * 5, w: TILE, h: TILE, type: 'brick' });
    tiles.push({ x: arenaW - TILE * 6, y: canvas.height - TILE * 5, w: TILE, h: TILE, type: 'brick' });
    tiles.push({ x: arenaW - TILE * 5, y: canvas.height - TILE * 5, w: TILE, h: TILE, type: 'brick' });
    tiles.push({ x: arenaW - TILE * 4, y: canvas.height - TILE * 5, w: TILE, h: TILE, type: 'brick' });
    // Center platform
    const centerX = Math.floor(arenaW / 2 / TILE);
    tiles.push({ x: (centerX - 1) * TILE, y: canvas.height - TILE * 7, w: TILE, h: TILE, type: 'brick' });
    tiles.push({ x: centerX * TILE, y: canvas.height - TILE * 7, w: TILE, h: TILE, type: 'brick' });
    tiles.push({ x: (centerX + 1) * TILE, y: canvas.height - TILE * 7, w: TILE, h: TILE, type: 'brick' });

    // Princess cage
    princessCage = {
        x: arenaW - TILE * 5,
        y: canvas.height - TILE * 2 - 120,
        w: 80,
        h: 120,
        freed: false,
    };

    // Boss
    boss = {
        x: arenaW / 2 - 40,
        y: canvas.height - TILE * 2 - 80,
        w: 80,
        h: 80,
        vx: 2,
        vy: 0,
        hp: 5,
        maxHp: 5,
        alive: true,
        phase: 1,
        attackTimer: 0,
        hurtTimer: 0,
        chargeTimer: 0,
        isCharging: false,
    };
    bossActive = true;

    player.x = TILE * 2;
    player.y = canvas.height - TILE * 2 - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.invincible = 1;

    playSound('bossroar');
}

function updateBoss() {
    if (!boss || !boss.alive) return;
    gameTime += 0.016;

    const b = boss;
    b.attackTimer += 0.016;
    if (b.hurtTimer > 0) b.hurtTimer -= 0.016;

    // Boss AI
    if (!b.isCharging) {
        b.x += b.vx;
        // Bounce off walls
        if (b.x <= TILE) { b.x = TILE; b.vx = Math.abs(b.vx); }
        if (b.x + b.w >= canvas.width - TILE) { b.x = canvas.width - TILE - b.w; b.vx = -Math.abs(b.vx); }

        // Phase 2: faster, charges at player
        if (b.hp <= 3) {
            b.phase = 2;
            b.chargeTimer += 0.016;
            if (b.chargeTimer > 3) {
                b.isCharging = true;
                b.chargeTimer = 0;
                b.vx = player.x > b.x ? 6 : -6;
                playSound('bossroar');
            }
        }
    } else {
        // Charging
        b.x += b.vx * 1.5;
        b.chargeTimer += 0.016;
        if (b.chargeTimer > 1 || b.x <= TILE || b.x + b.w >= canvas.width - TILE) {
            b.isCharging = false;
            b.chargeTimer = 0;
            b.vx = player.x > b.x ? 2 : -2;
        }
    }

    // Gravity
    b.vy += GRAVITY;
    if (b.vy > MAX_FALL) b.vy = MAX_FALL;
    b.y += b.vy;

    // Boss-tile collision Y
    tiles.forEach(t => {
        if (b.x < t.x + t.w && b.x + b.w > t.x && b.y < t.y + t.h && b.y + b.h > t.y) {
            if (b.vy >= 0) {
                b.y = t.y - b.h;
                b.vy = 0;
            }
        }
    });

    // Boss-player collision
    if (b.hurtTimer <= 0 && player.invincible <= 0) {
        if (player.x < b.x + b.w && player.x + player.w > b.x &&
            player.y < b.y + b.h && player.y + player.h > b.y) {
            if (player.vy > 0 && player.y + player.h - b.y < 25) {
                // Stomp boss!
                b.hp--;
                b.hurtTimer = 1;
                player.vy = JUMP_FORCE * 0.8;
                score += 500;
                spawnParticles(b.x + b.w / 2, b.y, '#ff0040', 15);
                spawnFloatingText(b.x + b.w / 2, b.y - 20, '-1 HP', '#ff0000');
                playSound('bosshit');

                if (b.hp <= 0) {
                    // Boss defeated!
                    b.alive = false;
                    bossActive = false;
                    score += 5000;
                    spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ff0040', 30);
                    spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ffd700', 20);
                    spawnFloatingText(b.x + b.w / 2, b.y, '+5000', '#ffd700');

                    // Free princess after delay
                    setTimeout(() => {
                        if (princessCage) princessCage.freed = true;
                        playSound('rescue');
                        setTimeout(() => {
                            gameState = 'win';
                            document.getElementById('win-screen').style.display = 'flex';
                            document.getElementById('winScore').textContent = score;
                            document.getElementById('hud').style.display = 'none';
                            drawRescueScene();
                        }, 2000);
                    }, 1500);
                }
            } else {
                // Bounce player away without killing
                player.invincible = 2;
                player.vy = JUMP_FORCE * 0.7;
                player.vx = player.x < b.x ? -8 : 8;
                spawnParticles(player.x + 16, player.y + 20, '#ff4444', 6);
                playSound('hit');
            }
        }
    }

    // Player update in boss
    let moveX = 0;
    if (keys['ArrowRight'] || keys['KeyD']) { moveX = 1; player.facing = 1; }
    if (keys['ArrowLeft'] || keys['KeyA']) { moveX = -1; player.facing = -1; }
    player.vx = moveX * MOVE_SPEED;

    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        playSound('jump');
    }

    // Walking animation
    if (Math.abs(player.vx) > 0.5 && player.onGround) {
        player.frameTimer += 0.16;
        if (player.frameTimer > 0.2) { player.frame = (player.frame + 1) % 4; player.frameTimer = 0; }
    } else { player.frame = 0; }

    player.vy += GRAVITY;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;
    player.x += player.vx;
    if (player.x < TILE) player.x = TILE;
    if (player.x + player.w > canvas.width - TILE) player.x = canvas.width - TILE - player.w;

    tiles.forEach(t => {
        if (rectCollide(player, t)) {
            if (player.vx > 0) player.x = t.x - player.w;
            else if (player.vx < 0) player.x = t.x + t.w;
        }
    });

    player.y += player.vy;
    player.onGround = false;
    tiles.forEach(t => {
        if (rectCollide(player, t)) {
            if (player.vy > 0) { player.y = t.y - player.h; player.vy = 0; player.onGround = true; }
            else if (player.vy < 0) { player.y = t.y + t.h; player.vy = 0; }
        }
    });

    if (player.invincible > 0) player.invincible -= 0.016;
    if (player.y > canvas.height + 50) {
        // Don't kill player in boss fight, just reset position
        player.x = TILE * 2;
        player.y = canvas.height - TILE * 2 - player.h;
        player.vx = 0;
        player.vy = 0;
        player.invincible = 2;
        playSound('hit');
    }

    updateHUD();
}

function drawBoss() {
    if (!boss) return;
    const b = boss;
    const bx = b.x, by = b.y;

    if (!b.alive) {
        // Explosion effect
        return;
    }

    const hurt = b.hurtTimer > 0;
    const pulse = Math.sin(gameTime * 6) * 0.1;
    const shake = hurt ? (Math.random() - 0.5) * 6 : 0;

    ctx.save();
    ctx.translate(bx + b.w / 2 + shake, by + b.h / 2);

    // Evil aura
    const auraGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 60 + pulse * 20);
    auraGrad.addColorStop(0, 'rgba(180, 0, 40, 0.4)');
    auraGrad.addColorStop(1, 'rgba(180, 0, 40, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = hurt ? '#ff4444' : '#3a0a20';
    ctx.beginPath();
    ctx.arc(0, 5, 35, 0, Math.PI * 2);
    ctx.fill();

    // Shell/armor on back
    ctx.fillStyle = '#1a4a1a';
    ctx.beginPath();
    ctx.arc(0, 10, 30, 0.3, Math.PI - 0.3);
    ctx.fill();
    // Shell spikes
    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < 5; i++) {
        const angle = 0.5 + i * 0.45;
        const sx = Math.cos(angle) * 28;
        const sy = Math.sin(angle) * 28 + 10;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * 12, sy + Math.sin(angle) * 12);
        ctx.lineTo(sx + 5, sy);
        ctx.fill();
    }

    // Horns
    ctx.fillStyle = '#daa520';
    ctx.beginPath();
    ctx.moveTo(-20, -25);
    ctx.lineTo(-30, -50 + Math.sin(gameTime * 4) * 3);
    ctx.lineTo(-12, -28);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, -25);
    ctx.lineTo(30, -50 + Math.sin(gameTime * 4 + 1) * 3);
    ctx.lineTo(12, -28);
    ctx.fill();

    // Face
    ctx.fillStyle = '#5a2a10';
    ctx.beginPath();
    ctx.arc(0, -10, 22, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - big and scary
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(-10, -15, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, -15, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Pupils
    ctx.fillStyle = '#000';
    const lookX = player.x > b.x ? 2 : -2;
    ctx.beginPath();
    ctx.arc(-9 + lookX, -15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11 + lookX, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    ctx.fillStyle = '#2a0a00';
    ctx.save();
    ctx.translate(-10, -22);
    ctx.rotate(-0.5);
    ctx.fillRect(-2, 0, 14, 4);
    ctx.restore();
    ctx.save();
    ctx.translate(4, -26);
    ctx.rotate(0.5);
    ctx.fillRect(-2, 0, 14, 4);
    ctx.restore();

    // Big mouth with fangs
    ctx.fillStyle = '#1a0000';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0.2, Math.PI - 0.2);
    ctx.fill();
    // Top fangs
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-10, -2); ctx.lineTo(-7, 8); ctx.lineTo(-4, -2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -2); ctx.lineTo(7, 8); ctx.lineTo(10, -2);
    ctx.fill();
    // Bottom fangs
    ctx.beginPath();
    ctx.moveTo(-6, 12); ctx.lineTo(-3, 5); ctx.lineTo(0, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 12); ctx.lineTo(3, 5); ctx.lineTo(6, 12);
    ctx.fill();

    // Fire breath when charging
    if (b.isCharging) {
        const fireDir = b.vx > 0 ? 1 : -1;
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = `rgba(255, ${100 + i * 30}, 0, ${0.6 - i * 0.1})`;
            ctx.beginPath();
            ctx.arc(fireDir * (30 + i * 12), 0 + Math.sin(gameTime * 20 + i) * 5, 8 - i, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Arms with claws
    ctx.fillStyle = '#5a2a10';
    ctx.fillRect(-42, -5, 12, 20);
    ctx.fillRect(30, -5, 12, 20);
    ctx.fillStyle = '#daa520';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(-44 + i * 4, 13, 3, 8);
        ctx.fillRect(32 + i * 4, 13, 3, 8);
    }

    // HP bar
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-40, -60, 80, 10);
    ctx.fillStyle = b.hp > 2 ? '#00cc00' : b.hp > 1 ? '#ffaa00' : '#ff0000';
    ctx.fillRect(-40, -60, 80 * (b.hp / b.maxHp), 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-40, -60, 80, 10);

    ctx.restore();

    // Evil particles
    if (Math.random() < 0.1) {
        particles.push({
            x: b.x + b.w / 2 + (Math.random() - 0.5) * 60,
            y: b.y + 20,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#ff0040' : '#ff8800',
            life: 0.8,
        });
    }
}

function drawPrincessCage() {
    if (!princessCage) return;
    const c = princessCage;

    // Cage background
    ctx.fillStyle = 'rgba(50,50,50,0.5)';
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Princess inside
    const px = c.x + c.w / 2;
    const py = c.y + c.h - 20;
    const sway = Math.sin(gameTime * 2) * 2;

    // Dress
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.moveTo(px - 15, py - 20);
    ctx.lineTo(px - 20, py + 20);
    ctx.lineTo(px + 20, py + 20);
    ctx.lineTo(px + 15, py - 20);
    ctx.fill();
    // Dress detail
    ctx.fillStyle = '#ff1493';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#ffb894';
    ctx.beginPath();
    ctx.arc(px, py - 30 + sway, 12, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(px, py - 35 + sway, 14, -Math.PI, 0);
    ctx.fill();
    ctx.fillRect(px - 14, py - 35 + sway, 4, 25);
    ctx.fillRect(px + 10, py - 35 + sway, 4, 25);

    // Crown on princess
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(px - 8, py - 44 + sway);
    ctx.lineTo(px - 8, py - 50 + sway);
    ctx.lineTo(px - 3, py - 46 + sway);
    ctx.lineTo(px, py - 52 + sway);
    ctx.lineTo(px + 3, py - 46 + sway);
    ctx.lineTo(px + 8, py - 50 + sway);
    ctx.lineTo(px + 8, py - 44 + sway);
    ctx.fill();
    // Gem
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(px, py - 47 + sway, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.arc(px - 4, py - 32 + sway, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 4, py - 32 + sway, 2, 0, Math.PI * 2);
    ctx.fill();

    // Sad mouth (if not freed) or happy
    if (!c.freed) {
        ctx.strokeStyle = '#cc3366';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py - 22 + sway, 4, Math.PI + 0.3, -0.3);
        ctx.stroke();

        // Tear
        ctx.fillStyle = 'rgba(100, 180, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(px + 7, py - 28 + sway + Math.abs(Math.sin(gameTime * 2)) * 5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Help text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Cairo';
        ctx.textAlign = 'center';
        ctx.fillText('أنقذني!', px, c.y - 10 + Math.sin(gameTime * 3) * 3);
    } else {
        // Happy!
        ctx.strokeStyle = '#cc3366';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py - 24 + sway, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();

        // Hearts floating
        ctx.fillStyle = '#ff69b4';
        ctx.font = '16px Arial';
        for (let i = 0; i < 3; i++) {
            const hx = px + Math.sin(gameTime * 2 + i * 2) * 20;
            const hy = c.y - 15 - i * 15 - (gameTime % 3) * 10;
            ctx.globalAlpha = 0.8 - i * 0.2;
            ctx.fillText('❤️', hx, hy);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Cairo';
        ctx.fillText('شكراً ماريو!', px, c.y - 15 + Math.sin(gameTime * 3) * 3);
    }

    // Cage bars (draw on top)
    if (!c.freed) {
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(c.x + 8 + i * 14, c.y);
            ctx.lineTo(c.x + 8 + i * 14, c.y + c.h);
            ctx.stroke();
        }
        // Horizontal bars
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + 20);
        ctx.lineTo(c.x + c.w, c.y + 20);
        ctx.moveTo(c.x, c.y + c.h - 20);
        ctx.lineTo(c.x + c.w, c.y + c.h - 20);
        ctx.stroke();
        // Lock
        ctx.fillStyle = '#8B8000';
        ctx.fillRect(c.x + c.w / 2 - 8, c.y + c.h / 2 - 6, 16, 14);
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 6, 8, Math.PI, 0);
        ctx.strokeStyle = '#8B8000';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Keyhole
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(c.x + c.w / 2 - 1, c.y + c.h / 2 + 2, 3, 5);
    } else {
        // Broken cage bars
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const bendX = Math.sin(i * 1.5) * 15;
            ctx.moveTo(c.x + 8 + i * 14, c.y);
            ctx.quadraticCurveTo(c.x + 8 + i * 14 + bendX, c.y + c.h / 2, c.x + 8 + i * 14 + bendX * 2, c.y + c.h);
            ctx.stroke();
        }
    }
}

function drawBossArenaBackground() {
    // Dark castle background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0a0008');
    grad.addColorStop(0.4, '#1a0020');
    grad.addColorStop(0.7, '#2a0a30');
    grad.addColorStop(1, '#1a0020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lava glow at bottom
    const lavaGrad = ctx.createLinearGradient(0, canvas.height - TILE * 3, 0, canvas.height);
    lavaGrad.addColorStop(0, 'rgba(255, 50, 0, 0)');
    lavaGrad.addColorStop(1, 'rgba(255, 50, 0, 0.15)');
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, canvas.height - TILE * 3, canvas.width, TILE * 3);

    // Castle wall bricks in background
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#444';
    for (let r = 0; r < Math.ceil(canvas.height / 40); r++) {
        for (let c = 0; c < Math.ceil(canvas.width / 60); c++) {
            const offset = r % 2 === 0 ? 0 : 30;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * 60 + offset, r * 30, 60, 30);
        }
    }
    ctx.globalAlpha = 1;

    // Torches
    for (let i = 0; i < 4; i++) {
        const tx = TILE * 2 + i * (canvas.width - TILE * 4) / 3;
        const ty = canvas.height - TILE * 6;
        // Torch base
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(tx - 4, ty, 8, 30);
        // Flame
        const flicker = Math.sin(gameTime * 8 + i * 2) * 3;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(tx, ty - 5 + flicker, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(tx, ty - 8 + flicker, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(tx, ty - 10 + flicker, 2, 0, Math.PI * 2);
        ctx.fill();
        // Light glow
        const glowGrad = ctx.createRadialGradient(tx, ty - 5, 5, tx, ty - 5, 60);
        glowGrad.addColorStop(0, 'rgba(255, 150, 50, 0.15)');
        glowGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(tx, ty - 5, 60, 0, Math.PI * 2);
        ctx.fill();
    }

    // "BOSS" text
    ctx.fillStyle = 'rgba(255, 0, 50, 0.3)';
    ctx.font = 'bold 80px Cairo';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ البوس ⚔️', canvas.width / 2, 80);
}

function renderBoss() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBossArenaBackground();
    tiles.forEach(drawTile);
    drawPrincessCage();
    drawBoss();
    drawPlayer();
    drawParticles();
    drawFloatingTexts();

    // Vignette
    const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.85
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRescueScene() {
    const rc = document.getElementById('rescue-canvas');
    if (!rc) return;
    rc.width = rc.parentElement.clientWidth;
    rc.height = rc.parentElement.clientHeight;
    const rctx = rc.getContext('2d');
    const w = rc.width, h = rc.height;

    // Castle background
    const grad = rctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ff9966');
    grad.addColorStop(0.5, '#ff6699');
    grad.addColorStop(1, '#cc66ff');
    rctx.fillStyle = grad;
    rctx.fillRect(0, 0, w, h);

    // Ground
    rctx.fillStyle = '#4a8f3f';
    rctx.fillRect(0, h - 80, w, 80);
    rctx.fillStyle = '#8B4513';
    rctx.fillRect(0, h - 60, w, 60);

    // Broken cage
    rctx.strokeStyle = '#888';
    rctx.lineWidth = 3;
    const cx = w / 2 + 20;
    for (let i = 0; i < 5; i++) {
        rctx.beginPath();
        rctx.moveTo(cx - 30 + i * 15, h - 150);
        rctx.lineTo(cx - 30 + i * 15 + (i - 2) * 10, h - 80);
        rctx.stroke();
    }

    // Hearts everywhere
    rctx.font = '24px Arial';
    for (let i = 0; i < 8; i++) {
        const hx = w * 0.2 + i * w * 0.08;
        const hy = h * 0.2 + Math.sin(i * 1.5) * 50;
        rctx.fillText('❤️', hx, hy);
    }

    // "Thank you" text
    rctx.fillStyle = '#fff';
    rctx.font = 'bold 20px Cairo';
    rctx.textAlign = 'center';
    rctx.fillText('الأميرة حرة! شكراً يا بطل!', w / 2, h * 0.15);
}

// ---- Render ----
function render() {
    const level = LEVELS[currentLevel];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSky(level);
    drawHills(level);
    drawClouds(level);

    // Draw background grass decoration
    drawBackgroundGrass(level);

    // Draw tiles
    tiles.forEach(drawTile);

    // Draw bounce pads
    bouncePads.forEach(drawBouncePad);

    // Draw coins
    coinObjects.forEach(drawCoin);

    // Draw enemies
    enemies.forEach(drawEnemy);

    // Draw flag
    drawFlag();

    // Draw trail
    drawPlayerTrail();

    // Draw landing effect
    drawLandingEffect();

    // Draw wall slide effect
    drawWallSlideEffect();

    // Draw player
    drawPlayer();

    // Particles & floating text
    drawParticles();
    drawFloatingTexts();

    // Vignette effect for quality
    const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.4,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.9
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ---- Mario Face Drawing ----
function drawMarioFace() {
    const fc = mfCtx;
    const w = 80, h = 80;
    fc.clearRect(0, 0, w, h);

    marioBlinkTimer += 0.016;
    if (marioLaughTimer > 0) marioLaughTimer -= 0.016;

    const isBlinking = Math.sin(marioBlinkTimer * 2) > 0.97;
    const isLaughing = marioLaughTimer > 0;
    const bounce = Math.sin(gameTime * 3) * 2;

    // Face circle (skin)
    fc.fillStyle = '#ffb894';
    fc.beginPath();
    fc.arc(40, 42 + bounce, 30, 0, Math.PI * 2);
    fc.fill();

    // Hat
    fc.fillStyle = '#e52521';
    fc.beginPath();
    fc.ellipse(40, 20 + bounce, 32, 16, 0, 0, Math.PI * 2);
    fc.fill();
    fc.fillRect(12, 20 + bounce, 56, 10);
    // Hat brim
    fc.fillStyle = '#c41e1a';
    fc.fillRect(6, 28 + bounce, 68, 6);
    // M logo on hat
    fc.fillStyle = '#fff';
    fc.beginPath();
    fc.arc(40, 22 + bounce, 10, 0, Math.PI * 2);
    fc.fill();
    fc.fillStyle = '#e52521';
    fc.font = 'bold 14px Arial';
    fc.textAlign = 'center';
    fc.fillText('M', 40, 27 + bounce);

    // Eyes
    if (isBlinking) {
        fc.fillStyle = '#000';
        fc.fillRect(28, 40 + bounce, 10, 2);
        fc.fillRect(44, 40 + bounce, 10, 2);
    } else {
        // Eye whites
        fc.fillStyle = '#fff';
        fc.beginPath();
        fc.ellipse(33, 40 + bounce, 7, 8, 0, 0, Math.PI * 2);
        fc.fill();
        fc.beginPath();
        fc.ellipse(49, 40 + bounce, 7, 8, 0, 0, Math.PI * 2);
        fc.fill();
        // Pupils
        fc.fillStyle = '#2050a0';
        fc.beginPath();
        fc.arc(34, 41 + bounce, 4, 0, Math.PI * 2);
        fc.fill();
        fc.beginPath();
        fc.arc(50, 41 + bounce, 4, 0, Math.PI * 2);
        fc.fill();
        // Pupil dots
        fc.fillStyle = '#000';
        fc.beginPath();
        fc.arc(35, 41 + bounce, 2.5, 0, Math.PI * 2);
        fc.fill();
        fc.beginPath();
        fc.arc(51, 41 + bounce, 2.5, 0, Math.PI * 2);
        fc.fill();
        // Eye shine
        fc.fillStyle = '#fff';
        fc.beginPath();
        fc.arc(32, 38 + bounce, 1.5, 0, Math.PI * 2);
        fc.fill();
        fc.beginPath();
        fc.arc(48, 38 + bounce, 1.5, 0, Math.PI * 2);
        fc.fill();
    }

    // Big round nose
    fc.fillStyle = '#e8956a';
    fc.beginPath();
    fc.arc(40, 48 + bounce, 7, 0, Math.PI * 2);
    fc.fill();
    // Nose highlight
    fc.fillStyle = 'rgba(255,255,255,0.3)';
    fc.beginPath();
    fc.arc(38, 46 + bounce, 3, 0, Math.PI * 2);
    fc.fill();

    // Mustache
    fc.fillStyle = '#4a2a0a';
    fc.beginPath();
    fc.moveTo(22, 54 + bounce);
    fc.quadraticCurveTo(30, 60 + bounce, 40, 55 + bounce);
    fc.quadraticCurveTo(50, 60 + bounce, 58, 54 + bounce);
    fc.quadraticCurveTo(50, 56 + bounce, 40, 57 + bounce);
    fc.quadraticCurveTo(30, 56 + bounce, 22, 54 + bounce);
    fc.fill();

    // Mouth
    if (isLaughing) {
        // Big laughing mouth
        fc.fillStyle = '#8b1a1a';
        fc.beginPath();
        fc.arc(40, 60 + bounce, 10, 0, Math.PI);
        fc.fill();
        // Tongue
        fc.fillStyle = '#ff6b6b';
        fc.beginPath();
        fc.arc(40, 64 + bounce, 5, 0, Math.PI);
        fc.fill();
        // Cheeks
        fc.fillStyle = 'rgba(255, 100, 100, 0.4)';
        fc.beginPath();
        fc.arc(20, 50 + bounce, 6, 0, Math.PI * 2);
        fc.fill();
        fc.beginPath();
        fc.arc(60, 50 + bounce, 6, 0, Math.PI * 2);
        fc.fill();

        const el = document.getElementById('mario-face');
        el.classList.add('laugh');
    } else {
        // Normal smile
        fc.strokeStyle = '#8b1a1a';
        fc.lineWidth = 2;
        fc.beginPath();
        fc.arc(40, 58 + bounce, 8, 0.15, Math.PI - 0.15);
        fc.stroke();

        const el = document.getElementById('mario-face');
        el.classList.remove('laugh');
    }

    // Ears
    fc.fillStyle = '#ffb894';
    fc.beginPath();
    fc.arc(12, 42 + bounce, 6, 0, Math.PI * 2);
    fc.fill();
    fc.beginPath();
    fc.arc(68, 42 + bounce, 6, 0, Math.PI * 2);
    fc.fill();
}

function triggerMarioLaugh() {
    marioLaughTimer = 1.5;
}

// ---- Draw Mario Hero with Crown (Start Screen) ----
function drawMarioHero() {
    const heroCanvas = document.getElementById('mario-hero');
    if (!heroCanvas) return;
    const hc = heroCanvas.getContext('2d');
    const w = 90, h = 130;
    hc.clearRect(0, 0, w, h);

    const t = gameTime;
    const armWave = Math.sin(t * 3) * 0.2;
    
    hc.save();
    hc.translate(45, 68);
    hc.scale(0.62, 0.62);

    // ---- Crown (raised in right hand) ----
    const crownX = 30 + Math.sin(t * 2) * 3;
    const crownY = -75 + Math.sin(t * 3) * 4;
    // Crown glow
    hc.fillStyle = 'rgba(255, 215, 0, 0.3)';
    hc.beginPath();
    hc.arc(crownX, crownY, 25, 0, Math.PI * 2);
    hc.fill();
    // Crown body
    hc.fillStyle = '#ffd700';
    hc.beginPath();
    hc.moveTo(crownX - 18, crownY + 10);
    hc.lineTo(crownX - 18, crownY - 5);
    hc.lineTo(crownX - 12, crownY + 2);
    hc.lineTo(crownX - 6, crownY - 12);
    hc.lineTo(crownX, crownY + 0);
    hc.lineTo(crownX + 6, crownY - 12);
    hc.lineTo(crownX + 12, crownY + 2);
    hc.lineTo(crownX + 18, crownY - 5);
    hc.lineTo(crownX + 18, crownY + 10);
    hc.closePath();
    hc.fill();
    hc.strokeStyle = '#c49a00';
    hc.lineWidth = 1.5;
    hc.stroke();
    // Crown base
    hc.fillStyle = '#e8b800';
    hc.fillRect(crownX - 18, crownY + 6, 36, 6);
    // Crown gems
    hc.fillStyle = '#ff0040';
    hc.beginPath();
    hc.arc(crownX, crownY, 3, 0, Math.PI * 2);
    hc.fill();
    hc.fillStyle = '#00ccff';
    hc.beginPath();
    hc.arc(crownX - 10, crownY + 2, 2.5, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.arc(crownX + 10, crownY + 2, 2.5, 0, Math.PI * 2);
    hc.fill();
    // Crown sparkles
    hc.fillStyle = '#fff';
    const sparkle = Math.sin(t * 6) * 0.5 + 0.5;
    hc.globalAlpha = sparkle;
    hc.fillRect(crownX - 5, crownY - 15, 2, 6);
    hc.fillRect(crownX + 8, crownY - 10, 2, 5);
    hc.fillRect(crownX - 14, crownY - 8, 2, 4);
    hc.globalAlpha = 1;

    // ---- Right arm holding crown up ----
    hc.strokeStyle = '#ffb894';
    hc.lineWidth = 8;
    hc.lineCap = 'round';
    hc.beginPath();
    hc.moveTo(22, -15);
    hc.quadraticCurveTo(35, -40, crownX, crownY + 15);
    hc.stroke();
    // Hand
    hc.fillStyle = '#fff';
    hc.beginPath();
    hc.arc(crownX, crownY + 14, 6, 0, Math.PI * 2);
    hc.fill();

    // ---- Body ----
    // Shoes
    hc.fillStyle = '#5a2d0c';
    hc.beginPath();
    hc.ellipse(-15, 80, 14, 7, -0.1, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.ellipse(15, 80, 14, 7, 0.1, 0, Math.PI * 2);
    hc.fill();

    // Legs (blue)
    hc.fillStyle = '#2070e0';
    hc.fillRect(-22, 45, 18, 35);
    hc.fillRect(4, 45, 18, 35);

    // Body/Overalls
    hc.fillStyle = '#e52521';
    hc.beginPath();
    hc.roundRect(-28, -5, 56, 55, 6);
    hc.fill();

    // Overall straps
    hc.fillStyle = '#2070e0';
    hc.fillRect(-20, 10, 14, 40);
    hc.fillRect(6, 10, 14, 40);
    // Buttons
    hc.fillStyle = '#ffd700';
    hc.beginPath();
    hc.arc(-13, 18, 3, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.arc(13, 18, 3, 0, Math.PI * 2);
    hc.fill();

    // Left arm (relaxed)
    hc.strokeStyle = '#ffb894';
    hc.lineWidth = 8;
    hc.beginPath();
    hc.moveTo(-22, -10);
    hc.quadraticCurveTo(-38, 10 + armWave * 10, -35, 30);
    hc.stroke();
    // Left hand
    hc.fillStyle = '#fff';
    hc.beginPath();
    hc.arc(-35, 30, 6, 0, Math.PI * 2);
    hc.fill();

    // Head
    hc.fillStyle = '#ffb894';
    hc.beginPath();
    hc.arc(0, -30, 28, 0, Math.PI * 2);
    hc.fill();

    // Hat
    hc.fillStyle = '#e52521';
    hc.beginPath();
    hc.ellipse(0, -52, 30, 14, 0, 0, Math.PI * 2);
    hc.fill();
    hc.fillRect(-32, -50, 64, 12);
    // Hat brim
    hc.fillStyle = '#c41e1a';
    hc.fillRect(-35, -40, 70, 6);
    // M logo
    hc.fillStyle = '#fff';
    hc.beginPath();
    hc.arc(0, -54, 10, 0, Math.PI * 2);
    hc.fill();
    hc.fillStyle = '#e52521';
    hc.font = 'bold 14px Arial';
    hc.textAlign = 'center';
    hc.fillText('M', 0, -50);

    // Eyes
    hc.fillStyle = '#fff';
    hc.beginPath();
    hc.ellipse(-10, -32, 7, 9, 0, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.ellipse(10, -32, 7, 9, 0, 0, Math.PI * 2);
    hc.fill();
    // Pupils (looking up at crown)
    hc.fillStyle = '#2050a0';
    hc.beginPath();
    hc.arc(-9, -35, 4, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.arc(11, -35, 4, 0, Math.PI * 2);
    hc.fill();
    hc.fillStyle = '#000';
    hc.beginPath();
    hc.arc(-8, -36, 2.5, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.arc(12, -36, 2.5, 0, Math.PI * 2);
    hc.fill();
    // Eye shine
    hc.fillStyle = '#fff';
    hc.beginPath();
    hc.arc(-11, -37, 1.5, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.arc(9, -37, 1.5, 0, Math.PI * 2);
    hc.fill();

    // Big nose
    hc.fillStyle = '#e8956a';
    hc.beginPath();
    hc.arc(0, -22, 8, 0, Math.PI * 2);
    hc.fill();

    // Mustache
    hc.fillStyle = '#4a2a0a';
    hc.beginPath();
    hc.moveTo(-22, -16);
    hc.quadraticCurveTo(-10, -8, 0, -14);
    hc.quadraticCurveTo(10, -8, 22, -16);
    hc.quadraticCurveTo(10, -12, 0, -16);
    hc.quadraticCurveTo(-10, -12, -22, -16);
    hc.fill();

    // Happy smile
    hc.strokeStyle = '#8b1a1a';
    hc.lineWidth = 2.5;
    hc.beginPath();
    hc.arc(0, -12, 10, 0.2, Math.PI - 0.2);
    hc.stroke();

    // Cheeks
    hc.fillStyle = 'rgba(255, 100, 100, 0.35)';
    hc.beginPath();
    hc.arc(-20, -20, 7, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.arc(20, -20, 7, 0, Math.PI * 2);
    hc.fill();

    // Ears
    hc.fillStyle = '#ffb894';
    hc.beginPath();
    hc.arc(-26, -28, 6, 0, Math.PI * 2);
    hc.fill();
    hc.beginPath();
    hc.arc(26, -28, 6, 0, Math.PI * 2);
    hc.fill();

    hc.restore();
}

// ---- Game Loop ----
function gameLoop() {
    if (gameState === 'playing') {
        update();
        render();
    } else if (gameState === 'boss') {
        updateBoss();
        renderBoss();
    }
    drawMarioFace();
    if (gameState === 'menu') {
        drawMarioHero();
    }
    requestAnimationFrame(gameLoop);
}

// ---- Menu Functions ----
function startGame() {
    initAudio();
    gameState = 'playing';
    score = 0;
    coins = 0;
    lives = 3;
    currentLevel = 0;
    loadLevel(0);
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('win-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    updateHUD();
}

function restartGame() {
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('win-screen').style.display = 'none';
    startGame();
}

function showControls() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('controls-screen').style.display = 'flex';
}

function hideControls() {
    document.getElementById('controls-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
}

// ---- Start ----
gameLoop();
