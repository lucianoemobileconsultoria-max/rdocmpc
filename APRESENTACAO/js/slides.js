/**
 * APRESENTAÇÃO INTERATIVA DO SISTEMA E APP RDO ENGENHARIA CMPC
 * Controlador de Slides, Teclado, Fullscreen, Miniaturas e Exportação
 */

class PresentationController {
  constructor() {
    this.slides = document.querySelectorAll('.slide');
    this.totalSlides = this.slides.length;
    this.currentIndex = 0;
    this.isAutoplay = false;
    this.autoplayInterval = null;
    this.autoplayDelay = 8000; // 8 segundos por slide no autoplay

    this.progressBar = document.getElementById('top-progress-fill');
    this.counterEl = document.getElementById('dock-slide-counter');
    this.titleEl = document.getElementById('dock-title-preview');
    this.drawerModal = document.getElementById('drawer-modal');
    this.drawerGrid = document.getElementById('drawer-grid');
    this.lightboxModal = document.getElementById('lightbox-modal');
    this.lightboxImg = document.getElementById('lightbox-img');

    this.touchStartX = 0;
    this.touchEndX = 0;

    this.init();
  }

  init() {
    if (this.totalSlides === 0) return;

    // Build Thumbnail Drawer
    this.buildThumbnails();

    // Bind Keyboard
    window.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Bind Touch / Swipe
    window.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    }, { passive: true });

    // Show initial slide
    this.goToSlide(0);

    // Setup interactive mockup widgets
    this.setupInteractiveMockups();
  }

  goToSlide(index) {
    if (index < 0) index = 0;
    if (index >= this.totalSlides) index = this.totalSlides - 1;

    this.slides.forEach((slide, i) => {
      slide.classList.remove('active', 'prev');
      if (i === index) {
        slide.classList.add('active');
      } else if (i < index) {
        slide.classList.add('prev');
      }
    });

    this.currentIndex = index;
    this.updateControls();
    this.closeDrawer();
  }

  nextSlide() {
    if (this.currentIndex < this.totalSlides - 1) {
      this.goToSlide(this.currentIndex + 1);
    } else if (this.isAutoplay) {
      this.goToSlide(0); // Loop in autoplay
    }
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.goToSlide(this.currentIndex - 1);
    }
  }

  updateControls() {
    const current = this.currentIndex + 1;
    const padCurrent = String(current).padStart(2, '0');
    const padTotal = String(this.totalSlides).padStart(2, '0');

    // Counter
    if (this.counterEl) {
      this.counterEl.textContent = `${padCurrent} / ${padTotal}`;
    }

    // Progress
    if (this.progressBar) {
      const pct = (current / this.totalSlides) * 100;
      this.progressBar.style.width = `${pct}%`;
    }

    // Current Slide Title
    if (this.titleEl) {
      const activeSlide = this.slides[this.currentIndex];
      const titleElem = activeSlide.querySelector('.slide-title');
      const badgeElem = activeSlide.querySelector('.slide-module-badge');
      const titleText = titleElem ? titleElem.textContent.trim() : `Slide ${current}`;
      const badgeText = badgeElem ? badgeElem.textContent.trim() : '';
      this.titleEl.textContent = badgeText ? `${badgeText} • ${titleText}` : titleText;
    }

    // Update Drawer Active Item
    const drawerItems = document.querySelectorAll('.drawer-item');
    drawerItems.forEach((item, i) => {
      if (i === this.currentIndex) {
        item.classList.add('current');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('current');
      }
    });
  }

  buildThumbnails() {
    if (!this.drawerGrid) return;
    this.drawerGrid.innerHTML = '';

    this.slides.forEach((slide, idx) => {
      const title = slide.querySelector('.slide-title')?.textContent.trim() || `Slide ${idx + 1}`;
      const badge = slide.querySelector('.slide-module-badge')?.textContent.trim() || 'RDO';

      const item = document.createElement('div');
      item.className = `drawer-item ${idx === 0 ? 'current' : ''}`;
      item.innerHTML = `
        <div class="drawer-item-tag">${badge}</div>
        <div class="drawer-item-title">${title}</div>
        <div class="drawer-item-num">Slide ${String(idx + 1).padStart(2, '0')}</div>
      `;
      item.onclick = () => this.goToSlide(idx);
      this.drawerGrid.appendChild(item);
    });
  }

  handleKeyboard(e) {
    // If target is an input field, ignore
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'Space':
      case 'PageDown':
      case 'l':
      case 'Enter':
        e.preventDefault();
        this.nextSlide();
        break;

      case 'ArrowLeft':
      case 'PageUp':
      case 'h':
      case 'Backspace':
        e.preventDefault();
        this.prevSlide();
        break;

      case 'Home':
        e.preventDefault();
        this.goToSlide(0);
        break;

      case 'End':
        e.preventDefault();
        this.goToSlide(this.totalSlides - 1);
        break;

      case 'f':
      case 'F':
        e.preventDefault();
        this.toggleFullscreen();
        break;

      case 'o':
      case 'O':
        e.preventDefault();
        this.toggleDrawer();
        break;

      case 'p':
      case 'P':
        e.preventDefault();
        this.printPresentation();
        break;

      case 'Escape':
        this.closeDrawer();
        this.closeLightbox();
        break;
    }
  }

  handleSwipe() {
    const diff = this.touchEndX - this.touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        this.nextSlide(); // swipe left -> next
      } else {
        this.prevSlide(); // swipe right -> prev
      }
    }
  }

  toggleDrawer() {
    if (this.drawerModal) {
      this.drawerModal.classList.toggle('open');
    }
  }

  closeDrawer() {
    if (this.drawerModal) {
      this.drawerModal.classList.remove('open');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  toggleAutoplay() {
    this.isAutoplay = !this.isAutoplay;
    const btnAutoplay = document.getElementById('btn-autoplay');

    if (this.isAutoplay) {
      if (btnAutoplay) btnAutoplay.innerHTML = '<span>⏸ Pausar</span>';
      this.autoplayInterval = setInterval(() => this.nextSlide(), this.autoplayDelay);
    } else {
      if (btnAutoplay) btnAutoplay.innerHTML = '<span>▶ Auto</span>';
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  printPresentation() {
    window.print();
  }

  openLightbox(src) {
    if (!this.lightboxModal || !this.lightboxImg) return;
    this.lightboxImg.src = src;
    this.lightboxModal.classList.add('open');
  }

  closeLightbox() {
    if (this.lightboxModal) {
      this.lightboxModal.classList.remove('open');
    }
  }

  setupInteractiveMockups() {
    // Interactivity: clicking photo previews opens Lightbox
    document.querySelectorAll('.mock-photo-img').forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => this.openLightbox(img.src));
    });

    // Interactivity: toggle Diurno / Noturno in mockups
    document.querySelectorAll('.mock-turno-pill .mock-pill').forEach(pill => {
      pill.style.cursor = 'pointer';
      pill.addEventListener('click', (e) => {
        const parent = pill.closest('.mock-turno-pill');
        if (parent) {
          parent.querySelectorAll('.mock-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }
      });
    });
  }
}

// Global instance
let presentation;
document.addEventListener('DOMContentLoaded', () => {
  presentation = new PresentationController();
});
