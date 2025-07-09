document.addEventListener('DOMContentLoaded', function() {
    // 移动端菜单切换
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('nav');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // 总是创建星空效果，不依赖图片
    createStars();

    // 页面滚动效果
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const header = document.querySelector('header');
        
        if (scrollPosition > 50) {
            header.style.padding = '15px 0';
            header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.5)';
        } else {
            header.style.padding = '20px 0';
            header.style.boxShadow = 'none';
        }

        // 添加淡入效果，当元素进入视口时
        const fadeElements = document.querySelectorAll('.feature-card, .project-card, .testimonial');
        fadeElements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    });

    // FAQ交互功能
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', function() {
                // 关闭其他已打开的FAQ项
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                    }
                });
                
                // 切换当前项的状态
                item.classList.toggle('active');
                
                // 更新图标
                const icon = item.querySelector('.toggle-icon i');
                if (item.classList.contains('active')) {
                    icon.classList.remove('fa-plus');
                    icon.classList.add('fa-minus');
                } else {
                    icon.classList.remove('fa-minus');
                    icon.classList.add('fa-plus');
                }
            });
        });
    }
});

// 创建动态星空效果
function createStars() {
    const starsContainer = document.querySelector('.stars-container');
    
    // 清除星空容器中可能存在的内容
    while (starsContainer.firstChild) {
        starsContainer.removeChild(starsContainer.firstChild);
    }
    
    // 创建背景
    const background = document.createElement('div');
    background.style.position = 'absolute';
    background.style.top = '0';
    background.style.left = '0';
    background.style.width = '100%';
    background.style.height = '100%';
    background.style.backgroundColor = '#111111';
    background.style.zIndex = '-5';
    starsContainer.appendChild(background);
    
    // 创建第一层星星（小星星）
    const stars1 = document.createElement('div');
    stars1.id = 'stars';
    stars1.style.position = 'absolute';
    stars1.style.top = '0';
    stars1.style.left = '0';
    stars1.style.width = '100%';
    stars1.style.height = '100%';
    stars1.style.zIndex = '-3';
    starsContainer.appendChild(stars1);
    
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        const size = Math.random() * 2;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.position = 'absolute';
        star.style.backgroundColor = '#ffffff';
        star.style.borderRadius = '50%';
        star.style.top = Math.random() * 100 + '%';
        star.style.left = Math.random() * 100 + '%';
        star.style.opacity = Math.random() * 0.7 + 0.3;
        star.style.animation = `twinkle ${Math.random() * 2 + 3}s infinite ease-in-out`;
        stars1.appendChild(star);
    }
    
    // 创建第二层星星（中星星）
    const stars2 = document.createElement('div');
    stars2.id = 'stars2';
    stars2.style.position = 'absolute';
    stars2.style.top = '0';
    stars2.style.left = '0';
    stars2.style.width = '100%';
    stars2.style.height = '100%';
    stars2.style.zIndex = '-2';
    starsContainer.appendChild(stars2);
    
    for (let i = 0; i < 70; i++) {
        const star = document.createElement('div');
        const size = Math.random() * 3 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.position = 'absolute';
        star.style.backgroundColor = '#ffffff';
        star.style.borderRadius = '50%';
        star.style.top = Math.random() * 100 + '%';
        star.style.left = Math.random() * 100 + '%';
        star.style.opacity = Math.random() * 0.7 + 0.3;
        star.style.animation = `twinkle ${Math.random() * 3 + 5}s infinite ease-in-out`;
        stars2.appendChild(star);
    }
    
    // 创建第三层星星（大星星）
    const stars3 = document.createElement('div');
    stars3.id = 'stars3';
    stars3.style.position = 'absolute';
    stars3.style.top = '0';
    stars3.style.left = '0';
    stars3.style.width = '100%';
    stars3.style.height = '100%';
    stars3.style.zIndex = '-1';
    starsContainer.appendChild(stars3);
    
    for (let i = 0; i < 40; i++) {
        const star = document.createElement('div');
        const size = Math.random() * 4 + 2;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.position = 'absolute';
        star.style.backgroundColor = '#ffffff';
        star.style.borderRadius = '50%';
        star.style.top = Math.random() * 100 + '%';
        star.style.left = Math.random() * 100 + '%';
        star.style.opacity = Math.random() * 0.7 + 0.3;
        star.style.animation = `twinkle ${Math.random() * 4 + 7}s infinite ease-in-out`;
        stars3.appendChild(star);
    }

    // 创建流星
    createMeteors(starsContainer);
    
    // 添加动画样式
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }
        
        @keyframes meteor {
            0% {
                transform: translate(0, 0) rotate(315deg);
                opacity: 1;
            }
            70% {
                opacity: 1;
            }
            100% {
                transform: translate(calc(-100vw - 100%), calc(100vh + 100%)) rotate(315deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// 创建流星效果
function createMeteors(container) {
    // 创建流星容器
    const meteorsContainer = document.createElement('div');
    meteorsContainer.style.position = 'absolute';
    meteorsContainer.style.top = '0';
    meteorsContainer.style.left = '0';
    meteorsContainer.style.width = '100%';
    meteorsContainer.style.height = '100%';
    meteorsContainer.style.overflow = 'hidden';
    meteorsContainer.style.zIndex = '0';
    container.appendChild(meteorsContainer);
    
    // 定期创建新的流星
    function spawnMeteor() {
        // 创建流星
        const meteor = document.createElement('div');
        
        // 设置流星样式
        meteor.style.position = 'absolute';
        meteor.style.width = (Math.random() * 150 + 50) + 'px'; // 长度50-200px
        meteor.style.height = '2px';
        meteor.style.backgroundColor = '#ffffff';
        meteor.style.boxShadow = '0 0 10px #ffffff';
        meteor.style.borderRadius = '50%';
        
        // 随机位置（屏幕右上角区域）
        meteor.style.top = (Math.random() * 20) + '%';
        meteor.style.right = (Math.random() * -10 - 5) + '%'; // 从屏幕右侧稍微外侧开始
        
        // 添加动画
        const duration = Math.random() * 2 + 1; // 1-3秒
        meteor.style.animation = `meteor ${duration}s linear forwards`;
        
        // 将流星添加到容器
        meteorsContainer.appendChild(meteor);
        
        // 动画结束后移除流星
        setTimeout(() => {
            if (meteorsContainer.contains(meteor)) {
                meteorsContainer.removeChild(meteor);
            }
        }, duration * 1000);
    }
    
    // 初始生成几个流星
    for (let i = 0; i < 2; i++) {
        setTimeout(() => {
            spawnMeteor();
        }, i * 1500);
    }
    
    // 定期生成新的流星
    setInterval(() => {
        spawnMeteor();
    }, 4000 + Math.random() * 4000); // 4-8秒生成一次
} 