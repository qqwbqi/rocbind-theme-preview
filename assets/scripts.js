document.addEventListener('DOMContentLoaded', function() {
  fixKnownBrokenLinks();
  initBeforeAfterSliders();
  initScrollNav();
  initCart();
  initProductForms();
  initProductGallery();
  initSwatchAdvisor();
  initAIAdvisor();
});

document.addEventListener('shopify:section:load', function() {
  initBeforeAfterSliders();
  initProductGallery();
  initSwatchAdvisor();
  initAIAdvisor();
});

function routes() {
  return window.TerraBondRoutes || {};
}

function escapeHTML(value) {
  var div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function formatMoney(cents) {
  if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
    return window.Shopify.formatMoney(cents);
  }
  return '$' + (Number(cents || 0) / 100).toFixed(2);
}

function fixKnownBrokenLinks() {
  var fixes = {
    '/sample-kit': '/products/resin-bound-washed-stone-sample-kit-120',
    '/diy-test-kit': '/products/resin-bound-washed-stone-8kg-kit',
    '/about': '/pages/about',
    '/shipping': '/pages/shipping-returns',
    '/privacy': '/pages/privacy-policy',
    '/terms': '/pages/terms-of-service',
    '/installation': '/#how-it-works',
    '/contact': '/pages/contact'
  };
  var homeAnchors = {
    '#swatches': '#swatches',
    '#dealer-section': '#dealer-section',
    '#dealer-program': '#dealer-section',
    '#faq': '#faq',
    '#footer': '#footer',
    '#how-it-works': '#how-it-works'
  };
  var currentHomeAnchor = homeAnchors[window.location.hash];

  if (currentHomeAnchor && window.location.pathname === '/collections/all') {
    window.location.replace('/' + currentHomeAnchor);
    return;
  }

  document.querySelectorAll('a[href]').forEach(function(link) {
    var rawHref = link.getAttribute('href');
    if (!rawHref || rawHref === '#') return;
    var url = new URL(rawHref, window.location.origin);
    var fixedHash = homeAnchors[url.hash];
    var fixed = fixedHash && url.pathname === '/collections/all' ? '/' + fixedHash : fixes[url.pathname];
    if (fixed) link.setAttribute('href', fixed);
  });
}

function initScrollNav() {
  var nav = document.getElementById('main-nav');
  if (!nav || nav.dataset.scrollReady === 'true') return;
  nav.dataset.scrollReady = 'true';
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

function toggleMobileMenu() {
  var menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('open');
}

function initCart() {
  document.querySelectorAll('[data-add-to-cart-variant]').forEach(function(button) {
    if (button.dataset.cartReady === 'true') return;
    button.dataset.cartReady = 'true';
    button.addEventListener('click', function() {
      addVariantToCart(button.dataset.addToCartVariant, 1);
    });
  });

  document.addEventListener('click', function(event) {
    var control = event.target.closest('[data-cart-line]');
    if (!control) return;
    changeCartLine(control.dataset.cartLine, Number(control.dataset.cartQuantity));
  });

  refreshCart();
}

function initProductForms() {
  document.querySelectorAll('form[action*="/cart/add"]').forEach(function(form) {
    if (form.dataset.ajaxCartReady === 'true') return;
    form.dataset.ajaxCartReady = 'true';
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
        .then(function(response) {
          if (!response.ok) throw new Error('Unable to add item');
          return response.json();
        })
        .then(function() {
          showNotification('Added to cart');
          refreshCart(true);
        })
        .catch(function() {
          showNotification('Unable to add this item. Please try again.');
        });
    });
  });
}

