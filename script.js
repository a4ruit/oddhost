const workItems = document.querySelectorAll('.work-item');

// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Physics properties - adjusted for mobile
const repelStrength = isMobile ? 0.1 : 0.2;
const repelDistance = isMobile ? 150 : 200;
const friction = isMobile ? 0.95 : 0.98;
const collisionPadding = isMobile ? 5 : 20; // Much smaller on mobile
let physicsActive = false;
let activeItem = null;

// Gyroscope/gravity properties
let gravityX = 0;
let gravityY = 0;
const gravityStrength = isMobile ? 0.5 : 0.3; // Stronger on mobile
let gyroActive = false;

// Boundary padding - allows items to float partially off-screen
const boundaryPadding = isMobile ? 100 : 0; // 100px buffer on mobile

// Info box physics properties
let infoBoxX = window.innerWidth - 320;
let infoBoxY = window.innerHeight / 2 - 200;
let infoBoxVelX = 0;
let infoBoxVelY = 0;
const infoBoxPullStrength = 0.05;
const infoBoxFriction = 0.12;
const connectionDistance = isMobile ? 200 : 300;

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
window.addEventListener('resize', resizeCanvas);

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
    
    // Scale down on mobile
    if (isMobile) {
        item.element.style.transform = 'scale(0.6)';
        item.element.style.transformOrigin = 'center center';
    }
    
    // Handle both click and touch
    const openProject = (e) => {
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
            
            // Position info box on mobile
            if (isMobile) {
                const itemRect = item.element.getBoundingClientRect();
                infoBoxX = Math.min(itemRect.right + 20, window.innerWidth - 320);
                infoBoxY = itemRect.top;
            }
        }
    };
    
    item.element.addEventListener('click', openProject);
    item.element.addEventListener('touchstart', openProject);
});

// Close button functionality
const closeBtn = document.getElementById('closeBtn');
closeBtn.addEventListener('click', closeInfoBox);
closeBtn.addEventListener('touchstart', closeInfoBox);

function closeInfoBox(e) {
    e.preventDefault();
    document.getElementById('projectInfoBox').classList.remove('active');
    activeItem = null;
}

// Gyroscope permission and handling
async function requestGyroPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') {
                startGyroscope();
            } else {
                console.log('Gyroscope permission denied');
            }
        } catch (error) {
            console.error('Error requesting gyroscope permission:', error);
        }
    } else {
        // Android or older iOS - no permission needed
        startGyroscope();
    }
}

function startGyroscope() {
    window.addEventListener('deviceorientation', handleOrientation);
    gyroActive = true;
    physicsActive = true;
}

function handleOrientation(event) {
    if (!event.beta || !event.gamma) return;
    
    // beta: front-to-back tilt (-180 to 180, 0 is flat)
    // gamma: left-to-right tilt (-90 to 90, 0 is flat)
    
    let beta = event.beta;
    let gamma = event.gamma;
    
    // Clamp values
    beta = Math.max(-90, Math.min(90, beta));
    gamma = Math.max(-90, Math.min(90, gamma));
    
    // Convert tilt angles to gravity force
    gravityX = (gamma / 90) * gravityStrength;
    gravityY = (beta / 90) * gravityStrength;
}

// Add permission button for iOS
if (isMobile && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    const permissionBtn = document.createElement('button');
    permissionBtn.id = 'gyroPermissionBtn';
    permissionBtn.textContent = 'Enable Tilt Control';
    permissionBtn.style.position = 'fixed';
    permissionBtn.style.bottom = '20px';
    permissionBtn.style.left = '50%';
    permissionBtn.style.transform = 'translateX(-50%)';
    permissionBtn.style.padding = '12px 24px';
    permissionBtn.style.background = '#ffffff';
    permissionBtn.style.border = '1px solid #000';
    permissionBtn.style.cursor = 'pointer';
    permissionBtn.style.zIndex = '1000';
    permissionBtn.style.fontFamily = 'inherit';
    
    permissionBtn.addEventListener('click', async () => {
        await requestGyroPermission();
        permissionBtn.remove();
    });
    
    document.body.appendChild(permissionBtn);
} else if (isMobile) {
    // Auto-start on Android
    startGyroscope();
}

function updateInfoBoxPosition() {
    if (!activeItem) return;
    
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
    
    if (!activeItem) return;
    
    const infoBox = document.getElementById('projectInfoBox');
    if (!infoBox.classList.contains('active')) return;
    
    const itemRect = activeItem.element.getBoundingClientRect();
    const infoRect = infoBox.getBoundingClientRect();
    
    // Start point: center of project window
    const startX = itemRect.left + itemRect.width / 2;
    const startY = itemRect.top + itemRect.height / 2;
    
    // End point: nearest edge of info box
    const endX = infoRect.left;
    const endY = infoRect.top + infoRect.height / 2;
    
    // Draw line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isMobile ? 0.5 : 1;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw dot at project window end
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(startX, startY, isMobile ? 3 : 4, 0, Math.PI * 2);
    ctx.fill();
}

function checkCollisions() {
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
            
            // On mobile, use actual rendered size (accounting for scale)
            const scale = isMobile ? 0.6 : 1;
            const minDistance = ((rect1.width + rect2.width) / 2) * scale + collisionPadding;
            
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
    if (physicsActive) {
        items.forEach(item => {
            // Apply gyroscope gravity if active
            if (gyroActive) {
                item.velX += gravityX;
                item.velY += gravityY;
            }
            
            // Apply friction
            item.velX *= friction;
            item.velY *= friction;
            
            // Update position
            item.posX += item.velX;
            item.posY += item.velY;
            
            // Boundary collision with padding
            const minX = -boundaryPadding;
            const minY = -boundaryPadding;
            const maxX = window.innerWidth - item.element.offsetWidth + boundaryPadding;
            const maxY = window.innerHeight - item.element.offsetHeight + boundaryPadding;
            
            if (item.posX < minX) {
                item.posX = minX;
                item.velX *= -0.5;
            }
            if (item.posX > maxX) {
                item.posX = maxX;
                item.velX *= -0.5;
            }
            if (item.posY < minY) {
                item.posY = minY;
                item.velY *= -0.5;
            }
            if (item.posY > maxY) {
                item.posY = maxY;
                item.velY *= -0.5;
            }
            
            // Apply to DOM
            item.element.style.left = item.posX + 'px';
            item.element.style.top = item.posY + 'px';
        });
        
        checkCollisions();
    }
    
    updateInfoBoxPosition();
    drawConnectionLine();
    
    requestAnimationFrame(animate);
}

// Mouse/touch movement repel
function handlePointerMove(e) {
    if (!physicsActive) {
        physicsActive = true;
    }
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (!clientX || !clientY) return;
    
    items.forEach(item => {
        const rect = item.element.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;
        
        const distanceX = clientX - itemCenterX;
        const distanceY = clientY - itemCenterY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < repelDistance) {
            const force = (repelDistance - distance) / repelDistance;
            item.velX -= (distanceX / distance) * force * repelStrength;
            item.velY -= (distanceY / distance) * force * repelStrength;
        }
    });
}

// Event listeners for both mouse and touch
document.addEventListener('mousemove', handlePointerMove);
document.addEventListener('touchmove', handlePointerMove, { passive: true });

// Prevent page scroll on mobile when touching work items
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.work-item') || e.target.closest('#projectInfoBox')) {
        e.preventDefault();
    }
}, { passive: false });

animate();