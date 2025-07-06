const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Images
const images = {};
const imageSources = {
    player: 'images/player.svg',
    enemy: 'images/enemy.svg',
    bullet: 'images/bullet.svg',
    bg: 'images/castle_bg.svg', // Changed background image
    shooterEnemy: 'images/shooter_enemy.svg',
    leafEnemy: 'images/leaf_enemy.svg',
    enemyBullet: 'images/enemy_bullet.svg',
    irregularEnemy: 'images/irregular_enemy.svg',
    randomShooter: 'images/spinning_shooter_enemy.svg',
    boss: 'images/boss.svg',
    chargingEnemy: 'images/charging_enemy.svg',
    redOrb: 'images/red_orb.svg',
    blueOrb: 'images/blue_orb.svg',
    greenOrb: 'images/green_orb.svg'
};

let imagesLoadedCount = 0;
const totalImages = Object.keys(imageSources).length;

function loadImage(name, src) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        images[name] = img;
        imagesLoadedCount++;
        if (imagesLoadedCount === totalImages) {
            // All images loaded, start the game loop
            gameLoop();
        }
    };
    img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
    };
}

// Load all images
for (const name in imageSources) {
    loadImage(name, imageSources[name]);
}

// Player
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100, // Adjusted player Y position
    width: 50,
    height: 50,
    speed: 4,
    health: 3, // Initial player health
    power: 1, // Initial player power
    shieldHealth: 0 // Shield health, 0 means no shield
};

// Bullets
const bullets = [];
const bullet = {
    width: 5,
    height: 10,
    speed: 6
};

// Enemies
const enemies = [];
const enemy = {
    width: 50,
    height: 50,
    speed: 2,
    health: 1 // Initial health for regular enemies
};
const enemyBullets = [];
const enemyBullet = {
    width: 5,
    height: 10,
    speed: 3
};

let enemySpawnInterval = 1500; // milliseconds
let enemySpawnIntervalId;

// Boss
let boss = null;
const bossConfig = {
    width: 100,
    height: 100,
    speed: 1,
    health: 10,
    shootInterval: 1000 // 1 second
};
const bossSpawnTimeRequired = 30000; // 30 seconds for boss to appear

// Power-ups
const powerUps = [];
const powerUpConfig = {
    width: 30,
    height: 30,
    speed: 1,
    dropChance: 0.8 // 80% chance to drop a power-up
};

// Initial game parameters (for resetting)
const initialPlayerSpeed = player.speed;
const initialBulletSpeed = bullet.speed;
const initialEnemySpeed = enemy.speed;
const initialEnemyBulletSpeed = enemyBullet.speed;
const initialEnemySpawnInterval = enemySpawnInterval;
const initialBossHealth = bossConfig.health;
const initialBossShootInterval = bossConfig.shootInterval;
const initialEnemyHealth = enemy.health; // Store initial health for regular enemies
const initialPlayerHealth = player.health; // Store initial player health
const initialPlayerPower = player.power; // Store initial player power

// Explosions
const explosions = [];

// Game state
let score = 0;
let gameOver = false;
let gameStarted = false;
let bgScrollY = 0;
let gameStartTime = 0;
let currentLevel = 1;
let displayLevelMessage = false;
let levelMessageTimer = 0;
const levelMessageDuration = 5000; // 5 seconds
let gameClear = false; // New flag for game clear state

let isWaitingForReset = false; // New flag to control reset delay
const resetScreenDuration = 5000; // 5 seconds for game over/clear screen

let enemiesDefeatedInLevel = 0; // New: Count of enemies defeated in current level

let touchActive = false; // For touch movement
let touchCurrentX = 0; // For touch movement

// Event listeners
let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

// Get control buttons (still need start button)
const startButton = document.getElementById('startButton');

// Start button event listener
startButton.addEventListener('click', () => {
    if (!gameStarted && !isWaitingForReset) { // Only start if not already started or waiting
        startGame();
    }
});

// Canvas touch events for movement and shooting
canvas.addEventListener('touchstart', (e) => {
    if (gameStarted && !gameOver) {
        e.preventDefault();
        touchActive = true;
        touchCurrentX = e.touches[0].clientX;
        shoot(); // Shoot on touch
    } else if (!gameStarted || gameOver) { // Handle start/reset on touch
        if (e.touches.length === 1 && !isWaitingForReset) { // Single tap to start/reset
            if (!gameStarted) {
                startGame();
            } else if (gameOver) {
                resetGame();
            }
        }
    }
}, false);

