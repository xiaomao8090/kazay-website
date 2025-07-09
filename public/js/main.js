document.addEventListener('DOMContentLoaded', function() {
    // 导航栏滚动效果
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 移动端导航菜单切换
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.querySelector('nav ul');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    // 点击导航链接时关闭移动菜单
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            }
        });
    });

    // 星空背景效果
    createStarryBackground();
    
    // 流星效果
    createMeteors();

    // 更新时间显示
    displayUpdateTime();
    
    // 随机客户消息
    displayRandomTestimonials();
    
    // 响应窗口大小变化
    window.addEventListener('resize', handleResize);
    
    // 初始调用以设置正确的大小
    handleResize();
});

// 处理窗口大小变化
function handleResize() {
    // 重新调整星空画布
    const starsCanvas = document.getElementById('stars-canvas');
    const meteorsCanvas = document.getElementById('meteors-canvas');
    
    if (starsCanvas) {
        starsCanvas.width = window.innerWidth;
        starsCanvas.height = window.innerHeight;
    }
    
    if (meteorsCanvas) {
        meteorsCanvas.width = window.innerWidth;
        meteorsCanvas.height = window.innerHeight;
    }
    
    // 根据设备类型调整星星数量
    if (starsCanvas) {
        const ctx = starsCanvas.getContext('2d');
        ctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
        createStars(ctx, starsCanvas);
    }
}

// 创建星空背景
function createStarryBackground() {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 创建星星
    const stars = createStars(ctx, canvas);
    
    // 绘制和动画
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.fill();
            
            // 闪烁效果
            star.opacity += Math.random() * 0.02 - 0.01;
            if (star.opacity > 1) star.opacity = 1;
            if (star.opacity < 0.2) star.opacity = 0.2;
            
            // 轻微移动
            star.x += star.speed;
            if (star.x > canvas.width) star.x = 0;
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// 创建星星
function createStars(ctx, canvas) {
    // 根据设备屏幕大小调整星星数量
    const isMobile = window.innerWidth <= 768;
    const density = isMobile ? 500 : 1000; // 移动端密度更小
    const starCount = Math.floor(canvas.width * canvas.height / density);
    const stars = [];

    // 生成星星
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * (isMobile ? 1.2 : 1.5) + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            speed: Math.random() * 0.05 * (isMobile ? 0.7 : 1)
        });
    }
    
    return stars;
}

// 创建流星效果
function createMeteors() {
    const canvas = document.getElementById('meteors-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const meteors = [];
    
    // 根据设备调整流星频率
    const isMobile = window.innerWidth <= 768;
    const minInterval = isMobile ? 5000 : 3000;
    const maxInterval = isMobile ? 8000 : 5000;
    
    // 随机创建流星
    function createMeteor() {
        // 调整流星大小
        const length = isMobile ? 
            Math.floor(Math.random() * 50) + 30 : 
            Math.floor(Math.random() * 80) + 50;
            
        const meteor = {
            x: Math.random() * canvas.width,
            y: 0,
            length: length,
            speed: Math.floor(Math.random() * 8) + 4,
            opacity: 1
        };
        
        meteors.push(meteor);
        
        // 控制流星数量
        setTimeout(() => {
            createMeteor();
        }, Math.random() * (maxInterval - minInterval) + minInterval);
    }
    
    createMeteor();
    
    // 绘制和动画
    function animateMeteors() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const meteorsToRemove = [];
        
        meteors.forEach((meteor, index) => {
            ctx.beginPath();
            const gradient = ctx.createLinearGradient(
                meteor.x, meteor.y,
                meteor.x + meteor.length, meteor.y + meteor.length
            );
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.moveTo(meteor.x, meteor.y);
            ctx.lineTo(meteor.x + meteor.length, meteor.y + meteor.length);
            ctx.stroke();
            
            meteor.x += meteor.speed;
            meteor.y += meteor.speed;
            meteor.opacity -= 0.01;
            
            if (meteor.opacity <= 0 || meteor.x >= canvas.width || meteor.y >= canvas.height) {
                meteorsToRemove.push(index);
            }
        });
        
        // 移除已消失的流星
        for (let i = meteorsToRemove.length - 1; i >= 0; i--) {
            meteors.splice(meteorsToRemove[i], 1);
        }
        
        requestAnimationFrame(animateMeteors);
    }
    
    animateMeteors();
}

// 显示更新时间
function displayUpdateTime() {
    const updateTimeElement = document.getElementById('updateTime');
    if (updateTimeElement) {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        updateTimeElement.textContent = now.toLocaleString('zh-CN', options);
    }
}

// 显示随机客户消息
function displayRandomTestimonials() {
    const testimonialContainer = document.getElementById('random-testimonials');
    if (!testimonialContainer) return;

    // 客户消息数据
    const testimonials = [
        {
            name: "李先生",
            company: "科技有限公司",
            text: "KAZAY工作室的设计团队非常专业，他们不仅理解了我们的品牌理念，还为我们创造了超出预期的视觉体验。"
        },
        {
            name: "王女士",
            company: "教育培训机构",
            text: "我们的网站由KAZAY团队开发，不仅外观精美，而且功能强大，大大提升了用户体验和转化率。"
        },
        {
            name: "张总",
            company: "零售连锁企业",
            text: "KAZAY工作室是我们长期的合作伙伴，他们的创意和技术实力让我们的品牌在市场上脱颖而出。"
        },
        {
            name: "赵经理",
            company: "金融服务机构",
            text: "我们选择KAZAY是因为他们对细节的关注和对品质的坚持，事实证明这是一个明智的选择。"
        },
        {
            name: "刘老师",
            company: "文化传媒公司",
            text: "与KAZAY的合作非常愉快，他们不仅交付高质量的作品，还提供了专业的建议和支持。"
        },
        {
            name: "孙总监",
            company: "医疗健康集团",
            text: "KAZAY工作室帮助我们重新设计了品牌形象和网站，取得了非常积极的市场反响。"
        }
    ];

    // 根据屏幕大小决定显示的评价数量
    const isMobile = window.innerWidth <= 768;
    const displayCount = isMobile ? 2 : Math.min(3, testimonials.length);

    // 随机选择评价显示
    const selectedTestimonials = [];
    const testimonialsCopy = [...testimonials];
    
    for (let i = 0; i < displayCount; i++) {
        const randomIndex = Math.floor(Math.random() * testimonialsCopy.length);
        selectedTestimonials.push(testimonialsCopy[randomIndex]);
        testimonialsCopy.splice(randomIndex, 1);
    }

    // 生成HTML
    selectedTestimonials.forEach(item => {
        const testimonialElement = document.createElement('div');
        testimonialElement.className = 'testimonial-item';
        testimonialElement.innerHTML = `
            <div class="testimonial-content">
                <p>"${item.text}"</p>
                <div class="testimonial-author">
                    <span class="author-name">${item.name}</span>
                    <span class="author-company">${item.company}</span>
                </div>
            </div>
        `;
        testimonialContainer.appendChild(testimonialElement);
    });
} 