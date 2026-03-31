
window.showGameOver = function(title, msg, isWin) {
    const modal = document.getElementById('universal-game-over');
    const titleEl = document.getElementById('go-title');
    const msgEl = document.getElementById('go-msg');
    
    titleEl.textContent = title;
    msgEl.textContent = msg;
    
    if (isWin === true) {
        titleEl.style.color = '#88D49E'; // Green
        titleEl.style.textShadow = '0 0 20px rgba(136,212,158,0.5)';
    } else if (isWin === false) {
        titleEl.style.color = '#FF6B6B'; // Red
        titleEl.style.textShadow = '0 0 20px rgba(255,107,107,0.5)';
    } else {
        titleEl.style.color = '#F5B041'; // Yellow/Draw
        titleEl.style.textShadow = '0 0 20px rgba(245,176,65,0.5)';
    }
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    // small animation trick
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
    }, 10);
};
