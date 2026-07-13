(function () {
  function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const btnHamburger = document.querySelector('.btn-hamburger');

    if (!sidebar || !overlay || !btnHamburger) return;

    function open() {
      sidebar.classList.add('open');
      overlay.classList.add('show');
      btnHamburger.setAttribute('aria-expanded', 'true');
    }

    function close() {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      btnHamburger.setAttribute('aria-expanded', 'false');
    }

    btnHamburger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? close() : open();
    });

    overlay.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    const tabletQuery = window.matchMedia('(max-width: 1024px)');
    tabletQuery.addEventListener('change', function (event) {
      if (!event.matches) close();
    });

    btnHamburger.setAttribute('aria-expanded', 'false');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }
})();
