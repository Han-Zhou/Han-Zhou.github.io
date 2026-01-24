// DOM Elements
const subscribeForm = document.getElementById('subscribeForm');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalSubscribeForm = document.getElementById('modalSubscribeForm');
const btnSubscribeNav = document.querySelector('.btn-subscribe-nav');
const floatingMail = document.querySelector('.floating-mail');
const toast = document.getElementById('toast');
const posts = document.querySelectorAll('.post');

// Show toast notification
function showToast(message = 'Successfully subscribed!') {
    const toastSpan = toast.querySelector('span');
    toastSpan.textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Open modal
function openModal() {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Handle subscription
function handleSubscribe(email) {
    // In a real implementation, you would send this to a backend
    console.log('Subscribing email:', email);
    
    // Simulate API call
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });
        }, 500);
    });
}

// Hero subscribe form submission
subscribeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = subscribeForm.querySelector('input[type="email"]').value;
    
    try {
        const button = subscribeForm.querySelector('button');
        button.textContent = 'Subscribing...';
        button.disabled = true;
        
        await handleSubscribe(email);
        
        subscribeForm.reset();
        showToast('Successfully subscribed!');
        
        button.textContent = 'Subscribe';
        button.disabled = false;
    } catch (error) {
        console.error('Subscription error:', error);
        showToast('Something went wrong. Please try again.');
    }
});

// Modal subscribe form submission
modalSubscribeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = modalSubscribeForm.querySelector('input[type="email"]').value;
    
    try {
        const button = modalSubscribeForm.querySelector('button');
        button.textContent = 'Subscribing...';
        button.disabled = true;
        
        await handleSubscribe(email);
        
        modalSubscribeForm.reset();
        closeModal();
        showToast('Successfully subscribed!');
        
        button.textContent = 'Subscribe';
        button.disabled = false;
    } catch (error) {
        console.error('Subscription error:', error);
        showToast('Something went wrong. Please try again.');
    }
});

// Nav subscribe button
btnSubscribeNav.addEventListener('click', openModal);

// Floating mail button
floatingMail.addEventListener('click', openModal);

// Close modal button
modalClose.addEventListener('click', closeModal);

// Close modal on overlay click
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});

// Intersection Observer for post animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const postObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            postObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all posts
posts.forEach((post) => {
    postObserver.observe(post);
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Parallax effect for hero background (subtle)
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            const heroHeight = hero.offsetHeight;
            
            if (scrolled < heroHeight) {
                const parallax = scrolled * 0.3;
                hero.style.backgroundPositionY = `calc(50% + ${parallax}px)`;
            }
            
            ticking = false;
        });
        
        ticking = true;
    }
});

// Console welcome message
console.log('%c👋 Welcome!', 'font-size: 24px; font-weight: bold;');
console.log('%cThis is a demo portfolio site. Thanks for checking out the code!', 'font-size: 14px; color: #888;');
