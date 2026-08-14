/* ==========================================================================
   Sayso Style — theme core
   Motion, header behaviour, drawers, modals, accordions, carousels, toasts.
   Written as small custom elements so sections stay declarative in Liquid.
   ========================================================================== */

(function () {
  'use strict';

  var motion = (window.theme && window.theme.motion) || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- utils */

  var utils = {
    debounce: function (fn, wait) {
      var t;
      return function () {
        var args = arguments;
        var ctx = this;
        clearTimeout(t);
        t = setTimeout(function () {
          fn.apply(ctx, args);
        }, wait || 100);
      };
    },

    throttleRaf: function (fn) {
      var ticking = false;
      return function () {
        var args = arguments;
        var ctx = this;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          fn.apply(ctx, args);
          ticking = false;
        });
      };
    },

    formatMoney: function (cents) {
      var format = (window.theme && window.theme.moneyFormat) || '${{amount}}';
      var value = (cents / 100).toFixed(2);
      var parts = value.split('.');
      var withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      return format
        .replace(/\{\{\s*amount\s*\}\}/, withCommas + '.' + parts[1])
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/, withCommas)
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + parts[1])
        .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    },

    announce: function (message) {
      var region = document.querySelector('[data-live-region]');
      if (!region) return;
      region.textContent = '';
      setTimeout(function () {
        region.textContent = message;
      }, 60);
    },

    trapFocus: function (container) {
      var selector =
        'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

      function onKey(event) {
        if (event.key !== 'Tab') return;
        var focusable = Array.prototype.filter.call(container.querySelectorAll(selector), function (el) {
          return el.offsetParent !== null;
        });
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      container.addEventListener('keydown', onKey);
      return function () {
        container.removeEventListener('keydown', onKey);
      };
    },

    fetchSection: function (url) {
      return fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (res) {
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        return res.text();
      });
    }
  };

  window.themeUtils = utils;

  /* ---------------------------------------------------- scroll body lock */

  var scrollLock = {
    count: 0,
    y: 0,
    on: function () {
      if (this.count === 0) {
        this.y = window.scrollY;
        document.body.style.top = -this.y + 'px';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }
      this.count += 1;
    },
    off: function () {
      this.count = Math.max(0, this.count - 1);
      if (this.count === 0) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.y);
      }
    }
  };

  /* ------------------------------------------------------- scrim manager */

  var scrim = {
    el: null,
    users: 0,
    init: function () {
      this.el = document.querySelector('[data-scrim]');
    },
    show: function (onClick) {
      if (!this.el) this.init();
      if (!this.el) return;
      this.users += 1;
      this.el.hidden = false;
      this.handler = onClick;
      requestAnimationFrame(
        function () {
          this.el.classList.add('is-open');
        }.bind(this)
      );
      this.el.onclick = onClick || null;
    },
    hide: function () {
      if (!this.el) return;
      this.users = Math.max(0, this.users - 1);
      if (this.users > 0) return;
      this.el.classList.remove('is-open');
      this.el.onclick = null;
      var el = this.el;
      setTimeout(function () {
        if (!el.classList.contains('is-open')) el.hidden = true;
      }, 300);
    }
  };

  window.themeScrim = scrim;

  /* ---------------------------------------------------- reveal on scroll */

  function initReveals(root) {
    if (!motion.enabled || reduced) {
      (root || document).querySelectorAll('[data-reveal]').forEach(function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }

    var targets = (root || document).querySelectorAll('[data-reveal]:not(.is-revealed)');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );

    targets.forEach(function (el, index) {
      // Stagger siblings that share a parent so grids cascade rather than pop.
      if (!el.style.getPropertyValue('--reveal-delay')) {
        var group = el.closest('[data-reveal-group]');
        if (group) {
          var siblings = Array.prototype.slice.call(group.querySelectorAll('[data-reveal]'));
          var position = siblings.indexOf(el);
          el.style.setProperty('--reveal-delay', Math.min(position, 8) * 70 + 'ms');
        } else if (index === 0) {
          el.style.setProperty('--reveal-delay', '0ms');
        }
      }
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------ parallax */

  function initParallax() {
    if (!motion.parallax || reduced) return;
    var items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;

    var onScroll = utils.throttleRaf(function () {
      var vh = window.innerHeight;
      items.forEach(function (item) {
        var rect = item.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var strength = parseFloat(item.dataset.parallax) || 0.14;
        var progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        var img = item.querySelector('img');
        if (img) img.style.setProperty('--parallax', (progress * strength * 100).toFixed(2) + 'px');
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ------------------------------------------------------- lazy image fade */

  function initLazyFade(root) {
    (root || document).querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('is-loaded');
      } else {
        img.addEventListener(
          'load',
          function () {
            img.classList.add('is-loaded');
          },
          { once: true }
        );
        img.addEventListener(
          'error',
          function () {
            img.classList.add('is-loaded');
          },
          { once: true }
        );
      }
    });
  }

  /* -------------------------------------------------- page fade on leave */

  function initPageTransition() {
    if (!motion.pageTransition || reduced) return;
    document.body.setAttribute('data-page-fade', '');

    var supportsVT = 'startViewTransition' in document;
    var bar = document.createElement('div');
    bar.className = 'route-progress';
    document.body.appendChild(bar);

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (!link) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download') || link.dataset.noTransition !== undefined) return;

      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;

      var url;
      try {
        url = new URL(link.href);
      } catch (e) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      // Checkout and account flows should navigate immediately.
      if (/\/checkout|\/cart\/(add|change|clear)/.test(url.pathname)) return;

      bar.classList.add('is-active');
      if (supportsVT) return; // The browser handles the crossfade natively.

      event.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(function () {
        window.location.href = link.href;
      }, 180);
    });

    window.addEventListener('pageshow', function (event) {
      if (event.persisted) {
        document.body.classList.remove('is-leaving');
        bar.classList.remove('is-active');
      }
    });
  }

  /* --------------------------------------------------------------- toasts */

  function toast(message, options) {
    options = options || {};
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }

    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = message;
    if (options.actionText && options.actionHref) {
      var link = document.createElement('a');
      link.href = options.actionHref;
      link.className = 'link-underline';
      link.textContent = options.actionText;
      link.style.pointerEvents = 'auto';
      el.appendChild(link);
    }
    stack.appendChild(el);

    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () {
        el.remove();
      }, 300);
    }, options.duration || 4000);

    utils.announce(message);
  }

  window.themeToast = toast;

  /* ------------------------------------------------------- custom elements */

  /**
   * <sticky-header> — hides on scroll down, reveals on scroll up.
   */
  if (!customElements.get('sticky-header')) {
    customElements.define(
      'sticky-header',
      class StickyHeader extends HTMLElement {
        connectedCallback() {
          this.header = this.querySelector('.site-header') || this;
          this.lastY = window.scrollY;
          this.threshold = 120;
          this.onScroll = utils.throttleRaf(this.handleScroll.bind(this));
          window.addEventListener('scroll', this.onScroll, { passive: true });
          this.setHeightVar();
          window.addEventListener('resize', utils.debounce(this.setHeightVar.bind(this), 150));
          this.handleScroll();
        }

        disconnectedCallback() {
          window.removeEventListener('scroll', this.onScroll);
        }

        setHeightVar() {
          var h = this.header.offsetHeight;
          if (h) document.documentElement.style.setProperty('--header-height', h + 'px');
        }

        handleScroll() {
          var y = window.scrollY;
          this.header.classList.toggle('is-stuck', y > 8);

          if (!motion.stickyHeader || reduced || this.querySelector('.is-open')) {
            this.header.classList.remove('is-hidden');
            this.lastY = y;
            return;
          }

          if (y > this.lastY && y > this.threshold) {
            this.header.classList.add('is-hidden');
          } else {
            this.header.classList.remove('is-hidden');
          }
          this.lastY = y;
        }
      }
    );
  }

  /**
   * <drawer-element id="..."> — generic slide-out panel.
   * Openers elsewhere use [data-drawer-open="id"].
   */
  if (!customElements.get('drawer-element')) {
    customElements.define(
      'drawer-element',
      class DrawerElement extends HTMLElement {
        connectedCallback() {
          this.panel = this.querySelector('.drawer') || this;
          this.isOpen = false;

          this.querySelectorAll('[data-drawer-close]').forEach(
            function (btn) {
              btn.addEventListener('click', this.close.bind(this));
            }.bind(this)
          );

          document.addEventListener(
            'keydown',
            function (event) {
              if (event.key === 'Escape' && this.isOpen) this.close();
            }.bind(this)
          );

          document.querySelectorAll('[data-drawer-open="' + this.id + '"]').forEach(
            function (btn) {
              btn.addEventListener(
                'click',
                function (event) {
                  event.preventDefault();
                  this.opener = btn;
                  this.open();
                }.bind(this)
              );
            }.bind(this)
          );
        }

        open() {
          if (this.isOpen) return;
          this.isOpen = true;
          this.panel.classList.add('is-open');
          this.panel.setAttribute('aria-hidden', 'false');
          scrim.show(this.close.bind(this));
          scrollLock.on();
          this.releaseFocus = utils.trapFocus(this.panel);

          var focusTarget = this.panel.querySelector('[data-drawer-focus]') || this.panel.querySelector('[data-drawer-close]');
          setTimeout(function () {
            if (focusTarget) focusTarget.focus();
          }, 220);

          this.dispatchEvent(new CustomEvent('drawer:open', { bubbles: true }));
        }

        close() {
          if (!this.isOpen) return;
          this.isOpen = false;
          this.panel.classList.remove('is-open');
          this.panel.setAttribute('aria-hidden', 'true');
          scrim.hide();
          scrollLock.off();
          if (this.releaseFocus) this.releaseFocus();
          if (this.opener) this.opener.focus();
          this.dispatchEvent(new CustomEvent('drawer:close', { bubbles: true }));
        }
      }
    );
  }

  /**
   * <modal-element id="..."> — centred dialog, same opener contract.
   */
  if (!customElements.get('modal-element')) {
    customElements.define(
      'modal-element',
      class ModalElement extends HTMLElement {
        connectedCallback() {
          this.isOpen = false;

          this.addEventListener('click', function (event) {
            if (event.target === this) this.close();
          });

          this.querySelectorAll('[data-modal-close]').forEach(
            function (btn) {
              btn.addEventListener('click', this.close.bind(this));
            }.bind(this)
          );

          document.addEventListener(
            'keydown',
            function (event) {
              if (event.key === 'Escape' && this.isOpen) this.close();
            }.bind(this)
          );

          document.querySelectorAll('[data-modal-open="' + this.id + '"]').forEach(
            function (btn) {
              btn.addEventListener(
                'click',
                function (event) {
                  event.preventDefault();
                  this.opener = btn;
                  this.open();
                }.bind(this)
              );
            }.bind(this)
          );
        }

        open() {
          this.isOpen = true;
          this.classList.add('is-open');
          this.setAttribute('aria-hidden', 'false');
          scrollLock.on();
          this.releaseFocus = utils.trapFocus(this);
          var target = this.querySelector('[data-modal-close]');
          setTimeout(function () {
            if (target) target.focus();
          }, 200);
        }

        close() {
          this.isOpen = false;
          this.classList.remove('is-open');
          this.setAttribute('aria-hidden', 'true');
          scrollLock.off();
          if (this.releaseFocus) this.releaseFocus();
          if (this.opener) this.opener.focus();
        }
      }
    );
  }

  /**
   * <carousel-element> — scroll-snap track with prev/next and drag.
   */
  if (!customElements.get('carousel-element')) {
    customElements.define(
      'carousel-element',
      class CarouselElement extends HTMLElement {
        connectedCallback() {
          this.track = this.querySelector('[data-carousel-track]');
          if (!this.track) return;
          this.prev = this.querySelector('[data-carousel-prev]');
          this.next = this.querySelector('[data-carousel-next]');

          if (this.prev) this.prev.addEventListener('click', this.scrollBy.bind(this, -1));
          if (this.next) this.next.addEventListener('click', this.scrollBy.bind(this, 1));

          this.track.addEventListener('scroll', utils.throttleRaf(this.updateButtons.bind(this)), { passive: true });
          window.addEventListener('resize', utils.debounce(this.updateButtons.bind(this), 150));
          this.updateButtons();
          this.enableDrag();
        }

        get step() {
          var first = this.track.firstElementChild;
          if (!first) return this.track.clientWidth;
          var gap = parseFloat(getComputedStyle(this.track).columnGap || '0') || 0;
          return first.getBoundingClientRect().width + gap;
        }

        scrollBy(direction) {
          this.track.scrollBy({ left: this.step * direction, behavior: reduced ? 'auto' : 'smooth' });
        }

        updateButtons() {
          var max = this.track.scrollWidth - this.track.clientWidth - 2;
          if (this.prev) this.prev.disabled = this.track.scrollLeft <= 2;
          if (this.next) this.next.disabled = this.track.scrollLeft >= max;
        }

        enableDrag() {
          var isDown = false;
          var startX = 0;
          var startScroll = 0;
          var moved = false;
          var track = this.track;

          track.addEventListener('pointerdown', function (event) {
            if (event.pointerType === 'touch') return;
            isDown = true;
            moved = false;
            startX = event.clientX;
            startScroll = track.scrollLeft;
            track.style.scrollBehavior = 'auto';
          });

          track.addEventListener('pointermove', function (event) {
            if (!isDown) return;
            var delta = event.clientX - startX;
            if (Math.abs(delta) > 4) moved = true;
            track.scrollLeft = startScroll - delta;
          });

          ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (type) {
            track.addEventListener(type, function () {
              isDown = false;
              track.style.scrollBehavior = '';
            });
          });

          track.addEventListener(
            'click',
            function (event) {
              if (moved) {
                event.preventDefault();
                event.stopPropagation();
              }
            },
            true
          );
        }
      }
    );
  }

  /**
   * <announcement-bar> — auto-rotating messages, pauses on hover/focus.
   */
  if (!customElements.get('announcement-bar')) {
    customElements.define(
      'announcement-bar',
      class AnnouncementBar extends HTMLElement {
        connectedCallback() {
          this.slides = Array.prototype.slice.call(this.querySelectorAll('.announcement__slide'));
          if (this.slides.length < 2) return;

          this.index = 0;
          this.delay = (parseInt(this.dataset.speed, 10) || 5) * 1000;
          this.autoplay = this.dataset.rotate === 'true' && !reduced;

          var prev = this.querySelector('[data-announcement-prev]');
          var next = this.querySelector('[data-announcement-next]');
          if (prev) prev.addEventListener('click', this.go.bind(this, -1));
          if (next) next.addEventListener('click', this.go.bind(this, 1));

          this.addEventListener('mouseenter', this.stop.bind(this));
          this.addEventListener('mouseleave', this.start.bind(this));
          this.addEventListener('focusin', this.stop.bind(this));
          this.addEventListener('focusout', this.start.bind(this));

          this.start();
        }

        disconnectedCallback() {
          this.stop();
        }

        go(direction) {
          this.slides[this.index].classList.remove('is-active');
          this.index = (this.index + direction + this.slides.length) % this.slides.length;
          this.slides[this.index].classList.add('is-active');
        }

        start() {
          if (!this.autoplay) return;
          this.stop();
          this.timer = setInterval(this.go.bind(this, 1), this.delay);
        }

        stop() {
          clearInterval(this.timer);
        }
      }
    );
  }

  /**
   * <marquee-element> — duplicates its track so the loop is seamless.
   */
  if (!customElements.get('marquee-element')) {
    customElements.define(
      'marquee-element',
      class MarqueeElement extends HTMLElement {
        connectedCallback() {
          if (reduced) return;
          var track = this.querySelector('.marquee__track');
          if (!track) return;
          var clone = track.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          this.querySelector('.marquee').appendChild(clone);
        }
      }
    );
  }

  /**
   * <accordion-element> — height animation without a hard-coded max-height.
   */
  if (!customElements.get('accordion-element')) {
    customElements.define(
      'accordion-element',
      class AccordionElement extends HTMLElement {
        connectedCallback() {
          this.single = this.dataset.single === 'true';
          this.items = Array.prototype.slice.call(this.querySelectorAll('.accordion'));

          this.items.forEach(
            function (item) {
              var summary = item.querySelector('.accordion__summary');
              if (!summary) return;
              summary.addEventListener(
                'click',
                function (event) {
                  event.preventDefault();
                  this.toggle(item);
                }.bind(this)
              );
            }.bind(this)
          );
        }

        toggle(item) {
          var open = item.classList.contains('is-open');
          if (this.single) {
            this.items.forEach(function (other) {
              other.classList.remove('is-open');
              var s = other.querySelector('.accordion__summary');
              if (s) s.setAttribute('aria-expanded', 'false');
            });
          }
          item.classList.toggle('is-open', !open);
          var summary = item.querySelector('.accordion__summary');
          if (summary) summary.setAttribute('aria-expanded', String(!open));
        }
      }
    );
  }

  /**
   * <quantity-input> — plus/minus with change events for cart updates.
   */
  if (!customElements.get('quantity-input')) {
    customElements.define(
      'quantity-input',
      class QuantityInput extends HTMLElement {
        connectedCallback() {
          this.input = this.querySelector('input');
          if (!this.input) return;

          this.querySelectorAll('button').forEach(
            function (button) {
              button.addEventListener(
                'click',
                function (event) {
                  event.preventDefault();
                  var step = button.name === 'plus' ? 1 : -1;
                  var min = parseInt(this.input.min, 10) || 0;
                  var max = this.input.max ? parseInt(this.input.max, 10) : Infinity;
                  var next = Math.min(max, Math.max(min, (parseInt(this.input.value, 10) || 0) + step));
                  if (next === parseInt(this.input.value, 10)) return;
                  this.input.value = next;
                  this.input.dispatchEvent(new Event('change', { bubbles: true }));
                }.bind(this)
              );
            }.bind(this)
          );
        }
      }
    );
  }

  /**
   * <collection-facets> — filter/sort with history + async grid swap.
   */
  if (!customElements.get('collection-facets')) {
    customElements.define(
      'collection-facets',
      class CollectionFacets extends HTMLElement {
        connectedCallback() {
          this.form = this.querySelector('form');
          if (!this.form) return;

          this.form.addEventListener('input', utils.debounce(this.apply.bind(this), 350));
          this.form.addEventListener('change', function (event) {
            if (event.target.tagName === 'SELECT') event.target.form.dispatchEvent(new Event('input', { bubbles: true }));
          });

          this.querySelectorAll('[data-facet-toggle]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var facet = btn.closest('.facet');
              var open = facet.classList.contains('is-open');
              btn.closest('.facets').querySelectorAll('.facet').forEach(function (f) {
                f.classList.remove('is-open');
              });
              facet.classList.toggle('is-open', !open);
              btn.setAttribute('aria-expanded', String(!open));
            });
          });

          document.addEventListener('click', function (event) {
            if (!event.target.closest('.facet')) {
              document.querySelectorAll('.facet.is-open').forEach(function (f) {
                f.classList.remove('is-open');
              });
            }
          });

          window.addEventListener('popstate', this.render.bind(this, window.location.href, false));
        }

        apply() {
          var params = new URLSearchParams(new FormData(this.form)).toString();
          var url = window.location.pathname + (params ? '?' + params : '');
          window.history.pushState({}, '', url);
          this.render(url, true);
        }

        render(url, scroll) {
          var grid = document.getElementById('CollectionGrid');
          if (grid) grid.classList.add('is-loading');

          utils
            .fetchSection(url)
            .then(function (html) {
              var doc = new DOMParser().parseFromString(html, 'text/html');
              ['CollectionGrid', 'CollectionFacets', 'CollectionCount'].forEach(function (id) {
                var next = doc.getElementById(id);
                var current = document.getElementById(id);
                if (next && current) current.innerHTML = next.innerHTML;
              });
              initReveals(document.getElementById('CollectionGrid'));
              initLazyFade(document.getElementById('CollectionGrid'));
              if (scroll) {
                var anchor = document.getElementById('CollectionGrid');
                if (anchor) {
                  var top = anchor.getBoundingClientRect().top + window.scrollY - 140;
                  window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
                }
              }
            })
            .catch(function (error) {
              console.error(error);
              window.location.href = url;
            })
            .finally(function () {
              var g = document.getElementById('CollectionGrid');
              if (g) g.classList.remove('is-loading');
            });
        }
      }
    );
  }

  /**
   * <load-more> — appends the next page of products in place.
   */
  if (!customElements.get('load-more')) {
    customElements.define(
      'load-more',
      class LoadMore extends HTMLElement {
        connectedCallback() {
          this.button = this.querySelector('button');
          this.target = document.getElementById(this.dataset.target);
          if (!this.button || !this.target) return;
          this.button.addEventListener('click', this.load.bind(this));
        }

        load() {
          var url = this.dataset.next;
          if (!url) return;
          this.button.classList.add('is-loading');
          this.button.disabled = true;

          utils
            .fetchSection(url)
            .then(
              function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var incoming = doc.getElementById(this.dataset.target);
                var nextControl = doc.querySelector('load-more');

                if (incoming) {
                  Array.prototype.slice.call(incoming.children).forEach(
                    function (child) {
                      this.target.appendChild(child);
                    }.bind(this)
                  );
                }

                if (nextControl && nextControl.dataset.next) {
                  this.dataset.next = nextControl.dataset.next;
                } else {
                  this.remove();
                }

                initReveals(this.target);
                initLazyFade(this.target);
              }.bind(this)
            )
            .catch(
              function () {
                window.location.href = url;
              }.bind(this)
            )
            .finally(
              function () {
                this.button.classList.remove('is-loading');
                this.button.disabled = false;
              }.bind(this)
            );
        }
      }
    );
  }

  /**
   * <mobile-nav> — nested panels inside the menu drawer.
   */
  if (!customElements.get('mobile-nav')) {
    customElements.define(
      'mobile-nav',
      class MobileNav extends HTMLElement {
        connectedCallback() {
          this.querySelectorAll('[data-submenu-toggle]').forEach(function (button) {
            button.addEventListener('click', function () {
              var panel = button.nextElementSibling;
              if (!panel) return;
              var open = button.getAttribute('aria-expanded') === 'true';
              button.setAttribute('aria-expanded', String(!open));
              panel.hidden = open;
            });
          });
        }
      }
    );
  }

  /* -------------------------------------------------------------- startup */

  function boot() {
    scrim.init();
    initReveals();
    initParallax();
    initLazyFade();
    initPageTransition();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-run when the theme editor swaps a section in.
  document.addEventListener('shopify:section:load', function (event) {
    initReveals(event.target);
    initLazyFade(event.target);
  });

  document.addEventListener('shopify:section:select', function (event) {
    var drawer = event.target.querySelector('drawer-element');
    if (drawer && typeof drawer.open === 'function') drawer.open();
  });

  window.themeReveal = initReveals;
})();
