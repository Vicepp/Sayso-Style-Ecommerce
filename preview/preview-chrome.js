/* ==========================================================================
   Static preview only — NOT part of the theme.

   Injects the shared page furniture (announcement bar, header, nav drawers,
   cart drawer, footer) into every preview page, so the pages themselves only
   have to contain their own <main> content.

   In the real theme this markup comes from sections/header-group.json,
   sections/footer-group.json and snippets/cart-drawer.liquid, rendered by
   Liquid. Here it is hand-written to match.

   Load order matters: this file is deferred and runs BEFORE theme.js, so the
   custom elements it writes are upgraded as soon as theme.js defines them.
   ========================================================================== */

(function () {
  'use strict';

  // theme.js reads this global. layout/theme.liquid emits it in the real theme.
  window.theme = {
    cartType: 'drawer',
    moneyFormat: '${{amount}}',
    freeShipping: { enabled: true, threshold: 15000 },
    routes: {},
    strings: {
      addToCart: 'Add to bag',
      soldOut: 'Sold out',
      unavailable: 'Unavailable',
      added: 'Added to your bag'
    },
    motion: {
      enabled: true,
      style: 'rise',
      duration: 700,
      pageTransition: false, // real navigations between static files
      parallax: true,
      stickyHeader: true
    }
  };

  var PAGES = [
    ['index.html', 'Home'],
    ['collection.html', 'Collection'],
    ['product.html', 'Product'],
    ['collections.html', 'Collections'],
    ['cart.html', 'Cart'],
    ['search.html', 'Search'],
    ['blog.html', 'Journal'],
    ['article.html', 'Article'],
    ['about.html', 'About'],
    ['contact.html', 'Contact'],
    ['faq.html', 'FAQ'],
    ['login.html', 'Login'],
    ['account.html', 'Account'],
    ['404.html', '404'],
    ['password.html', 'Password']
  ];

  var here = window.location.pathname.split('/').pop() || 'index.html';

  function icon(paths, extra) {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-linecap="round" stroke-linejoin="round"' +
      (extra || '') +
      '>' +
      paths +
      '</svg>'
    );
  }

  var ICONS = {
    menu: icon('<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/>'),
    close: icon('<path d="m5.5 5.5 13 13M18.5 5.5l-13 13"/>'),
    search: icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
    account: icon('<circle cx="12" cy="8.5" r="3.75"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
    cart: icon('<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    down: icon('<path d="m6 9.5 6 6 6-6"/>'),
    right: icon('<path d="M4 12h15.5M13.5 6l6 6-6 6"/>'),
    left: icon('<path d="M20 12H4.5M10.5 6l-6 6 6 6"/>'),
    plus: icon('<path d="M12 5v14M5 12h14"/>'),
    minus: icon('<path d="M5 12h14"/>')
  };

  var SOCIAL =
    '<ul class="social-list">' +
    '<li><a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 4.9a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm6.2-8.3a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z"/></svg></a></li>' +
    '<li><a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 2.5h-3v13.1a2.6 2.6 0 1 1-2.2-2.57v-3.05a5.65 5.65 0 1 0 5.2 5.62V9.2a6.6 6.6 0 0 0 3.9 1.26V7.4a3.75 3.75 0 0 1-3.9-3.6v-1.3Z"/></svg></a></li>' +
    '<li><a href="#" aria-label="Pinterest"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2a9.8 9.8 0 0 0-3.6 18.9c-.08-.8-.15-2.03.03-2.9.17-.8 1.1-5.05 1.1-5.05s-.28-.56-.28-1.4c0-1.3.76-2.28 1.7-2.28.8 0 1.19.6 1.19 1.33 0 .8-.52 2.02-.78 3.14-.22.94.47 1.7 1.4 1.7 1.67 0 2.96-1.77 2.96-4.32 0-2.26-1.62-3.84-3.94-3.84a4.09 4.09 0 0 0-4.26 4.1c0 .81.31 1.68.7 2.15.08.1.09.18.07.28-.07.3-.24.94-.27 1.07-.04.17-.14.21-.32.13-1.2-.56-1.95-2.3-1.95-3.7 0-3.02 2.19-5.79 6.32-5.79 3.32 0 5.9 2.36 5.9 5.52 0 3.3-2.08 5.95-4.96 5.95-.97 0-1.88-.5-2.19-1.1l-.6 2.28c-.21.83-.79 1.87-1.18 2.5A9.8 9.8 0 1 0 12 2.2Z"/></svg></a></li>' +
    '</ul>';

  /* ------------------------------------------------------- preview bar */

  function previewBar() {
    return (
      '<nav class="preview-bar" aria-label="Preview pages">' +
      PAGES.map(function (p) {
        return '<a href="' + p[0] + '"' + (p[0] === here ? ' class="is-current"' : '') + '>' + p[1] + '</a>';
      }).join('') +
      '</nav>'
    );
  }

  /* ------------------------------------------------------------- header */

  function header(transparent) {
    return (
      '<announcement-bar class="announcement scheme-dark" data-rotate="true" data-speed="5">' +
      '<div class="page-width"><div class="announcement__viewport">' +
      '<div class="announcement__slide is-active"><span>Complimentary shipping on orders over $150</span></div>' +
      '<div class="announcement__slide"><a class="hover-line" href="collection.html">New season knitwear — now in store</a></div>' +
      '<div class="announcement__slide"><span>30 day returns, no questions asked</span></div>' +
      '<button class="announcement__nav announcement__nav--prev" type="button" data-announcement-prev aria-label="Previous announcement">' +
      ICONS.left +
      '</button>' +
      '<button class="announcement__nav announcement__nav--next" type="button" data-announcement-next aria-label="Next announcement">' +
      ICONS.right +
      '</button>' +
      '</div></div></announcement-bar>' +
      '<sticky-header><header class="site-header' +
      (transparent ? ' site-header--transparent' : '') +
      '" role="banner"><div class="page-width"><div class="header header--center">' +
      '<div class="header__left">' +
      '<button class="icon-btn header__burger" type="button" data-drawer-open="MenuDrawer" aria-label="Open menu">' +
      ICONS.menu +
      '</button>' +
      '<nav class="header__nav" aria-label="Primary">' +
      '<div class="nav__item has-mega">' +
      '<a class="nav__link hover-line" href="collection.html">Shop' +
      ICONS.down +
      '</a>' +
      '<div class="mega-menu mega-menu--wide">' +
      '<div><p class="mega-menu__heading">Womenswear</p>' +
      '<a class="mega-menu__link" href="collection.html">Knitwear</a>' +
      '<a class="mega-menu__link" href="collection.html">Shirting</a>' +
      '<a class="mega-menu__link" href="collection.html">Trousers</a>' +
      '<a class="mega-menu__link" href="collection.html">Dresses</a></div>' +
      '<div><p class="mega-menu__heading">Menswear</p>' +
      '<a class="mega-menu__link" href="collection.html">Knitwear</a>' +
      '<a class="mega-menu__link" href="collection.html">Shirting</a>' +
      '<a class="mega-menu__link" href="collection.html">Outerwear</a></div>' +
      '<div><p class="mega-menu__heading">By fabric</p>' +
      '<a class="mega-menu__link" href="collection.html">Linen</a>' +
      '<a class="mega-menu__link" href="collection.html">Merino</a>' +
      '<a class="mega-menu__link" href="collection.html">Organic cotton</a></div>' +
      '<div class="mega-menu__promo">' +
      '<a href="collection.html" class="zoom-media media media--portrait" style="display:block;">' +
      '<img src="../assets/collection-1.jpg" alt="Knitwear" loading="lazy" width="600" height="800"></a>' +
      '<a class="link-arrow" href="collection.html" style="margin-top:1rem;">New in' +
      ICONS.right +
      '</a></div>' +
      '</div></div>' +
      '<div class="nav__item"><a class="nav__link hover-line" href="collections.html">Collections</a></div>' +
      '<div class="nav__item"><a class="nav__link hover-line" href="blog.html">Journal</a></div>' +
      '<div class="nav__item"><a class="nav__link hover-line" href="about.html">About</a></div>' +
      '</nav></div>' +
      '<div class="header__logo"><a href="index.html">Sayso Style</a></div>' +
      '<div class="header__actions">' +
      '<a class="icon-btn" href="search.html" aria-label="Open search">' +
      ICONS.search +
      '</a>' +
      '<a class="icon-btn" href="login.html" aria-label="Account">' +
      ICONS.account +
      '</a>' +
      '<button class="icon-btn" type="button" data-drawer-open="CartDrawer" aria-label="Open bag">' +
      ICONS.cart +
      '<span class="cart-count" data-cart-count>2</span></button>' +
      '</div>' +
      '</div></div></header></sticky-header>'
    );
  }

  /* ------------------------------------------------------------ drawers */

  function drawers() {
    return (
      '<drawer-element id="MenuDrawer"><aside class="drawer drawer--left" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">' +
      '<header class="drawer__head"><span class="drawer__title">Menu</span>' +
      '<button class="icon-btn" type="button" data-drawer-close aria-label="Close menu">' +
      ICONS.close +
      '</button></header>' +
      '<mobile-nav class="mobile-nav">' +
      '<div class="mobile-nav__item">' +
      '<button class="mobile-nav__link" type="button" data-submenu-toggle aria-expanded="false"><span>Shop</span>' +
      ICONS.down +
      '</button>' +
      '<div class="mobile-nav__sub" hidden>' +
      '<a class="mobile-nav__link" href="collection.html">Knitwear</a>' +
      '<a class="mobile-nav__link" href="collection.html">Shirting</a>' +
      '<a class="mobile-nav__link" href="collection.html">Coats</a></div></div>' +
      '<div class="mobile-nav__item"><a class="mobile-nav__link" href="collections.html"><span>Collections</span>' +
      ICONS.right +
      '</a></div>' +
      '<div class="mobile-nav__item"><a class="mobile-nav__link" href="blog.html"><span>Journal</span>' +
      ICONS.right +
      '</a></div>' +
      '<div class="mobile-nav__item"><a class="mobile-nav__link" href="about.html"><span>About</span>' +
      ICONS.right +
      '</a></div>' +
      '<div class="mobile-nav__item"><a class="mobile-nav__link" href="contact.html"><span>Contact</span>' +
      ICONS.right +
      '</a></div>' +
      '</mobile-nav>' +
      '<div class="mobile-nav__footer">' +
      '<a class="link-arrow" href="login.html">Log in' +
      ICONS.right +
      '</a>' +
      SOCIAL +
      '</div></aside></drawer-element>' +
      '<drawer-element id="CartDrawer"><aside class="drawer drawer--right cart-drawer" role="dialog" aria-modal="true" aria-label="Your bag" aria-hidden="true">' +
      '<header class="drawer__head"><h2 class="drawer__title">Your bag</h2>' +
      '<button class="icon-btn" type="button" data-drawer-close aria-label="Close">' +
      ICONS.close +
      '</button></header>' +
      '<div class="cart-drawer__body" data-drawer-stagger>' +
      '<div class="ship-bar"><span>You are $79.00 away from complimentary shipping</span>' +
      '<span class="ship-bar__track"><span class="ship-bar__fill" style="width:47%"></span></span></div>' +
      '<ul>' +
      lineItem('gallery-2.jpg', 'The Merino Crew', 'Charcoal / M', '$185.00') +
      lineItem('gallery-4.jpg', 'Linen Shirt, Oversized', 'Chalk / S', '$116.00') +
      '</ul></div>' +
      '<div class="cart-drawer__foot">' +
      '<div class="cart-totals"><div class="cart-totals__row cart-totals__row--total">' +
      '<span>Subtotal</span><span>$301.00 USD</span></div></div>' +
      '<div class="rte text-sm text-muted"><p>Shipping and taxes calculated at checkout.</p></div>' +
      '<button type="button" class="btn btn--full">Checkout</button>' +
      '<a class="btn btn--secondary btn--full" href="cart.html">View bag</a>' +
      '</div></aside></drawer-element>' +
      '<div class="scrim" data-scrim hidden></div>' +
      '<div class="visually-hidden" aria-live="polite" role="status" data-live-region></div>'
    );
  }

  function lineItem(img, title, variant, price) {
    return (
      '<li class="line-item">' +
      '<span class="line-item__media media media--portrait">' +
      '<img src="../assets/' +
      img +
      '" alt="" loading="lazy" width="220" height="290"></span>' +
      '<div class="line-item__info">' +
      '<a class="line-item__title" href="product.html">' +
      title +
      '</a>' +
      '<span class="line-item__variant">' +
      variant +
      '</span>' +
      '<div class="line-item__foot">' +
      '<quantity-input class="qty">' +
      '<button type="button" name="minus" aria-label="Decrease quantity">' +
      ICONS.minus +
      '</button>' +
      '<input type="number" value="1" min="0">' +
      '<button type="button" name="plus" aria-label="Increase quantity">' +
      ICONS.plus +
      '</button></quantity-input>' +
      '<div class="stack" style="gap:0.2rem;align-items:flex-end;">' +
      '<span class="text-sm">' +
      price +
      '</span>' +
      '<button type="button" class="line-item__remove">Remove</button>' +
      '</div></div></div></li>'
    );
  }

  /* ------------------------------------------------------------- footer */

  function footer() {
    return (
      '<section class="section--flush scheme-light" style="padding-top:48px;padding-bottom:48px;">' +
      '<div class="page-width"><div class="grid grid--4" data-reveal-group>' +
      trust(
        '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 10h4l3 3v2.5h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
        'Carbon-neutral delivery',
        'Complimentary over $150, worldwide.'
      ) +
      trust(
        '<path d="M3.5 8.5h11a5.5 5.5 0 0 1 0 11H9"/><path d="m7.5 4.5-4 4 4 4"/>',
        '30 day returns',
        'Unworn, with tags, no questions.'
      ) +
      trust(
        '<path d="M20 4c0 9-5.5 14-12 14a6 6 0 0 1 0-12c4 0 7-1 12-2Z"/><path d="M4.5 19.5C8 15 12 12 17 9.5"/>',
        'Natural fibres',
        'Certified linen, wool and cotton.'
      ) +
      trust(
        '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
        'Made to last',
        'Repairs offered for life.'
      ) +
      '</div></div></section>' +
      '<footer class="site-footer scheme-dark">' +
      '<div class="page-width"><div class="footer__top" data-reveal-group>' +
      '<div data-reveal="rise"><p class="footer__heading">Shop</p><nav>' +
      '<a class="footer__link" href="collection.html">New in</a>' +
      '<a class="footer__link" href="collection.html">Knitwear</a>' +
      '<a class="footer__link" href="collection.html">Shirting</a>' +
      '<a class="footer__link" href="collection.html">Coats</a>' +
      '<a class="footer__link" href="collections.html">All collections</a></nav></div>' +
      '<div data-reveal="rise"><p class="footer__heading">The house</p>' +
      '<div class="rte text-sm text-muted" style="max-width:34ch;"><p>Sayso Style is a small studio making quiet, durable clothing in limited runs. Everything is cut in low volumes from deadstock and certified natural fibres.</p></div></div>' +
      '<div data-reveal="rise"><p class="footer__heading">Visit</p><div class="stack" style="gap:0.9rem;">' +
      '<span class="text-sm text-muted">18 Marlow Yard, London E2</span>' +
      '<a class="footer__link" href="contact.html">hello@saysostyle.com</a>' +
      '<a class="footer__link" href="contact.html">+44 20 7946 0812</a>' +
      '<span class="text-sm text-muted">Thu–Sun, 11am–6pm</span></div></div>' +
      '<div data-reveal="rise"><p class="footer__heading">Letters</p>' +
      '<div class="rte text-sm text-muted" style="max-width:36ch;margin-bottom:1.6rem;"><p>Occasional notes on new work, restocks and studio sales.</p></div>' +
      '<form class="newsletter-form" onsubmit="return false;">' +
      '<label class="visually-hidden" for="FooterNL">Email address</label>' +
      '<input id="FooterNL" class="input" type="email" placeholder="your@email.com">' +
      '<button class="btn" type="submit">Sign up</button></form></div>' +
      '</div>' +
      '<div class="footer__bottom">' +
      '<div class="row row--wrap" style="gap:1.6rem 2.4rem;"><span>&copy; 2026 Sayso Style. All rights reserved.</span></div>' +
      '<div class="row row--wrap">' +
      SOCIAL +
      '</div></div></div></footer>'
    );
  }

  function trust(paths, heading, text) {
    return (
      '<div class="row" style="gap:1.4rem;align-items:flex-start;" data-reveal="rise">' +
      '<span style="flex-shrink:0;width:2.6rem;color:var(--c-accent);">' +
      icon(paths, ' style="width:2.6rem;height:2.6rem;stroke-width:1.2;"') +
      '</span><span class="stack" style="gap:0.3rem;">' +
      '<span style="font-size:1.45rem;">' +
      heading +
      '</span>' +
      '<span class="text-sm text-muted">' +
      text +
      '</span></span></div>'
    );
  }

  /* --------------------------------------------------------------- mount */

  var flag =
    '<aside class="preview-flag" id="PreviewFlag"><b>Static preview</b>' +
    'Real CSS and real theme.js. Markup is hand-written, not Liquid — cart, ' +
    'search and checkout are inert.' +
    '<button type="button" onclick="document.getElementById(\'PreviewFlag\').remove()">dismiss</button></aside>';

  var main = document.querySelector('main');
  var transparent = document.body.hasAttribute('data-transparent-header');

  main.insertAdjacentHTML('beforebegin', previewBar() + header(transparent));
  main.insertAdjacentHTML('afterend', footer() + drawers() + flag);
})();