canvas.addEventListener('touchmove', (e) => {
    if (gameStarted && !gameOver && touchActive) {
        e.preventDefault();
        touchCurrentX = e.touches[0].clientX;
    }
}, false);

canvas.addEventListener('touchend', (e) => {
    touchActive = false;
}, false);

function keyDownHandler(e) {
    if (e.key == 'Right' || e.key == 'ArrowRight') {
        rightPressed = true;
    } else if (e.key == 'Left' || e.key == 'ArrowLeft') {
        leftPressed = true;
    }
    if (e.key == ' ' || e.key == 'Spacebar') { // Spacebar for start/reset only
        if (e.repeat) { return; }
        if (!gameStarted) {
            startGame();
        } else if (gameOver) {
            if (isWaitingForReset) {
                return;
            }
            resetGame();
        }
    }
}

function keyUpHandler(e) {
    if (e.key == 'Right' || e.key == 'ArrowRight') {
        rightPressed = false;
    }
    else if (e.key == 'Left' || e.key == 'ArrowLeft') {
        leftPressed = false;
    }
}

function startGame() {
    gameStarted = true;
    gameOver = false;
    score = 0;
    bullets.length = 0;
    enemies.length = 0;
    enemyBullets.length = 0;
    explosions.length = 0;
    powerUps.length = 0; // Clear power-ups
    player.x = canvas.width / 2 - player.width / 2; // Centered horizontally
    player.y = canvas.height - player.height - 50; // Adjusted player Y position
    boss = null; // Reset boss
    currentLevel = 1;
    displayLevelMessage = false;
    gameClear = false; // Reset game clear flag
    isWaitingForReset = false; // Ensure not waiting at start
    enemiesDefeatedInLevel = 0; // Reset enemies defeated count

    // Reset game parameters to initial values
    player.speed = initialPlayerSpeed;
    player.health = initialPlayerHealth; // Reset player health
    player.power = initialPlayerPower; // Reset player power
    player.shieldHealth = 0; // Reset shield health
    bullet.speed = initialBulletSpeed;
    enemy.speed = initialEnemySpeed;
    enemyBullet.speed = initialEnemyBulletSpeed;
    enemySpawnInterval = initialEnemySpawnInterval;
    bossConfig.health = initialBossHealth;
    bossConfig.shootInterval = initialBossShootInterval;
    enemy.health = initialEnemyHealth; // Reset regular enemy health

    gameStartTime = Date.now(); // Start time for current level

    enemySpawnIntervalId = setInterval(spawnEnemy, enemySpawnInterval);

    // Hide start button
    startButton.style.display = 'none';
}

function resetGame() {
    gameStarted = false;
    gameOver = false;
    score = 0;
    bullets.length = 0;
    enemies.length = 0;
    enemyBullets.length = 0;
    explosions.length = 0;
    powerUps.length = 0; // Clear power-ups
    player.x = canvas.width / 2 - player.width / 2; // Centered horizontally
    player.y = canvas.height - player.height - 50; // Adjusted player Y position
    boss = null; // Reset boss
    currentLevel = 1;
    displayLevelMessage = false;
    gameClear = false; // Reset game clear flag
    isWaitingForReset = false; // Ensure not waiting after reset
    enemiesDefeatedInLevel = 0; // Reset enemies defeated count

    // Reset game parameters to initial values
    player.speed = initialPlayerSpeed;
    player.health = initialPlayerHealth; // Reset player health
    player.power = initialPlayerPower; // Reset player power
    player.shieldHealth = 0; // Reset shield health
    bullet.speed = initialBulletSpeed;
    enemy.speed = initialEnemySpeed;
    enemyBullet.speed = initialEnemyBulletSpeed;
    enemySpawnInterval = initialEnemySpawnInterval;
    bossConfig.health = initialBossHealth;
    bossConfig.shootInterval = initialBossShootInterval;
    enemy.health = initialEnemyHealth; // Reset regular enemy health

    if (enemySpawnIntervalId) {
        clearInterval(enemySpawnIntervalId);
    }
    // Show start button
    startButton.style.display = 'block';
    drawStartScreen();
}

