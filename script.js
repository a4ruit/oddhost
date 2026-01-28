const workItems = document.querySelectorAll('.work-item');
const repelStrength = 0.2;
const repelDistance = 200;
const friction = 0.98;
const collisionPadding = 20;
let physicsActive = false;
let activeItem = null;

// Info box physics properties
let infoBoxX = window.innerWidth - 320; // Start at right side
let infoBoxY = window.innerHeight / 2 - 200; // Centered vertically
let infoBoxVelX = 0;
let infoBoxVelY = 0;
const infoBoxPullStrength = 0.05;
const infoBoxFriction = 0.12;
const connectionDistance = 300; // Desired distance from project to info box

// Mobile-specific variables
let isMobile = window.innerWidth <= 768;
let currentCardIndex = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;

// Create canvas for connection line
const lineCanvas = document.createElement('canvas');
lineCanvas.style.position = 'fixed';
lineCanvas.style.top = '0';
lineCanvas.style.left = '0';
lineCanvas.style.pointerEvents = 'none';
lineCanvas.style.zIndex = '999';
document.body.appendChild(lineCanvas);

const ctx = lineCanvas.getContext('2d');

function resizeCanvas() {
    lineCanvas.width = window.innerWidth;
    lineCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    isMobile = window.innerWidth <= 768;
    if (isMobile) {
        setupMobile();
    } else {
        // Reset to desktop mode
        items.forEach(item => {
            item.element.style.display = 'block';
            item.element.style.transform = 'none';
        });
    }
});

const layouts = [
    { x: 0.05, y: 0.08 }, //expo website
    { x: 0.65, y: 0.05 }, //held instant
    { x: 0.15, y: 0.38 }, //dm website
    { x: 0.58, y: 0.45 }, //milkbar
    { x: 0.35, y: 0.55 }, //workshop
    { x: 0.70, y: 0.65 }, //cadena
    { x: 0.04, y: 0.65 }, //neurometrix
    { x: 0.4, y: 0.1 } //sos2
];

const projectInfo = {
    'magiexpo.png': {
        title: 'MAGI EXPO 2025',
        description: 'Interactive 3D orbital exhibition website featuring student profiles as asteroids around category planets. Built with React Three Fiber, implementing performance optimization for 60fps rendering and mobile responsiveness.'
    },
    'heldinstant.png': {
        title: 'Held, Instantaneously',
        description: 'Interactive art installation critiquing dating app design through a satirical web interface connected to Unity via WebSocket. User swipes spawn NPCs in a digital terrarium, exploring themes of surveillance capitalism and thoughtless design.'
    },
    'digitalmedia.png': {
        title: 'Digital Media Exhibition Website',
        description: 'Exhibition website combining TikTok-style interfaces with Unity camera control systems for the Digital Media showcase.'
    },
    'milkbar.png': {
        title: 'MAGI Milk Bar Project',
        description: 'Interactive project developed as part of the Masters of Animation, Games & Interactivity program.'
    },
    'workshop.png': {
        title: 'TouchDesigner + Blender Workshop',
        description: 'Educational workshop exploring projection mapping and visual effects, combining real-time interactive systems with 3D modeling workflows.'
    },
    'cadenacam.png': {
        title: 'N0_R3PLY Collective Works',
        description: 'Collaborative projects with N0_R3PLY Collective, exploring WebSocket technologies and performance art in digital spaces.'
    },
    'neurometrix.png': {
        title: 'Digital Media Major Project',
        description: 'Major project completion for Bachelor\'s of Digital Media, exploring interactive installations and digital media practices.'
    },
    'sos2.png': {
        title: 'SOS2',
        description: 'N0_R3PLY Collective performance exploring real-time communication and interactive digital environments.'
    }
};

const items = Array.from(workItems).map((item, index) => {
    const layout = layouts[index] || { x: 0.5, y: 0.5 };
    const posX = window.innerWidth * layout.x;
    const posY = window.innerHeight * layout.y;
    
    return {
        element: item,
        originalX: posX,
        originalY: posY,
        posX: posX,
        posY: posY,
        velX: 0,
        velY: 0
    };
});

