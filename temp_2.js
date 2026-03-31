
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}
function likeGame() { alert("Liked game! (Backend integration pending)"); }
function dislikeGame() { alert("Disliked game! (Backend integration pending)"); }
function toggleFavorite() { alert("Toggled favorite! (Backend integration pending)"); }
function submitFeedback() { alert("Feedback submitted! Thank you."); closeModal("feedbackModal"); }
function sendFriendRequest() { alert("Friend request sent!"); }