function levelUp() {
    currentLevel++;
    displayLevelMessage = true;
    levelMessageTimer = Date.now();

    // Clear all existing enemies and enemy bullets
    enemies.length = 0;
    enemyBullets.length = 0;
    powerUps.length = 0; // Clear power-ups

    // Adjust difficulty for next level
    enemy.health += 1; // Increase regular enemy health by 1
    bossConfig.health += 5; // Increase boss health by 5

    if (currentLevel > 5) {
        // Game Clear!
        gameClear = true; // Set game clear flag
        gameOver = true; // Set game over flag
        gameStarted = false; // Stop game loop updates

        // Clear all entities
        enemies.length = 0;
        enemyBullets.length = 0;
        bullets.length = 0;
        explosions.length = 0;
        boss = null;
        powerUps.length = 0;

        if (enemySpawnIntervalId) {
            clearInterval(enemySpawnIntervalId);
        }

        // Set waitingForReset for game clear screen
        isWaitingForReset = true;
        setTimeout(() => {
            isWaitingForReset = false;
            resetGame(); // Call resetGame after the delay
        }, resetScreenDuration); // Use resetScreenDuration for game clear
        return; // Stop further levelUp processing
    }

    enemiesDefeatedInLevel = 0; // Reset enemies defeated count for new level
    gameStartTime = Date.now(); // Reset game start time for new level

    // Restart enemy spawning for the new level
    enemySpawnIntervalId = setInterval(spawnEnemy, enemySpawnInterval);

    // Hide level message after duration
    setTimeout(() => {
        displayLevelMessage = false;
    }, levelMessageDuration);
}

function shoot() {
    const bulletDamage = 1 * player.power; // Bullet damage scales with player power
    bullets.push({
        x: player.x + player.width / 2 - bullet.width / 2,
        y: player.y,
        width: bullet.width,
        height: bullet.height,
        speed: bullet.speed,
        type: 'player',
        damage: bulletDamage
    });
}

function spawnEnemy() {
    const x = Math.random() * (canvas.width - enemy.width);
    const y = -enemy.height;
    const enemyTypes = ['shooter', 'leaf', 'irregular', 'randomShooter'];
    // Add charging enemy from level 2
    if (currentLevel >= 2) {
        enemyTypes.push('charging');
    }
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    if (type === 'shooter') {
        enemies.push({
            x: x,
            y: y,
            width: enemy.width,
            height: enemy.height,
            speed: enemy.speed,
            type: 'shooter',
            shootInterval: 1000 + Math.random() * 1000, // 1-2 seconds
            lastShot: Date.now(),
            health: enemy.health // Assign health based on current level
        });
    } else if (type === 'leaf') {
        enemies.push({
            x: x,
            y: y,
            width: enemy.width,
            height: enemy.height,
            speed: enemy.speed,
            type: 'leaf',
            amplitude: 20 + Math.random() * 30, // 20-50 pixels
            frequency: 0.05 + Math.random() * 0.05, // 0.05-0.1
            initialX: x,
            health: enemy.health // Assign health based on current level
        });
    } else if (type === 'irregular') {
        enemies.push({
            x: x,
            y: y,
            width: enemy.width,
            height: enemy.height,
            speed: enemy.speed,
            type: 'irregular',
            xDirection: Math.random() < 0.5 ? 1 : -1, // 1 for right, -1 for left
            xSpeed: 0.5 + Math.random() * 1.5, // 0.5-2
            health: enemy.health // Assign health based on current level
        });
    } else if (type === 'randomShooter') {
        enemies.push({
            x: x,
            y: y,
            width: enemy.width,
            height: enemy.height,
            speed: enemy.speed,
            type: 'randomShooter',
            shootInterval: 1000 + Math.random() * 1000, // 1-2 seconds
            lastShot: Date.now(),
            angle: 0,
            bulletCount: 3, // Number of bullets to shoot in a burst
            health: enemy.health // Assign health based on current level
        });
    } else if (type === 'charging') {
        // Calculate direction towards player
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const angle = Math.atan2(targetY - y, targetX - x);
        const speed = enemy.speed * 1.5; // Faster speed for charging enemy
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;

        enemies.push({
            x: x,
            y: y,
            width: enemy.width,
            height: enemy.height,
            speed: speed,
            type: 'charging',
            health: enemy.health,
            dx: dx,
            dy: dy
        });
    } else { // Default enemy
        enemies.push({
            x: x,
            y: y,
            width: enemy.width,
            height: enemy.height,
            speed: enemy.speed,
            type: 'default',
            health: enemy.health // Assign health based on current level
        });
    }
}