items.forEach(item => {
    item.element.style.position = 'absolute';
    item.element.style.left = item.posX + 'px';
    item.element.style.top = item.posY + 'px';
    item.element.style.transition = 'none';
    
    // Add click event
    item.element.addEventListener('click', (e) => {
        e.preventDefault();
        const img = item.element.querySelector('img');
        const imgSrc = img.getAttribute('src').split('/').pop();
        const info = projectInfo[imgSrc];
        
        if (info) {
            activeItem = item;
            const infoBox = document.getElementById('projectInfoBox');
            const content = document.getElementById('projectContent');
            content.innerHTML = `
                <h3>${info.title}</h3>
                <p>${info.description}</p>
            `;
            infoBox.classList.add('active');
        }
    });
});

// Close button functionality
document.getElementById('closeBtn').addEventListener('click', () => {
    document.getElementById('projectInfoBox').classList.remove('active');
    activeItem = null;
});

// Mobile setup function
function setupMobile() {
    if (!isMobile) return;
    
    // Start with all boxes collapsed
    document.querySelector('.info-box')?.classList.add('collapsed');
    document.querySelector('.exhibitions-box')?.classList.add('collapsed');
    document.querySelector('.contact-box')?.classList.add('collapsed');
    
    // Add click handlers for collapsible boxes
    const boxes = ['.info-box', '.exhibitions-box', '.contact-box'];
    boxes.forEach(selector => {
        const box = document.querySelector(selector);
        if (box) {
            const firstP = box.querySelector('p:first-child');
            if (firstP) {
                // Remove existing listeners
                const newFirstP = firstP.cloneNode(true);
                firstP.parentNode.replaceChild(newFirstP, firstP);
                
                newFirstP.addEventListener('click', () => {
                    box.classList.toggle('collapsed');
                });
            }
        }
    });
    
    // Initialize card positions
    updateCardStack();
    
    // Add touch handlers for swiping
    const container = document.querySelector('.container');
    
    // Remove old listeners
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    newContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    newContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    newContainer.addEventListener('touchend', handleTouchEnd);
}

function updateCardStack() {
    if (!isMobile) return;
    
    items.forEach((item, index) => {
        const offset = index - currentCardIndex;
        const element = item.element;
        
        if (Math.abs(offset) > 2) {
            element.style.display = 'none';
        } else {
            element.style.display = 'block';
            element.style.transform = `translate(-50%, -50%) translateX(${offset * 100}%) scale(${1 - Math.abs(offset) * 0.1})`;
            element.style.opacity = offset === 0 ? '1' : '0.5';
            element.style.zIndex = 100 - Math.abs(offset);
        }
    });
}

function handleTouchStart(e) {
    if (!isMobile) return;
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
}

function handleTouchMove(e) {
    if (!isMobile || !isDragging) return;
    
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Visual feedback while dragging
    const currentCard = items[currentCardIndex].element;
    const offset = 0;
    currentCard.style.transform = `translate(-50%, -50%) translateX(${diff}px) scale(1)`;
    
    e.preventDefault();
}

function handleTouchEnd(e) {
    if (!isMobile || !isDragging) return;
    
    const diff = currentX - startX;
    const threshold = 50;
    
    if (diff > threshold && currentCardIndex > 0) {
        // Swipe right - previous card
        currentCardIndex--;
    } else if (diff < -threshold && currentCardIndex < items.length - 1) {
        // Swipe left - next card
        currentCardIndex++;
    }
    
    isDragging = false;
    startX = 0;
    currentX = 0;
    updateCardStack();
}

function updateInfoBoxPosition() {
    if (!activeItem || isMobile) return;
    
    const infoBox = document.getElementById('projectInfoBox');
    if (!infoBox.classList.contains('active')) return;
    
    const itemRect = activeItem.element.getBoundingClientRect();
    const infoRect = infoBox.getBoundingClientRect();
    
    // Calculate centers
    const itemCenterX = itemRect.left + itemRect.width / 2;
    const itemCenterY = itemRect.top + itemRect.height / 2;
    const infoCenterX = infoBoxX + infoRect.width / 2;
    const infoCenterY = infoBoxY + infoRect.height / 2;
    
    // Calculate distance between centers
    const dx = itemCenterX - infoCenterX;
    const dy = itemCenterY - infoCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Pull info box toward project if too far
    if (distance > connectionDistance) {
        const angle = Math.atan2(dy, dx);
        const pullForce = (distance - connectionDistance) * infoBoxPullStrength;
        
        infoBoxVelX += Math.cos(angle) * pullForce;
        infoBoxVelY += Math.sin(angle) * pullForce;
    }
    
    // Apply friction
    infoBoxVelX *= infoBoxFriction;
    infoBoxVelY *= infoBoxFriction;
    
    // Update position
    infoBoxX += infoBoxVelX;
    infoBoxY += infoBoxVelY;
    
    // Keep within bounds
    const maxX = window.innerWidth - infoRect.width;
    const maxY = window.innerHeight - infoRect.height;
    
    if (infoBoxX < 0) {
        infoBoxX = 0;
        infoBoxVelX *= -0.3;
    }
    if (infoBoxX > maxX) {
        infoBoxX = maxX;
        infoBoxVelX *= -0.3;
    }
    if (infoBoxY < 0) {
        infoBoxY = 0;
        infoBoxVelY *= -0.3;
    }
    if (infoBoxY > maxY) {
        infoBoxY = maxY;
        infoBoxVelY *= -0.3;
    }
    
    // Apply position to info box
    infoBox.style.left = infoBoxX + 'px';
    infoBox.style.top = infoBoxY + 'px';
}