function initProductGallery() {
  document.querySelectorAll('[data-product-gallery]').forEach(function(gallery) {
    if (gallery.dataset.galleryReady === 'true') return;
    gallery.dataset.galleryReady = 'true';

    var mainImage = gallery.querySelector('[data-product-main-image]');
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('[data-product-gallery-thumb]'));
    var variantSelect = gallery.querySelector('#ProductVariant');
    var variantsScript = gallery.querySelector('[data-product-variants-json]');
    var variants = [];

    if (!mainImage) return;

    if (variantsScript) {
      try {
        variants = JSON.parse(variantsScript.textContent || '[]');
      } catch (error) {
        variants = [];
      }
    }

    function imageUrlAtWidth(src, width) {
      if (!src) return '';
      if (src.indexOf('width=') !== -1) {
        return src.replace(/([?&])width=\d+/, '$1width=' + width);
      }
      if (src.indexOf('?') !== -1) {
        return src + '&width=' + width;
      }
      return src + '?width=' + width;
    }

    function setActiveThumb(nextThumb) {
      thumbs.forEach(function(thumb) {
        thumb.classList.toggle('active', thumb === nextThumb);
      });
    }

    function updateMainImage(src, srcset, alt) {
      if (!src) return;
      mainImage.src = src;
      if (srcset) mainImage.srcset = srcset;
      else mainImage.removeAttribute('srcset');
      if (alt) mainImage.alt = alt;
    }

    function updateFromThumb(thumb) {
      if (!thumb) return;
      updateMainImage(thumb.dataset.mainSrc || thumb.src, thumb.dataset.mainSrcset, thumb.alt);
      setActiveThumb(thumb);
    }

    function updateFromVariant(variantId) {
      var variant = variants.find(function(item) {
        return String(item.id) === String(variantId);
      });
      var featuredImage = variant && variant.featured_image;
      if (!featuredImage) return;

      var imageId = String(featuredImage.id || '');
      var matchingThumb = thumbs.find(function(thumb) {
        return thumb.dataset.imageId === imageId;
      });

      if (matchingThumb) {
        updateFromThumb(matchingThumb);
        return;
      }

      var src = featuredImage.src || '';
      updateMainImage(
        imageUrlAtWidth(src, 1400),
        imageUrlAtWidth(src, 700) + ' 700w, ' + imageUrlAtWidth(src, 1000) + ' 1000w, ' + imageUrlAtWidth(src, 1400) + ' 1400w',
        featuredImage.alt
      );
      setActiveThumb(null);
    }

    thumbs.forEach(function(thumb) {
      thumb.setAttribute('role', 'button');
      thumb.setAttribute('tabindex', '0');
      thumb.addEventListener('click', function() {
        updateFromThumb(thumb);
      });
      thumb.addEventListener('keydown', function(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        updateFromThumb(thumb);
      });
    });

    if (variantSelect) {
      variantSelect.addEventListener('change', function() {
        updateFromVariant(variantSelect.value);
      });
    }
  });
}

function toggleCart(forceOpen) {
  var sidebar = document.getElementById('cart-sidebar');
  var overlay = document.getElementById('cart-overlay');
  if (!sidebar || !overlay) return;

  if (forceOpen === true) {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    return;
  }

  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

function addVariantToCart(variantId, quantity) {
  if (!variantId) return;
  fetch(routes().cartAdd || '/cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ id: Number(variantId), quantity: quantity || 1 })
  })
    .then(function(response) {
      if (!response.ok) throw new Error('Unable to add item');
      return response.json();
    })
    .then(function() {
      showNotification('Added to cart');
      refreshCart(true);
    })
    .catch(function() {
      showNotification('Unable to add this item. Please try again.');
    });
}

function changeCartLine(line, quantity) {
  fetch(routes().cartChange || '/cart/change.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ line: Number(line), quantity: Math.max(0, Number(quantity)) })
  })
    .then(function(response) {
      if (!response.ok) throw new Error('Unable to update cart');
      return response.json();
    })
    .then(renderCart)
    .catch(function() {
      showNotification('Unable to update cart. Please try again.');
    });
}

function refreshCart(openAfter) {
  fetch((routes().cart || '/cart') + '.js', { headers: { 'Accept': 'application/json' } })
    .then(function(response) { return response.json(); })
    .then(function(cart) {
      renderCart(cart);
      if (openAfter) toggleCart(true);
    })
    .catch(function() {});
}