function enemyShoot(enemy) {
    const bullet = {
        x: enemy.x + enemy.width / 2 - enemyBullet.width / 2,
        y: enemy.y + enemy.height,
        width: enemyBullet.width,
        height: enemyBullet.height,
        speed: enemyBullet.speed,
        dx: 0,
        dy: enemyBullet.speed
    };
    enemyBullets.push(bullet);
}

function randomEnemyShoot(enemy) {
    const spreadAngle = Math.PI * 50 / 180; // 50 degrees in radians
    const centerAngle = Math.PI / 2; // Straight down
    const minAngle = centerAngle - (spreadAngle / 2);
    const maxAngle = centerAngle + (spreadAngle / 2);

    for (let i = 0; i < enemy.bulletCount; i++) {
        const angle = minAngle + Math.random() * (maxAngle - minAngle); // Random angle within 50 degrees
        const dx = Math.cos(angle) * enemyBullet.speed;
        const dy = Math.sin(angle) * enemyBullet.speed;
        enemyBullets.push({
            x: enemy.x + enemy.width / 2 - enemyBullet.width / 2,
            y: enemy.y + enemy.height / 2 - enemyBullet.height / 2,
            width: enemyBullet.width,
            height: enemyBullet.height,
            speed: enemyBullet.speed,
            dx: dx,
            dy: dy
        });
    }
}

function bossShoot() {
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
    const dx = Math.cos(angle) * enemyBullet.speed;
    const dy = Math.sin(angle) * enemyBullet.speed;
    enemyBullets.push({
        x: boss.x + boss.width / 2 - enemyBullet.width / 2,
        y: boss.y + boss.height,
        width: enemyBullet.width,
        height: enemyBullet.height,
        speed: enemyBullet.speed,
        dx: dx,
        dy: dy
    });
}

