
    document.addEventListener('DOMContentLoaded', () => {
        const fsBtn = document.getElementById('fullscreen-btn');
        if(fsBtn) {
            fsBtn.onclick = () => {
                const gameArea = document.getElementById('actual-game-container');
                if(gameArea && gameArea.requestFullscreen) {
                    gameArea.requestFullscreen();
                }
            }
        }
    });