function renderCart(cart) {
  var container = document.getElementById('cart-items');
  var emptyState = document.getElementById('cart-empty-state');
  var badge = document.getElementById('cart-badge');
  var totalText = document.getElementById('cart-total-price');
  if (!container || !emptyState || !badge || !totalText) return;

  container.innerHTML = '';
  if (!cart || !cart.items || cart.items.length === 0) {
    emptyState.style.display = 'block';
    badge.classList.add('hidden');
    badge.textContent = '0';
    totalText.textContent = formatMoney(0);
    return;
  }

  emptyState.style.display = 'none';
  cart.items.forEach(function(item, index) {
    var line = index + 1;
    var row = document.createElement('div');
    row.className = 'cart-item-row';
    row.dataset.line = line;
    row.innerHTML =
      '<div class="cart-item-info">' +
        '<p>' + escapeHTML(item.product_title) + '</p>' +
        '<span>' + escapeHTML(item.variant_title || '') + ' - ' + formatMoney(item.final_price) + '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div class="cart-qty">' +
          '<button type="button" data-cart-line="' + line + '" data-cart-quantity="' + (item.quantity - 1) + '">-</button>' +
          '<span>' + item.quantity + '</span>' +
          '<button type="button" data-cart-line="' + line + '" data-cart-quantity="' + (item.quantity + 1) + '">+</button>' +
        '</div>' +
        '<span class="cart-item-price">' + formatMoney(item.final_line_price) + '</span>' +
      '</div>';
    container.appendChild(row);
  });

  badge.textContent = cart.item_count;
  badge.classList.toggle('hidden', cart.item_count === 0);
  totalText.textContent = formatMoney(cart.total_price);
}

function checkoutCart() {
  window.location.href = '/checkout';
}

function openQuoteModal(title) {
  var modal = document.getElementById('quote-modal');
  var titleEl = document.getElementById('modal-title');
  var requestType = document.getElementById('quote-request-type');
  var nextTitle = title || (titleEl ? titleEl.textContent : 'Bulk Project Estimate');
  if (modal) modal.classList.add('open');
  if (titleEl) titleEl.textContent = nextTitle;
  if (requestType) requestType.value = nextTitle;
}

function closeQuoteModal() {
  var modal = document.getElementById('quote-modal');
  if (modal) modal.classList.remove('open');
}

function toggleDealerModal() {
  openQuoteModal('Apply for US Commercial Partnership');
}

function toggleFAQ(btn) {
  var content = btn.nextElementSibling;
  if (!content) return;
  content.classList.toggle('open');
  btn.classList.toggle('open');
}

function initBeforeAfterSliders() {
  document.querySelectorAll('.before-after-container').forEach(function(container) {
    if (container.dataset.sliderReady === 'true') return;
    container.dataset.sliderReady = 'true';

    var beforeContainer = container.querySelector('.before-after-before');
    var handle = container.querySelector('.slider-handle');
    if (!beforeContainer || !handle) return;

    var isDragging = false;
    var pct = 50;
    function setPct(nextPct) {
      pct = Math.max(0, Math.min(100, nextPct));
      beforeContainer.style.clipPath = 'polygon(0 0, ' + pct + '% 0, ' + pct + '% 100%, 0 100%)';
      handle.style.left = pct + '%';
      handle.setAttribute('aria-valuenow', Math.round(pct));
    }
    function updatePos(clientX) {
      var rect = container.getBoundingClientRect();
      setPct(((clientX - rect.left) / rect.width) * 100);
    }

    container.addEventListener('mousedown', function(e) { isDragging = true; updatePos(e.clientX); });
    window.addEventListener('mousemove', function(e) { if (isDragging) updatePos(e.clientX); });
    window.addEventListener('mouseup', function() { isDragging = false; });
    container.addEventListener('touchstart', function(e) { isDragging = true; updatePos(e.touches[0].clientX); });
    window.addEventListener('touchmove', function(e) { if (isDragging) updatePos(e.touches[0].clientX); });
    window.addEventListener('touchend', function() { isDragging = false; });
    handle.addEventListener('keydown', function(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      setPct(pct + (e.key === 'ArrowRight' ? 5 : -5));
    });
  });
}