function collision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function update() {
    if (gameOver || !gameStarted) return;

    // Spawn boss after bossSpawnTimeRequired and enemiesDefeatedInLevel >= 3
    if (boss === null && enemiesDefeatedInLevel >= 3 && Date.now() - gameStartTime >= bossSpawnTimeRequired) {
        // Stop regular enemy spawning when boss appears
        if (enemySpawnIntervalId) {
            clearInterval(enemySpawnIntervalId);
        }
        boss = {
            x: canvas.width / 2 - bossConfig.width / 2,
            y: -bossConfig.height,
            width: bossConfig.width,
            height: bossConfig.height,
            speed: bossConfig.speed,
            health: bossConfig.health,
            lastShot: Date.now(),
            level: currentLevel, // Pass current level to boss
            isExploding: false, // New property for explosion state
            explosionCount: 0,
            nextExplosionTime: 0
        };
    }

    // Move player
    if (rightPressed && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    if (leftPressed && player.x > 0) {
        player.x -= player.speed;
    }
    // Ensure player stays within bounds after any movement
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // Move bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }

    // Move enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].x += enemyBullets[i].dx;
        enemyBullets[i].y += enemyBullets[i].dy;

        if (enemyBullets[i].y > canvas.height || enemyBullets[i].x < -enemyBullets[i].width || enemyBullets[i].x > canvas.width) {
            enemyBullets.splice(i, 1);
        }
    }

    // Move power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].y += powerUpConfig.speed;
        if (powerUps[i].y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }

    // Move enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;

        if (enemies[i].type === 'leaf') {
            enemies[i].x = enemies[i].initialX + Math.sin(enemies[i].y * enemies[i].frequency) * enemies[i].amplitude;
        } else if (enemies[i].type === 'irregular') {
            enemies[i].x += enemies[i].xDirection * enemies[i].xSpeed;
            if (enemies[i].x < 0 || enemies[i].x > canvas.width - enemies[i].width) {
                enemies[i].xDirection *= -1; // Change direction
            }
        } else if (enemies[i].type === 'charging') {
            enemies[i].x += enemies[i].dx;
            enemies[i].y += enemies[i].dy;
        }

        if (enemies[i].type === 'shooter' && Date.now() - enemies[i].lastShot > enemies[i].shootInterval) {
            enemyShoot(enemies[i]);
            enemies[i].lastShot = Date.now();
        } else if (enemies[i].type === 'randomShooter' && Date.now() - enemies[i].lastShot > enemies[i].shootInterval) {
            randomEnemyShoot(enemies[i]);
            enemies[i].lastShot = Date.now();
        }

        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
        }
    }

    // Move boss
    if (boss !== null) {
        if (!boss.isExploding) { // Only move and shoot if not exploding
            // Boss movement based on level
            if (boss.level === 1) {
                if (boss.y < canvas.height / 3) {
                    boss.y += boss.speed;
                }
            } else if (boss.level === 2) {
                // Example: Boss moves left and right at the top of the screen
                boss.x = canvas.width / 2 + Math.sin(Date.now() / 500) * (canvas.width / 4);
                if (boss.y < canvas.height / 4) {
                    boss.y += boss.speed;
                }
            } else if (boss.level === 3) {
                // Example: Boss moves in a circular pattern
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 4;
                const radius = canvas.width / 6;
                boss.x = centerX + Math.cos(Date.now() / 700) * radius;
                boss.y = centerY + Math.sin(Date.now() / 700) * radius;
            } else if (boss.level === 4) {
                // Example: Boss moves towards player's X position
                if (boss.x < player.x) {
                    boss.x += boss.speed;
                } else if (boss.x > player.x) {
                    boss.x -= boss.speed;
                }
                if (boss.y < canvas.height / 5) {
                    boss.y += boss.speed;
                }
            } else if (boss.level === 5) {
                // Example: Boss moves erratically and shoots more frequently
                boss.x += (Math.random() - 0.5) * boss.speed * 2;
                boss.y += (Math.random() - 0.5) * boss.speed * 2;
                // Keep boss within bounds
                if (boss.x < 0) boss.x = 0;
                if (boss.x > canvas.width - boss.width) boss.x = canvas.width - boss.width;
                if (boss.y < 0) boss.y = 0;
                if (boss.y > canvas.height / 2) boss.y = canvas.height / 2;
            }

            // Boss shooting based on level
            let currentBossShootInterval = bossConfig.shootInterval;
            if (boss.level >= 2) {
                currentBossShootInterval = Math.max(200, bossConfig.shootInterval - (boss.level - 1) * 100); // Faster shooting for higher levels
            }

            if (Date.now() - boss.lastShot > currentBossShootInterval) {
                if (boss.level === 1 || boss.level === 2 || boss.level === 4) {
                    bossShoot(); // Single shot towards player
                } else if (boss.level === 3) {
                    // Triple shot
                    bossShoot();
                    setTimeout(() => bossShoot(), 100);
                    setTimeout(() => bossShoot(), 200);
                } else if (boss.level === 5) {
                    // Random spread shot
                    for (let i = 0; i < 5; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dx = Math.cos(angle) * enemyBullet.speed;
                        const dy = Math.sin(angle) * enemyBullet.speed;
                        enemyBullets.push({
                            x: boss.x + boss.width / 2 - enemyBullet.width / 2,
                            y: boss.y + boss.height / 2 - enemyBullet.height / 2,
                            width: enemyBullet.width,
                            height: enemyBullet.height,
                            speed: enemyBullet.speed,
                            dx: dx,
                            dy: dy
                        });
                    }
                }
                boss.lastShot = Date.now();
            }
        } else { // Boss is exploding
            const explosionInterval = 150; // milliseconds between explosions
            const totalExplosions = 5; // Total number of explosions

            if (boss.explosionCount < totalExplosions && Date.now() - boss.nextExplosionTime > explosionInterval) {
                createExplosion(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height);
                boss.explosionCount++;
                boss.nextExplosionTime = Date.now();
            }

            if (boss.explosionCount >= totalExplosions && Date.now() - boss.nextExplosionTime > explosionInterval * 2) { // Wait a bit after last explosion
                boss = null; // Boss fully destroyed
                score += 100; // Bonus score for defeating boss
                levelUp(); // Call levelUp function
            }
        }
    }

    // Collision detection
    for (let i = enemies.length - 1; i >= 0; i--) {
        // Player-enemy collision
        if (collision(player, enemies[i])) {
            if (player.shieldHealth <= 0) { // Only take damage if no shield
                player.health--; // Decrement player health
            } else {
                player.shieldHealth--; // Decrement shield health
            }
            createExplosion(player.x, player.y);
            enemies.splice(i, 1); // Remove enemy
            if (player.health <= 0) {
                gameOver = true;
                if (!isWaitingForReset) {
                    isWaitingForReset = true;
                    setTimeout(() => {
                        isWaitingForReset = false;
                        resetGame(); // Auto-reset after game over screen
                    }, resetScreenDuration);
                }
            }
        }

        // Bullet-enemy collision
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (collision(bullets[j], enemies[i])) {
                enemies[i].health -= bullets[j].damage; // Decrement enemy health by bullet damage
                bullets.splice(j, 1); // Remove bullet
                if (enemies[i].health <= 0) { // Check if enemy is defeated
                    createExplosion(enemies[i].x, enemies[i].y);
                    enemies.splice(i, 1); // Remove enemy
                    score += 10;
                    enemiesDefeatedInLevel++; // Increment defeated enemy count
                    // Drop power-up
                    if (Math.random() < powerUpConfig.dropChance) {
                        const powerUpTypes = ['redOrb', 'blueOrb', 'greenOrb'];
                        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                        powerUps.push({
                            x: enemies[i].x + enemies[i].width / 2 - powerUpConfig.width / 2,
                            y: enemies[i].y + enemies[i].height / 2 - powerUpConfig.height / 2,
                            type: randomType,
                            width: powerUpConfig.width,
                            height: powerUpConfig.height
                        });
                    }
                }
                break; // Move to next enemy
            }
        }
    }

    // Player-enemy bullet collision
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (collision(player, enemyBullets[i])) {
            if (player.shieldHealth <= 0) { // Only take damage if no shield
                player.health--; // Decrement player health
            } else {
                player.shieldHealth--; // Decrement shield health
            }
            createExplosion(player.x, player.y);
            enemyBullets.splice(i, 1);
            if (player.health <= 0) {
                gameOver = true;
                if (!isWaitingForReset) {
                    isWaitingForReset = true;
                    setTimeout(() => {
                        isWaitingForReset = false;
                        resetGame(); // Auto-reset after game over screen
                    }, resetScreenDuration);
                }
            }
        }
    }

    // Bullet-boss collision
    if (boss !== null && !boss.isExploding) { // Only take damage if not exploding
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (collision(bullets[j], boss)) {
                boss.health -= bullets[j].damage; // Decrement boss health by bullet damage
                bullets.splice(j, 1);
                if (boss.health <= 0) {
                    boss.health = 0; // Ensure health is 0
                    boss.isExploding = true;
                    boss.explosionCount = 0;
                    boss.nextExplosionTime = Date.now();
                }
                break;
            }
        }
    }

    // Player-power-up collision
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (collision(player, powerUps[i])) {
            if (powerUps[i].type === 'redOrb') {
                player.shieldHealth = 3; // Set shield health to 3
            } else if (powerUps[i].type === 'blueOrb') {
                player.power += 0.5; // Permanent power increase
            } else if (powerUps[i].type === 'greenOrb') {
                player.health++; // Permanent health increase
            }
            powerUps.splice(i, 1); // Remove power-up
        }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].frame++;
        if (explosions[i].frame > 10) { // Simple animation frames
            explosions.splice(i, 1);
        }
    }

    // Background scroll
    bgScrollY = (bgScrollY + 2) % canvas.height;
}

