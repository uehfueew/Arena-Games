export const GRID_SIZE = 20;
export const TILE_COUNT = 20; // 600 / 20

export let state = {
    p1: { x: 2, y: 10, dx: 0, dy: 0, tail: [], score: 0, color: '#00e5ff', alive: true },
    p2: { x: 18, y: 10, dx: 0, dy: 0, tail: [], score: 0, color: '#ff3366', alive: true },
    food: { x: 15, y: 10 },
    active: false,
    multiplayer: false
};

export function initState(multiplayer = false) {
    state.multiplayer = multiplayer;
    state.p1 = { x: 2, y: 10, dx: 0, dy: 0, tail: [], score: 0, color: '#00e5ff', alive: true };
    if (multiplayer) {
        state.p2 = { x: 18, y: 10, dx: 0, dy: 0, tail: [], score: 0, color: '#ff3366', alive: true };
    } else {
        state.p2 = { alive: false, tail: [] }; // Inactive in solo
    }
    state.active = true;
    spawnFood();
}

export function spawnFood() {
    state.food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
}

export function changeDirection(playerKey, dx, dy) {
    const p = state[playerKey];
    if (!p) return;
    // Prevent 180 reverses
    if (dy === 0 && p.dx !== 0) return;
    if (dx === 0 && p.dy !== 0) return;
    
    p.dx = dx;
    p.dy = dy;
}

export function updateEngine() {
    if (!state.active) return;

    const players = state.multiplayer ? ['p1', 'p2'] : ['p1'];

    players.forEach(key => {
        const p = state[key];
        if (!p.alive) return;

        // Move tail
        if (p.dx !== 0 || p.dy !== 0) if (p.dx !== 0 || p.dy !== 0) p.tail.unshift({ x: p.x, y: p.y });
        
        // Move head
        p.x += p.dx;
        p.y += p.dy;

        // Wall Collision
        if (p.x < 0 || p.x >= TILE_COUNT || p.y < 0 || p.y >= TILE_COUNT) {
            p.alive = false;
        }

        // Self collision & Enemy collision
        players.forEach(otherKey => {
            const other = state[otherKey];
            other.tail.forEach(seg => {
                if (p.x === seg.x && p.y === seg.y) p.alive = false;
            });
            // Head to head check (tie if both hit)
            if (key !== otherKey && other.alive && p.x === other.x && p.y === other.y) {
                p.alive = false;
                other.alive = false;
            }
        });

        if (p.alive) {
            // Food collision
            if (p.x === state.food.x && p.y === state.food.y) {
                p.score += 10;
                spawnFood();
            } else {
                if (p.dx !== 0 || p.dy !== 0) p.tail.pop();
            }
        }
    });

    // Check game over
    if (state.multiplayer) {
        if (!state.p1.alive || !state.p2.alive) state.active = false;
    } else {
        if (!state.p1.alive) state.active = false;
    }
}
