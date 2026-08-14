/* ==========================================================================
   Sayso Style — predictive search
   Debounced suggestions with keyboard navigation.
   ========================================================================== */

(function () {
  'use strict';

  var utils = window.themeUtils;
  var routes = (window.theme && window.theme.routes) || {};

  if (!customElements.get('predictive-search')) {
    customElements.define(
      'predictive-search',
      class PredictiveSearch extends HTMLElement {
        connectedCallback() {
          this.input = this.querySelector('input[type="search"]');
          this.results = this.querySelector('[data-search-results]');
          this.empty = this.querySelector('[data-search-empty]');
          this.defaults = this.querySelector('[data-search-default]');
          if (!this.input || !this.results) return;

          this.cache = {};
          this.selectedIndex = -1;

          this.input.addEventListener('input', utils.debounce(this.onInput.bind(this), 260));
          this.input.addEventListener('keydown', this.onKeydown.bind(this));

          var clear = this.querySelector('[data-search-clear]');
          if (clear) {
            clear.addEventListener(
              'click',
              function () {
                this.input.value = '';
                this.reset();
                this.input.focus();
              }.bind(this)
            );
          }
        }

        reset() {
          this.results.innerHTML = '';
          this.results.hidden = true;
          if (this.empty) this.empty.hidden = true;
          if (this.defaults) this.defaults.hidden = false;
          this.selectedIndex = -1;
        }

        onInput() {
          var query = this.input.value.trim();
          if (query.length < 2) {
            this.reset();
            return;
          }

          if (this.cache[query]) {
            this.render(this.cache[query], query);
            return;
          }

          this.results.classList.add('is-loading');

          var url =
            routes.predictiveSearch +
            '?q=' +
            encodeURIComponent(query) +
            '&resources[type]=product,collection,article,page' +
            '&resources[limit]=6' +
            '&resources[options][unavailable_products]=last' +
            '&section_id=predictive-search';

          fetch(url)
            .then(function (res) {
              if (!res.ok) throw new Error('Search failed');
              return res.text();
            })
            .then(
              function (html) {
                this.cache[query] = html;
                this.render(html, query);
              }.bind(this)
            )
            .catch(
              function () {
                this.reset();
              }.bind(this)
            )
            .finally(
              function () {
                this.results.classList.remove('is-loading');
              }.bind(this)
            );
        }

        render(html, query) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var payload = doc.querySelector('[data-predictive-results]');

          this.results.innerHTML = payload ? payload.innerHTML : '';
          this.results.hidden = false;
          if (this.defaults) this.defaults.hidden = true;

          var hasResults = this.results.querySelector('.search-suggestion');
          if (this.empty) {
            this.empty.hidden = !!hasResults;
            var term = this.empty.querySelector('[data-search-term]');
            if (term) term.textContent = query;
          }

          this.selectedIndex = -1;
        }

        get options() {
          return Array.prototype.slice.call(this.results.querySelectorAll('.search-suggestion'));
        }

        onKeydown(event) {
          var options = this.options;

          if (event.key === 'Escape') {
            this.reset();
            this.input.blur();
            return;
          }

          if (!options.length) return;

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            var direction = event.key === 'ArrowDown' ? 1 : -1;
            this.selectedIndex = (this.selectedIndex + direction + options.length) % options.length;

            options.forEach(
              function (option, index) {
                option.setAttribute('aria-selected', String(index === this.selectedIndex));
              }.bind(this)
            );
            options[this.selectedIndex].scrollIntoView({ block: 'nearest' });
          }

          if (event.key === 'Enter' && this.selectedIndex > -1) {
            event.preventDefault();
            options[this.selectedIndex].click();
          }
        }
      }
    );
  }

  /* Search panel open/close, wired to the header button. */
  document.addEventListener('DOMContentLoaded', function () {
    var panel = document.getElementById('SearchPanel');
    if (!panel) return;

    var input = panel.querySelector('input[type="search"]');

    function open() {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      window.themeScrim.show(close);
      setTimeout(function () {
        if (input) input.focus();
      }, 200);
    }

    function close() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      window.themeScrim.hide();
    }

    document.querySelectorAll('[data-search-open]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        open();
      });
    });

    panel.querySelectorAll('[data-search-close]').forEach(function (button) {
      button.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) close();
      // Cmd/Ctrl+K opens search from anywhere.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        panel.classList.contains('is-open') ? close() : open();
      }
    });
  });
})();