function createExplosion(x, y) {
    explosions.push({ x: x, y: y, frame: 0 });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.drawImage(images.bg, 0, bgScrollY, canvas.width, canvas.height);
    ctx.drawImage(images.bg, 0, bgScrollY - canvas.height, canvas.width, canvas.height);

    // Draw player
    ctx.drawImage(images.player, player.x, player.y, player.width, player.height);

    // Draw shield if active
    if (player.shieldHealth > 0) {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2, false);
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // Draw bullets
    for (const b of bullets) {
        ctx.drawImage(images.bullet, b.x, b.y, b.width, b.height);
    }

    // Draw enemies
    for (const e of enemies) {
        let imgToDraw;
        if (e.type === 'shooter') {
            imgToDraw = images.shooterEnemy;
        } else if (e.type === 'leaf') {
            imgToDraw = images.leafEnemy;
        } else if (e.type === 'irregular') {
            imgToDraw = images.irregularEnemy;
        } else if (e.type === 'randomShooter') {
            imgToDraw = images.randomShooter;
        } else if (e.type === 'charging') {
            imgToDraw = images.chargingEnemy;
        } else {
            imgToDraw = images.enemy;
        }
        ctx.drawImage(imgToDraw, e.x, e.y, e.width, e.height);
    }

    // Draw enemy bullets
    for (const eb of enemyBullets) {
        ctx.drawImage(images.enemyBullet, eb.x, eb.y, eb.width, eb.height);
    }

    // Draw power-ups
    for (const pu of powerUps) {
        let imgToDraw;
        if (pu.type === 'redOrb') {
            imgToDraw = images.redOrb;
        } else if (pu.type === 'blueOrb') {
            imgToDraw = images.blueOrb;
        } else if (pu.type === 'greenOrb') {
            imgToDraw = images.greenOrb;
        }
        ctx.drawImage(imgToDraw, pu.x, pu.y, pu.width, pu.height);
    }

    // Draw boss
    if (boss !== null && !boss.isExploding) { // Only draw boss if not exploding
        ctx.drawImage(images.boss, boss.x, boss.y, boss.width, boss.height);
        // Draw boss health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x, boss.y - 10, boss.width, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(boss.x, boss.y - 10, boss.width * (boss.health / bossConfig.health), 5);
    }

    // Draw explosions
    for (const exp of explosions) {
        // Simple explosion animation (e.g., a red circle that grows and fades)
        const radius = exp.frame * 3;
        const alpha = 1 - (exp.frame / 10);
        ctx.beginPath();
        ctx.arc(exp.x + enemy.width / 2, exp.y + enemy.height / 2, radius, 0, Math.PI * 2, false);
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fill();
    }

    // Draw level
    ctx.fillStyle = 'black'; // Changed to black
    ctx.font = '20px Arial';
    ctx.fillText('Level: ' + currentLevel, 10, 20); // Moved to top left

    // Draw player health
    ctx.fillStyle = 'red';
    ctx.font = '20px Arial';
    ctx.fillText('HP: ' + player.health, 10, canvas.height - 10); // Bottom left

    // Draw level up message
    if (displayLevelMessage) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.fillText('LEVEL UP!', canvas.width / 2 - 120, canvas.height / 2 + 15);
    }

    if (!gameStarted) {
        if (gameClear) {
            drawGameClearScreen(); // New function for game clear screen
        } else {
            drawStartScreen();
        }
    } else if (gameOver) {
        drawGameOverScreen();
    }
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Press Space to Start', canvas.width / 2 - 150, canvas.height / 2);
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.fillText('GAME OVER', canvas.width / 2 - 150, canvas.height / 2 - 30);
    ctx.font = '30px Arial';
    ctx.fillText('Score: ' + score, canvas.width / 2 - 70, canvas.height / 2 + 20);
    ctx.fillText('Press Space to Restart', canvas.width / 2 - 160, canvas.height / 2 + 70);
}

function drawGameClearScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.fillText('GAME CLEAR!', canvas.width / 2 - 180, canvas.height / 2 - 30);
    ctx.font = '30px Arial';
    ctx.fillText('Score: ' + score, canvas.width / 2 - 70, canvas.height / 2 + 20);
    ctx.fillText('Press Space to Restart', canvas.width / 2 - 160, canvas.height / 2 + 70);
}

function gameLoop() {
    try {
        update();
        draw();
    } catch (e) {
        console.error("Game loop error:", e);
        // Optionally, set gameOver = true here to stop the game gracefully
        // gameOver = true;
    }
    requestAnimationFrame(gameLoop);
}

draw(); // Initial draw for start screen