function showNotification(message) {
  var toast = document.getElementById('global-toast');
  var text = document.getElementById('toast-message');
  if (!toast || !text) return;
  text.textContent = message;
  toast.classList.add('open');
  setTimeout(function() { toast.classList.remove('open'); }, 3000);
}

function initSwatchAdvisor() {
  document.querySelectorAll('.swatch-card[data-ai-prompt]').forEach(function(card) {
    if (card.dataset.swatchReady === 'true') return;
    card.dataset.swatchReady = 'true';
    card.addEventListener('click', function() {
      var prompt = card.dataset.aiPrompt;
      if (!prompt) return;
      toggleAIChat(true);
      askAIPreset(prompt);
    });
  });
}

function readAdvisorRules() {
  var script = document.getElementById('ai-advisor-rules');
  if (!script) return [];
  try {
    return JSON.parse(script.textContent) || [];
  } catch (e) {
    return [];
  }
}

function readAdvisorConfig() {
  var script = document.getElementById('ai-advisor-config');
  if (!script) return {};
  try {
    return JSON.parse(script.textContent) || {};
  } catch (e) {
    return {};
  }
}

function initAIAdvisor() {
  document.querySelectorAll('[data-ai-question]').forEach(function(button) {
    if (button.dataset.aiReady === 'true') return;
    button.dataset.aiReady = 'true';
    button.addEventListener('click', function() {
      askAIPreset(button.dataset.aiQuestion);
    });
  });
}

function toggleAIChat(forceOpen) {
  var win = document.getElementById('ai-chat-window');
  if (!win) return;
  if (forceOpen === true) win.classList.add('open');
  else win.classList.toggle('open');
}

function askAIPreset(question) {
  var input = document.getElementById('ai-chat-input');
  if (input) input.value = question;
  sendAIChatMessage();
}

function handleAIKeyPress(e) {
  if (e.key === 'Enter') sendAIChatMessage();
}

function sendAIChatMessage() {
  var input = document.getElementById('ai-chat-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  appendChatMessage('user', text);
  input.value = '';

  var waitingId = appendChatMessage('ai', 'Reviewing your project question...');
  var response = findAdvisorResponse(text);
  setTimeout(function() {
    updateChatMessage(waitingId, response);
  }, 450);
}

function findAdvisorResponse(question) {
  var normalized = question.toLowerCase();
  var rulesList = readAdvisorRules();
  for (var i = 0; i < rulesList.length; i += 1) {
    var rule = rulesList[i];
    var triggers = String(rule.trigger || rule.quickOption || '').toLowerCase().split(',');
    for (var j = 0; j < triggers.length; j += 1) {
      var trigger = triggers[j].trim();
      if (trigger && normalized.indexOf(trigger) !== -1) return rule.response;
    }
  }
  var config = readAdvisorConfig();
  return config.fallback || 'Thanks for your question. Please submit a quote request with your area, base condition, and preferred stone colors for project-specific recommendations.';
}

function appendChatMessage(role, text) {
  var history = document.getElementById('ai-chat-history');
  if (!history) return '';
  var id = 'msg-' + Date.now() + Math.floor(Math.random() * 1000);
  var bubble = document.createElement('div');
  bubble.className = 'ai-message ' + role;
  if (role === 'user') {
    bubble.innerHTML = '<div class="bubble">' + escapeHTML(text) + '</div><div class="ai-user-avatar">You</div>';
  } else {
    bubble.innerHTML = '<div class="ai-avatar">AI</div><div id="' + id + '" class="bubble">' + escapeHTML(text) + '</div>';
  }
  history.appendChild(bubble);
  history.scrollTop = history.scrollHeight;
  return id;
}

function updateChatMessage(id, text) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
  var history = document.getElementById('ai-chat-history');
  if (history) history.scrollTop = history.scrollHeight;
}
