/* ==========================================================================
   Sayso Style — cart
   Ajax add/change, drawer refresh, free shipping meter, note + discounts.
   ========================================================================== */

(function () {
  'use strict';

  var utils = window.themeUtils;
  var strings = (window.theme && window.theme.strings) || {};
  var routes = (window.theme && window.theme.routes) || {};

  function getCart() {
    return fetch(routes.root + 'cart.js', { headers: { Accept: 'application/json' } }).then(function (res) {
      return res.json();
    });
  }

  function updateBubbles(cart) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      var count = cart.item_count;
      el.textContent = count > 99 ? '99+' : count;
      el.hidden = count === 0;
      el.classList.add('is-bumped');
      setTimeout(function () {
        el.classList.remove('is-bumped');
      }, 520);
    });
  }

  function updateShipBar(cart) {
    var config = (window.theme && window.theme.freeShipping) || {};
    if (!config.enabled || !config.threshold) return;

    document.querySelectorAll('[data-ship-bar]').forEach(function (bar) {
      var remaining = Math.max(0, config.threshold - cart.total_price);
      var percent = Math.min(100, (cart.total_price / config.threshold) * 100);
      var fill = bar.querySelector('[data-ship-fill]');
      var text = bar.querySelector('[data-ship-text]');

      if (fill) fill.style.width = percent + '%';
      if (text) {
        text.textContent =
          remaining > 0
            ? (strings.remaining || 'You are [amount] away from free shipping').replace(
                '[amount]',
                utils.formatMoney(remaining)
              )
            : strings.qualified || 'You have earned free shipping.';
      }
    });
  }

  /**
   * Pull fresh markup for the drawer and cart page from the section rendering
   * API so line items, totals and discounts always match the server.
   */
  function refreshSections(cart) {
    var ids = [];
    if (document.getElementById('CartDrawerContents')) ids.push('cart-drawer');
    if (document.getElementById('MainCart')) ids.push('main-cart');
    if (!ids.length) {
      updateBubbles(cart);
      updateShipBar(cart);
      return Promise.resolve(cart);
    }

    return fetch(routes.root + '?sections=' + ids.join(','))
      .then(function (res) {
        return res.json();
      })
      .then(function (sections) {
        if (sections['cart-drawer']) {
          swap(sections['cart-drawer'], 'CartDrawerContents');
          swap(sections['cart-drawer'], 'CartDrawerFooter');
        }
        if (sections['main-cart']) {
          swap(sections['main-cart'], 'MainCart');
        }
        updateBubbles(cart);
        updateShipBar(cart);
        if (window.themeReveal) window.themeReveal(document);
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart } }));
        return cart;
      });
  }

  function swap(html, id) {
    var current = document.getElementById(id);
    if (!current) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var next = doc.getElementById(id);
    if (next) current.innerHTML = next.innerHTML;
  }

  function openDrawer() {
    var drawer = document.getElementById('CartDrawer');
    if (drawer && typeof drawer.open === 'function') drawer.open();
  }

  /* --------------------------------------------------------------- add API */

  function addToCart(formData, options) {
    options = options || {};
    formData.append('sections_url', window.location.pathname);

    return fetch(routes.cartAdd, {
      method: 'POST',
      headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
      body: formData
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw data;
          return data;
        });
      })
      .then(function (item) {
        return getCart().then(refreshSections).then(function (cart) {
          if (window.theme.cartType === 'drawer' && options.openDrawer !== false) {
            openDrawer();
          } else {
            window.themeToast(strings.added || 'Added to bag', {
              actionText: 'View bag',
              actionHref: routes.cart
            });
          }
          return { item: item, cart: cart };
        });
      });
  }

  function changeLine(payload) {
    return fetch(routes.cartChange, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json();
      })
      .then(refreshSections);
  }

  window.themeCart = {
    add: addToCart,
    change: changeLine,
    get: getCart,
    refresh: function () {
      return getCart().then(refreshSections);
    },
    openDrawer: openDrawer
  };

  /* ------------------------------------------------------ event delegation */

  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-line-qty]');
    if (!input) return;

    var row = input.closest('[data-line-item]');
    if (row) row.classList.add('is-loading');

    changeLine({ line: parseInt(input.dataset.line, 10), quantity: parseInt(input.value, 10) })
      .catch(function (error) {
        console.error(error);
        window.themeToast(strings.cartError || 'Could not update your bag.');
      })
      .finally(function () {
        if (row) row.classList.remove('is-loading');
      });
  });

  document.addEventListener('click', function (event) {
    var remove = event.target.closest('[data-line-remove]');
    if (remove) {
      event.preventDefault();
      var row = remove.closest('[data-line-item]');
      if (row) row.classList.add('is-loading');
      changeLine({ line: parseInt(remove.dataset.line, 10), quantity: 0 }).catch(function () {
        window.location.href = routes.cart;
      });
      return;
    }

    var checkout = event.target.closest('[data-checkout]');
    if (checkout) {
      checkout.classList.add('is-loading');
    }
  });

  // Order note, debounced so we are not writing on every keystroke.
  var noteTimer;
  document.addEventListener('input', function (event) {
    var note = event.target.closest('[data-cart-note]');
    if (!note) return;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      fetch(routes.root + 'cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.value })
      });
    }, 600);
  });

  // Discount code form inside the drawer.
  document.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-discount-form]');
    if (!form) return;
    event.preventDefault();
    var input = form.querySelector('input[name="discount"]');
    if (!input || !input.value.trim()) return;
    window.location.href = routes.root + 'discount/' + encodeURIComponent(input.value.trim()) + '?redirect=' + routes.cart;
  });

  document.addEventListener('DOMContentLoaded', function () {
    getCart().then(function (cart) {
      updateBubbles(cart);
      updateShipBar(cart);
    });
  });
})();
