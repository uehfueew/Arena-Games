// Shop preview modal setup
document.addEventListener('DOMContentLoaded', () => {
    // Add modal HTML to body if not exists
    if (!document.getElementById('shop-preview-modal')) {
        const modalHtml = `
            <div id="shop-preview-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
                <div class="modal-content" style="background:var(--bg-card); padding:20px; border-radius:12px; text-align:center; max-width:400px; width:90%; border:1px solid var(--border-light);">
                    <h3 id="preview-title" style="margin-top:0; color:var(--text-light);">Preview Color</h3>
                    <canvas id="preview-canvas" width="200" height="200" style="background:var(--bg-dark); border-radius:8px; margin:15px auto; display:block; box-shadow:inset 0 0 10px rgba(0,0,0,0.5);"></canvas>
                    <button id="close-preview-btn" class="btn" style="background:var(--danger, #e74c3c); margin-top:10px;">Close Preview</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        document.getElementById('close-preview-btn').addEventListener('click', () => {
            document.getElementById('shop-preview-modal').style.display = 'none';
        });
    }
});

function previewSnakeColor(colorHex, colorName) {
    const modal = document.getElementById('shop-preview-modal');
    modal.style.display = 'flex';
    document.getElementById('preview-title').textContent = `Preview: ${colorName}`;
    
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a zigzag snake
    const gridSize = 20;
    const bodyParts = [
        {x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, 
        {x: 3, y: 6}, {x: 3, y: 7}, {x: 4, y: 7}, 
        {x: 5, y: 7}, {x: 6, y: 7}, {x: 7, y: 7}, {x: 8, y: 7},
        {x: 8, y: 6}, {x: 8, y: 5}
    ]; // Head is the first element (x:5, y:5)
    
    // Draw body
    ctx.fillStyle = colorHex;
    for (let i = 1; i < bodyParts.length; i++) {
        ctx.fillRect(bodyParts[i].x * gridSize, bodyParts[i].y * gridSize, gridSize - 1, gridSize - 1);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bodyParts[i].x * gridSize, bodyParts[i].y * gridSize, gridSize - 1, gridSize - 1);
    }
    
    // Draw head with some extra details
    ctx.fillStyle = colorHex;
    ctx.fillRect(bodyParts[0].x * gridSize, bodyParts[0].y * gridSize, gridSize - 1, gridSize - 1);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(bodyParts[0].x * gridSize, bodyParts[0].y * gridSize, gridSize - 1, gridSize - 1);
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.fillRect(bodyParts[0].x * gridSize + 3, bodyParts[0].y * gridSize + 3, 4, 4);
    ctx.fillRect(bodyParts[0].x * gridSize + 12, bodyParts[0].y * gridSize + 3, 4, 4);
    
    ctx.fillStyle = 'black';
    ctx.fillRect(bodyParts[0].x * gridSize + 5, bodyParts[0].y * gridSize + 5, 2, 2);
    ctx.fillRect(bodyParts[0].x * gridSize + 14, bodyParts[0].y * gridSize + 5, 2, 2);
}

// Modify the existing render shop items to add preview button
function makePreviewable() {
    // This will be run after items render
    const items = document.querySelectorAll('.shop-item');
    items.forEach(item => {
        // Find existing style attribute representing the color
        const colorBox = item.querySelector('div[style*="background-color"]');
        if (colorBox) {
            const hex = colorBox.style.backgroundColor;
            const title = item.querySelector('h3').textContent;
            
            // wrap the image container in a clickable area or add a button
            if (!item.querySelector('.preview-btn')) {
                const btn = document.createElement('button');
                btn.className = 'btn preview-btn';
                btn.textContent = 'Preview';
                btn.style.width = '100%';
                btn.style.marginTop = '10px';
                btn.style.background = 'var(--secondary)';
                btn.onclick = (e) => {
                    e.stopPropagation(); // prevent triggering the buy click on the parent if any
                    previewSnakeColor(hex, title);
                }
                item.appendChild(btn);
                
                // Also make the top color part clearly visible
                colorBox.style.height = '80px';
                colorBox.style.width = '100%';
                colorBox.style.borderRadius = '8px';
                colorBox.style.marginBottom = '10px';
                colorBox.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.5)';
            }
        }
    });
}

// Intercept window.renderShopItems or run strictly when items exist
const observer = new MutationObserver((mutations) => {
    if (document.querySelector('.shop-item')) {
        makePreviewable();
    }
});
observer.observe(document.body, { childList: true, subtree: true });