function drawConnectionLine() {
    ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
    
    if (!activeItem || isMobile) return;
    
    const infoBox = document.getElementById('projectInfoBox');
    if (!infoBox.classList.contains('active')) return;
    
    const itemRect = activeItem.element.getBoundingClientRect();
    const infoRect = infoBox.getBoundingClientRect();
    
    // Start point: center of project window
    const startX = itemRect.left + itemRect.width / 2;
    const startY = itemRect.top + itemRect.height / 2;
    
    // End point: left edge of info box, vertically centered
    const endX = infoRect.left;
    const endY = infoRect.top + infoRect.height / 2;
    
    // Draw line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw dot at project window end
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fill();
}

function checkCollisions() {
    if (isMobile) return;
    
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const item1 = items[i];
            const item2 = items[j];
            
            const rect1 = item1.element.getBoundingClientRect();
            const rect2 = item2.element.getBoundingClientRect();
            
            const centerX1 = rect1.left + rect1.width / 2;
            const centerY1 = rect1.top + rect1.height / 2;
            const centerX2 = rect2.left + rect2.width / 2;
            const centerY2 = rect2.top + rect2.height / 2;
            
            const dx = centerX2 - centerX1;
            const dy = centerY2 - centerY1;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (rect1.width + rect2.width) / 2 + collisionPadding;
            
            if (distance < minDistance) {
                const angle = Math.atan2(dy, dx);
                const targetX = centerX1 + Math.cos(angle) * minDistance;
                const targetY = centerY1 + Math.sin(angle) * minDistance;
                
                const ax = (targetX - centerX2) * 0.05;
                const ay = (targetY - centerY2) * 0.05;
                
                item1.velX -= ax;
                item1.velY -= ay;
                item2.velX += ax;
                item2.velY += ay;
            }
        }
    }
}

function animate() {
    if (isMobile) {
        // Mobile doesn't use physics animation
        requestAnimationFrame(animate);
        return;
    }
    
    if (!physicsActive) {
        updateInfoBoxPosition();
        drawConnectionLine();
        requestAnimationFrame(animate);
        return;
    }
    
    items.forEach(item => {
        item.velX *= friction;
        item.velY *= friction;
        
        item.posX += item.velX;
        item.posY += item.velY;
        
        const maxX = window.innerWidth - item.element.offsetWidth;
        const maxY = window.innerHeight - item.element.offsetHeight;
        
        if (item.posX < 0) {
            item.posX = 0;
            item.velX *= -0.5;
        }
        if (item.posX > maxX) {
            item.posX = maxX;
            item.velX *= -0.5;
        }
        if (item.posY < 0) {
            item.posY = 0;
            item.velY *= -0.5;
        }
        if (item.posY > maxY) {
            item.posY = maxY;
            item.velY *= -0.5;
        }
        
        item.element.style.left = item.posX + 'px';
        item.element.style.top = item.posY + 'px';
    });
    
    checkCollisions();
    updateInfoBoxPosition();
    drawConnectionLine();
    
    requestAnimationFrame(animate);
}

document.addEventListener('mousemove', (e) => {
    if (isMobile) return;
    
    if (!physicsActive) {
        physicsActive = true;
    }
    
    items.forEach(item => {
        const rect = item.element.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;
        
        const distanceX = e.clientX - itemCenterX;
        const distanceY = e.clientY - itemCenterY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < repelDistance) {
            const force = (repelDistance - distance) / repelDistance;
            item.velX -= (distanceX / distance) * force * repelStrength;
            item.velY -= (distanceY / distance) * force * repelStrength;
        }
    });
});

// Initialize
if (isMobile) {
    setupMobile();
}

animate();