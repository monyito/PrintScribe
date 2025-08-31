// Sintra Board Dynamic Content Script (v5 - Final Version)

class SintraBoardApp {
  constructor() {
    this.data = null;
    this.init();
  }

  /**
   * Initializes the application by loading data and rendering content.
   */
  async init() {
    try {
      this.data = await this._loadData();
      const customerId = this._getCustomerIdFromUrl();
      const customerData = this.data[customerId] || this.data.default;
      
      this._renderContent(customerData);
      this._setupEventListeners();
      this._initializeAnimations();
    } catch (error) {
      console.error('Error initializing Sintra Board App:', error);
      this._renderContent({
        name: 'Guest',
        message: 'There was an issue loading your personalized content. Please try again later.',
        digitalCopy: 'files/logo1.png'
      });
    }
  }

  /**
   * Fetches the customer data from the JSON file using cache busting.
   * @private
   * @returns {Promise<Object>} The parsed JSON data.
   */
  async _loadData() {
    try {
      const cacheBuster = `v=${new Date().getTime()}`;
      const response = await fetch(`data.json?${cacheBuster}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error loading data.json:', error);
      return {
        default: {
          name: 'Guest',
          message: 'Welcome to your personalized Sintra board!',
          digitalCopy: 'files/default-sintra.png'
        }
      };
    }
  }

  /**
   * Retrieves the customer ID from the URL's query parameters.
   * @private
   * @returns {string|null} The customer ID or null if not present.
   */
  _getCustomerIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  /**
   * Populates the page with the customer's data, handling single or multiple images.
   * @private
   * @param {Object} data - The customer data object.
   */
  _renderContent(data) {
    const name = data.name ?? 'Guest';
    const message = data.message ?? 'Welcome to your personalized Sintra board!';
    const digitalCopy = data.digitalCopy ?? 'files/default-sintra.png';

    // Update Name & Message
    document.getElementById('customer-name').textContent = `Welcome, ${name}`;
    document.getElementById('customer-message').textContent = message;

    if (Array.isArray(digitalCopy) && digitalCopy.length > 0) {
      this._createImageGallery(digitalCopy, name);
    } else {
      this._displaySingleImage(digitalCopy, name);
    }
  }
  
  /**
   * Displays a single image and updates the download link.
   * @private
   */
  _displaySingleImage(imageUrl, name) {
    const mainImage = document.getElementById('board-image-main');
    const thumbnailContainer = document.getElementById('board-thumbnails-container');

    mainImage.src = imageUrl;
    mainImage.alt = `${name}'s Personalised Sintra Board`;
    thumbnailContainer.innerHTML = ''; 

    this._updateDownloadLink(imageUrl, name);
  }

  /**
   * Creates an interactive image gallery with thumbnails and individual download icons.
   * @private
   */
  _createImageGallery(images, name) {
    const mainImage = document.getElementById('board-image-main');
    const thumbnailContainer = document.getElementById('board-thumbnails-container');
    
    thumbnailContainer.innerHTML = '';
    mainImage.src = images[0];
    mainImage.alt = `${name}'s Personalised Sintra Board (1 of ${images.length})`;
    this._updateDownloadLink(images[0], name);

    images.forEach((imageUrl, index) => {
      // Create a wrapper for the thumbnail and its download icon
      const thumbnailWrapper = document.createElement('div');
      thumbnailWrapper.className = 'relative group';

      // Create the thumbnail image
      const thumb = document.createElement('img');
      thumb.src = imageUrl;
      thumb.alt = `View design ${index + 1}`;
      thumb.className = 'w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg cursor-pointer border-2 border-transparent group-hover:border-yellow-400 transition-all';
      
      if (index === 0) {
        thumb.classList.replace('border-transparent', 'border-yellow-400');
      }

      // Create the individual download link/icon
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUrl;
      const safeName = (name ?? 'sintra-board').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const fileExtension = (imageUrl.match(/\.[a-z0-9]+$/i)?.[0]) || '.png';
      downloadLink.download = `${safeName}_design_${index + 1}${fileExtension}`;
      downloadLink.setAttribute('aria-label', `Download design ${index + 1}`);
      // Mobile-friendly classes: visible on mobile, hover on desktop
      downloadLink.className = 'absolute bottom-1 right-1 bg-black/60 text-white p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity';
      downloadLink.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>`;
      
      // Stop the click from changing the main image when downloading
      downloadLink.addEventListener('click', (e) => e.stopPropagation());

      // Add click event to the wrapper to change the main image
      thumbnailWrapper.addEventListener('click', () => {
        mainImage.style.opacity = '0';
        setTimeout(() => {
            mainImage.src = imageUrl;
            mainImage.alt = `${name}'s Personalised Sintra Board (${index + 1} of ${images.length})`;
            mainImage.style.opacity = '1';
        }, 300);
        
        this._updateDownloadLink(imageUrl, name);
        
        thumbnailContainer.querySelectorAll('img').forEach(t => t.classList.replace('border-yellow-400', 'border-transparent'));
        thumb.classList.replace('border-transparent', 'border-yellow-400');
      });

      // Assemble and append to the container
      thumbnailWrapper.appendChild(thumb);
      thumbnailWrapper.appendChild(downloadLink);
      thumbnailContainer.appendChild(thumbnailWrapper);
    });
  }

  /**
   * Configures the main download link.
   * @private
   */
  _updateDownloadLink(fileUrl, name) {
    const link = document.getElementById('download-btn');
    if (!link) return;

    if (fileUrl) {
      link.href = fileUrl;
      const fileExtension = (fileUrl.match(/\.[a-z0-9]+$/i)?.[0]) || '.png';
      const safeName = (name ?? 'sintra-board').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.download = `${safeName}_sintra_board${fileExtension}`;
      
      link.classList.remove('opacity-60', 'pointer-events-none');
      link.removeAttribute('aria-disabled');
      link.setAttribute('aria-label', `Download ${name}'s personalised Sintra board`);
    } else {
      link.removeAttribute('href');
      link.removeAttribute('download');
      link.setAttribute('aria-disabled', 'true');
      link.classList.add('opacity-60', 'pointer-events-none');
    }
  }
  
  _setupEventListeners() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  _initializeAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('animate-in'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-up').forEach(el => observer.observe(el));
  }
}

// --- Bootstrapping ---
document.addEventListener('DOMContentLoaded', () => {
  new SintraBoardApp();
});