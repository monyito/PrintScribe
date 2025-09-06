// Sintra Board Dynamic Content Script (v10 - Fullscreen Swipe Gallery)

class SintraBoardApp {
  constructor() {
    this.data = null;
    this.customerData = null;
    this.galleryData = {
      images: [],
      name: '',
      currentIndex: 0,
      touchStartX: 0,
      touchEndX: 0
    };

    // Cache DOM elements, including new modal navigation
    this.elements = {
        heroCustomerName: document.getElementById('hero-customer-name'),
        customerMessage: document.getElementById('customer-message'),
        mainImage: document.getElementById('board-image-main'),
        thumbnailContainer: document.getElementById('board-thumbnails-container'),
        downloadBtn: document.getElementById('download-btn'),
        downloadBtnText: document.querySelector('#download-btn span'),
        galleryContainer: document.getElementById('gallery-container'),
        mainImageDownloadIcon: document.getElementById('main-image-download-icon'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        // Modal elements
        modal: document.getElementById('fullscreen-modal'),
        modalContent: document.querySelector('.modal-content'),
        modalImage: document.getElementById('fullscreen-image'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        modalPrevBtn: document.getElementById('modal-prev-btn'),
        modalNextBtn: document.getElementById('modal-next-btn')
    };

    this.init();
  }

  async init() {
    try {
      this.data = await this._loadData();
      const customerId = this._getCustomerIdFromUrl();
      this.customerData = this.data[customerId] || this.data.default;
      
      this._renderContent(this.customerData);
      this._setupEventListeners();
      this._initializeAnimations();
    } catch (error) {
      console.error('Error initializing Sintra Board App:', error);
    }
  }

  _getCustomerIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
  }

  async _loadData() {
    try {
        const cacheBuster = `v=${new Date().getTime()}`;
        const response = await fetch(`data.json?${cacheBuster}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error loading data.json:', error);
        return { default: { name: 'Guest', message: 'Welcome!', digitalCopy: 'files/default-sintra.png' } };
    }
  }

  _renderContent(data) {
    this._resetUI();
    const name = data.name ?? 'Guest';
    const message = data.message ?? 'Welcome!';
    const digitalCopy = data.digitalCopy ?? 'files/default-sintra.png';

    this.elements.heroCustomerName.textContent = name;
    this.elements.customerMessage.textContent = message;

    if (Array.isArray(digitalCopy) && digitalCopy.length > 0) {
      this._createImageGallery(digitalCopy, name);
    } else {
      this._displaySingleImage(digitalCopy, name);
    }
  }

  _resetUI() {
    this.elements.galleryContainer.classList.remove('is-gallery');
    this.elements.thumbnailContainer.innerHTML = '';
  }
  
  _displaySingleImage(imageUrl, name) {
    this.elements.mainImage.src = imageUrl;
    this.elements.mainImage.alt = `${name}'s Personalized Artwork`;
  }

  _createImageGallery(images, name) {
    this.galleryData = { ...this.galleryData, images, name, currentIndex: 0 };
    this.elements.galleryContainer.classList.add('is-gallery');
    this._renderThumbnails();
    this._setupGalleryEventListeners();
    this._updateGalleryView();
  }
  
  /**
   * Updates all UI parts based on the current gallery index.
   * This is the single source of truth for the view.
   */
  _updateGalleryView() {
    const { images, name, currentIndex } = this.galleryData;
    const imageUrl = images[currentIndex];
    
    // Update main page image with fade effect
    this.elements.mainImage.style.opacity = '0';
    setTimeout(() => {
        this.elements.mainImage.src = imageUrl;
        this.elements.mainImage.alt = `${name}'s Personalized Artwork (${currentIndex + 1} of ${images.length})`;
        this.elements.mainImage.style.opacity = '1';
    }, 300);

    // Update modal image if it's open
    if (document.body.classList.contains('modal-open')) {
        this.elements.modalContent.style.opacity = '0';
        setTimeout(() => {
            this.elements.modalImage.src = imageUrl;
            this.elements.modalContent.style.opacity = '1';
        }, 150);
    }

    this._updateMainImageDownloadIcon(imageUrl, name, currentIndex);
    
    this.elements.thumbnailContainer.querySelectorAll('img').forEach((thumb, i) => {
        thumb.classList.toggle('thumbnail-active', i === currentIndex);
    });
  }

  _setupEventListeners() {
    // Main download button
    this.elements.downloadBtn.addEventListener('click', (e) => this._handleDownloadAllClick(e));

    // Fullscreen modal listeners
    this.elements.mainImage.addEventListener('click', () => this._openModal());
    this.elements.modalCloseBtn.addEventListener('click', () => this._closeModal());
    this.elements.modal.addEventListener('click', (e) => {
        if (e.target === this.elements.modal) this._closeModal();
    });
    
    // NEW: Modal navigation listeners
    this.elements.modalPrevBtn.addEventListener('click', () => this._navigatePrev());
    this.elements.modalNextBtn.addEventListener('click', () => this._navigateNext());

    // NEW: Modal swipe listeners
    this.elements.modal.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: true });
    this.elements.modal.addEventListener('touchend', this._handleTouchEnd.bind(this));
  }

  _openModal() {
    const currentImageUrl = this.elements.mainImage.src;
    this.elements.modalImage.src = currentImageUrl;
    
    // Show/hide nav arrows based on image count
    if (this.galleryData.images.length > 1) {
        this.elements.modal.classList.add('is-gallery');
    } else {
        this.elements.modal.classList.remove('is-gallery');
    }
    
    document.body.classList.add('modal-open');
    this.elements.modal.classList.remove('opacity-0', 'pointer-events-none');
    this.elements.modalContent.classList.remove('scale-90', 'opacity-0');
  }

  _closeModal() {
    document.body.classList.remove('modal-open');
    this.elements.modal.classList.add('opacity-0', 'pointer-events-none');
    this.elements.modalContent.classList.add('scale-90', 'opacity-0');
  }
  
  async _handleDownloadAllClick(event) {
    event.preventDefault();
    if (!this.customerData || typeof JSZip === 'undefined') return;

    const { name, digitalCopy } = this.customerData;
    const safeName = (name ?? 'artwork').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    const originalButtonText = this.elements.downloadBtnText.textContent;
    this.elements.downloadBtnText.textContent = 'Preparing...';
    this.elements.downloadBtn.classList.add('opacity-70', 'pointer-events-none');

    try {
        if (Array.isArray(digitalCopy) && digitalCopy.length > 1) {
            const zip = new JSZip();
            const imagePromises = digitalCopy.map(async (url) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                const blob = await response.blob();
                const fileName = url.substring(url.lastIndexOf('/') + 1);
                zip.file(fileName, blob);
            });
            await Promise.all(imagePromises);
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            this._triggerDownload(zipBlob, `${safeName}_collection.zip`);
        } else {
            const imageUrl = Array.isArray(digitalCopy) ? digitalCopy[0] : digitalCopy;
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${imageUrl}`);
            const blob = await response.blob();
            const fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
            this._triggerDownload(blob, `${safeName}_${fileName}`);
        }
    } catch (error) {
        console.error('Error preparing download:', error);
        alert('There was an error while preparing your files for download.');
    } finally {
        this.elements.downloadBtnText.textContent = originalButtonText;
        this.elements.downloadBtn.classList.remove('opacity-70', 'pointer-events-none');
    }
  }

  _triggerDownload(blob, fileName) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none'; a.href = url; a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
  }

  _initializeAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('animate-in'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.fade-in, .slide-in-up').forEach(el => observer.observe(el));
  }
  _renderThumbnails() {
    this.elements.thumbnailContainer.innerHTML = '';
    this.galleryData.images.forEach((imageUrl, index) => {
      const thumb = document.createElement('img');
      thumb.src = imageUrl;
      thumb.alt = `View design ${index + 1}`;
      thumb.className = 'w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-accent transition-all transform hover:scale-105';
      thumb.addEventListener('click', () => this._navigateTo(index));
      this.elements.thumbnailContainer.appendChild(thumb);
    });
  }
  _setupGalleryEventListeners() {
    this.elements.nextBtn.onclick = () => this._navigateNext();
    this.elements.prevBtn.onclick = () => this._navigatePrev();
    this.elements.galleryContainer.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: true });
    this.elements.galleryContainer.addEventListener('touchend', this._handleTouchEnd.bind(this));
  }
  _navigateNext() {
    if (!this.galleryData.images.length) return;
    const newIndex = (this.galleryData.currentIndex + 1) % this.galleryData.images.length;
    this._navigateTo(newIndex);
  }
  _navigatePrev() {
    if (!this.galleryData.images.length) return;
    const newIndex = (this.galleryData.currentIndex - 1 + this.galleryData.images.length) % this.galleryData.images.length;
    this._navigateTo(newIndex);
  }
  _handleTouchStart(e) { this.galleryData.touchStartX = e.changedTouches[0].screenX; }
  _handleTouchEnd(e) {
    this.galleryData.touchEndX = e.changedTouches[0].screenX;
    this._handleSwipeGesture();
  }
  _handleSwipeGesture() {
    if (!this.galleryData.images.length > 1) return; // Don't swipe if there's only one image
    const swipeThreshold = 50;
    const diffX = this.galleryData.touchEndX - this.galleryData.touchStartX;
    if (Math.abs(diffX) > swipeThreshold) {
      if (diffX < 0) this._navigateNext();
      else this._navigatePrev();
    }
  }
  _navigateTo(index) {
    this.galleryData.currentIndex = index;
    this._updateGalleryView();
  }
  _updateMainImageDownloadIcon(fileUrl, name, index) {
    const link = this.elements.mainImageDownloadIcon;
    const safeName = (name ?? 'artwork').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fileExtension = (fileUrl.match(/\.[a-z0-9]+$/i)?.[0]) || '.png';
    link.href = fileUrl;
    link.download = `${safeName}_design_${index + 1}${fileExtension}`;
    link.setAttribute('aria-label', `Download ${name}'s design ${index + 1}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SintraBoardApp();
});