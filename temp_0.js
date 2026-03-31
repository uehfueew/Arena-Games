
            document.addEventListener('DOMContentLoaded', () => {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('mode')) {
                    document.getElementById('game-start-overlay').style.display = 'none';
                    document.getElementById('actual-game-container').style.filter = 'none';
                }
            });
        