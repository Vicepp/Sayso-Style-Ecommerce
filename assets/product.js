/* ==========================================================================
   Sayso Style — product
   Variant selection, gallery sync, buy form, quick add, image zoom.
   ========================================================================== */

(function () {
  'use strict';

  var utils = window.themeUtils;
  var strings = (window.theme && window.theme.strings) || {};

  /**
   * <variant-selector> — reads the product JSON embedded by main-product,
   * resolves the matching variant and updates price, media, URL and buy button.
   */
  if (!customElements.get('variant-selector')) {
    customElements.define(
      'variant-selector',
      class VariantSelector extends HTMLElement {
        connectedCallback() {
          this.sectionId = this.dataset.section;
          this.productUrl = this.dataset.url;
          this.updateUrl = this.dataset.updateUrl !== 'false';

          var script = this.querySelector('[data-variant-data]');
          this.variants = script ? JSON.parse(script.textContent) : [];

          this.addEventListener('change', this.onChange.bind(this));
          this.onChange();
        }

        get selectedOptions() {
          return Array.prototype.map.call(this.querySelectorAll('fieldset'), function (fieldset) {
            var checked = fieldset.querySelector('input:checked');
            if (checked) return checked.value;
            var select = fieldset.querySelector('select');
            return select ? select.value : null;
          });
        }

        onChange() {
          var options = this.selectedOptions;

          this.querySelectorAll('[data-option-value]').forEach(function (label) {
            var index = parseInt(label.dataset.optionIndex, 10);
            if (options[index] === label.dataset.optionValue) {
              label.closest('.variant-group').querySelector('[data-selected-value]').textContent = label.dataset.optionValue;
            }
          });

          var variant = this.variants.find(function (candidate) {
            return candidate.options.every(function (value, index) {
              return value === options[index];
            });
          });

          this.markUnavailable(options);
          this.current = variant;

          if (!variant) {
            this.setUnavailable();
            return;
          }

          this.updateIdInput(variant);
          this.updatePrice(variant);
          this.updateMedia(variant);
          this.updateButton(variant);
          this.updateHistory(variant);
          this.updateSku(variant);

          document.dispatchEvent(
            new CustomEvent('variant:change', { detail: { variant: variant, sectionId: this.sectionId } })
          );
        }

        /** Grey out option values that cannot combine with the current choice. */
        markUnavailable(options) {
          var variants = this.variants;

          this.querySelectorAll('fieldset').forEach(function (fieldset, groupIndex) {
            fieldset.querySelectorAll('input').forEach(function (input) {
              var probe = options.slice();
              probe[groupIndex] = input.value;

              var match = variants.find(function (candidate) {
                return candidate.options.every(function (value, index) {
                  return index > groupIndex ? true : value === probe[index];
                });
              });

              var available = variants.some(function (candidate) {
                return (
                  candidate.available &&
                  candidate.options.every(function (value, index) {
                    return index === groupIndex ? value === input.value : value === probe[index];
                  })
                );
              });

              input.disabled = !match;
              input.classList.toggle('is-unavailable', !available);
            });
          });
        }

        updateIdInput(variant) {
          document.querySelectorAll('[data-variant-id][form], [data-variant-id]').forEach(function (input) {
            if (input.closest('[data-section-id="' + this.sectionId + '"]') || !input.closest('[data-section-id]')) {
              input.value = variant.id;
            }
          }, this);
        }

        updatePrice(variant) {
          var target = document.querySelector('[data-price-target="' + this.sectionId + '"]');
          if (!target) return;

          var html = '<span class="price__now">' + utils.formatMoney(variant.price) + '</span>';
          var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
          if (onSale) {
            html += '<s class="price__was">' + utils.formatMoney(variant.compare_at_price) + '</s>';
          }
          if (variant.unit_price) {
            html +=
              '<span class="price__unit">' +
              utils.formatMoney(variant.unit_price) +
              ' / ' +
              (variant.unit_price_measurement ? variant.unit_price_measurement.reference_unit : '') +
              '</span>';
          }
          target.innerHTML = html;
          target.classList.toggle('price--on-sale', !!onSale);
        }

        updateSku(variant) {
          var sku = document.querySelector('[data-sku-target="' + this.sectionId + '"]');
          if (!sku) return;
          sku.textContent = variant.sku || '';
          sku.hidden = !variant.sku;
        }

        updateMedia(variant) {
          if (!variant.featured_media) return;
          var id = variant.featured_media.id;

          var target = document.querySelector('[data-media-id="' + id + '"]');
          if (!target) return;

          var gallery = target.closest('[data-gallery]');
          if (gallery && gallery.dataset.gallery === 'stacked') {
            var top = target.getBoundingClientRect().top + window.scrollY - 120;
            window.scrollTo({
              top: top,
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
            return;
          }

          document.querySelectorAll('[data-media-id]').forEach(function (media) {
            media.hidden = media.dataset.mediaId !== String(id);
          });
          document.querySelectorAll('[data-thumb-id]').forEach(function (thumb) {
            thumb.classList.toggle('is-active', thumb.dataset.thumbId === String(id));
          });
        }

        updateButton(variant) {
          var form = document.querySelector('[data-buy-form="' + this.sectionId + '"]');
          if (!form) return;
          var button = form.querySelector('[data-add-button]');
          var label = button ? button.querySelector('[data-add-label]') : null;
          if (!button) return;

          button.disabled = !variant.available;
          if (label) label.textContent = variant.available ? strings.addToCart : strings.soldOut;

          var payment = form.querySelector('.shopify-payment-button');
          if (payment) payment.hidden = !variant.available;
        }

        setUnavailable() {
          var form = document.querySelector('[data-buy-form="' + this.sectionId + '"]');
          if (!form) return;
          var button = form.querySelector('[data-add-button]');
          var label = button ? button.querySelector('[data-add-label]') : null;
          if (button) button.disabled = true;
          if (label) label.textContent = strings.unavailable;
        }

        updateHistory(variant) {
          if (!this.updateUrl || !this.productUrl) return;
          var url = new URL(window.location.href);
          url.searchParams.set('variant', variant.id);
          window.history.replaceState({}, '', url.toString());
        }
      }
    );
  }

  /**
   * <buy-form> — submits the add-to-cart form over fetch.
   */
  if (!customElements.get('buy-form')) {
    customElements.define(
      'buy-form',
      class BuyForm extends HTMLElement {
        connectedCallback() {
          this.form = this.querySelector('form');
          if (!this.form) return;
          this.button = this.querySelector('[data-add-button]');
          this.errorBox = this.querySelector('[data-form-error]');
          this.form.addEventListener('submit', this.onSubmit.bind(this));
        }

        onSubmit(event) {
          event.preventDefault();
          if (!this.button || this.button.disabled) return;

          this.setBusy(true);
          if (this.errorBox) this.errorBox.hidden = true;

          window.themeCart
            .add(new FormData(this.form))
            .catch(
              function (error) {
                var message = (error && (error.description || error.message)) || strings.cartError;
                if (this.errorBox) {
                  this.errorBox.textContent = message;
                  this.errorBox.hidden = false;
                } else {
                  window.themeToast(message);
                }
              }.bind(this)
            )
            .finally(
              function () {
                this.setBusy(false);
              }.bind(this)
            );
        }

        setBusy(state) {
          if (!this.button) return;
          this.button.classList.toggle('is-loading', state);
          this.button.setAttribute('aria-busy', String(state));
          var spinner = this.button.querySelector('.spinner');
          if (spinner) spinner.hidden = !state;
        }
      }
    );
  }

  /**
   * Quick add buttons on product cards. Single-variant products add straight
   * to the bag; multi-variant products send the shopper to the product page.
   */
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-quick-add]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    var id = button.dataset.quickAdd;
    if (!id) return;

    button.classList.add('is-loading');
    button.disabled = true;

    var body = new FormData();
    body.append('id', id);
    body.append('quantity', 1);

    window.themeCart
      .add(body)
      .catch(function (error) {
        window.themeToast((error && error.description) || strings.cartError);
      })
      .finally(function () {
        button.classList.remove('is-loading');
        button.disabled = false;
      });
  });

  /**
   * Product gallery thumbnails.
   */
  document.addEventListener('click', function (event) {
    var thumb = event.target.closest('[data-thumb-id]');
    if (!thumb) return;
    event.preventDefault();
    var id = thumb.dataset.thumbId;

    document.querySelectorAll('[data-media-id]').forEach(function (media) {
      media.hidden = media.dataset.mediaId !== id;
    });
    document.querySelectorAll('[data-thumb-id]').forEach(function (other) {
      other.classList.toggle('is-active', other === thumb);
    });
  });

  /**
   * Click-to-zoom lightbox for product media.
   */
  document.addEventListener('click', function (event) {
    var media = event.target.closest('[data-zoom]');
    if (!media) return;
    var img = media.querySelector('img');
    if (!img) return;

    var modal = document.getElementById('MediaZoom');
    if (!modal) return;
    var slot = modal.querySelector('[data-zoom-target]');
    if (slot) {
      slot.innerHTML = '';
      var clone = img.cloneNode(true);
      clone.removeAttribute('loading');
      clone.className = '';
      clone.style.width = '100%';
      slot.appendChild(clone);
    }
    if (typeof modal.open === 'function') modal.open();
  });

  /**
   * Colour swatch preview on collection cards — swaps the card image.
   */
  document.addEventListener('mouseover', function (event) {
    var swatch = event.target.closest('[data-swatch-image]');
    if (!swatch) return;
    var card = swatch.closest('.card');
    if (!card) return;
    var img = card.querySelector('[data-card-primary]');
    if (!img) return;
    if (!img.dataset.originalSrc) img.dataset.originalSrc = img.currentSrc || img.src;
    img.src = swatch.dataset.swatchImage;
    img.removeAttribute('srcset');
  });

  document.addEventListener('mouseleave', function (event) {
    if (!event.target.closest) return;
    var card = event.target.closest && event.target.closest('.card');
    if (!card) return;
    var img = card.querySelector('[data-card-primary]');
    if (img && img.dataset.originalSrc) img.src = img.dataset.originalSrc;
  }, true);

  /**
   * Sticky mobile buy bar appears once the main form scrolls away.
   */
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.querySelector('[data-sticky-buy]');
    var anchor = document.querySelector('[data-buy-form]');
    if (!bar || !anchor || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        bar.classList.toggle('is-visible', !entries[0].isIntersecting);
      },
      { rootMargin: '-120px 0px 0px 0px' }
    );
    observer.observe(anchor);
  });
})();
