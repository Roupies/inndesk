(function () {
  function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const btnHamburger = document.querySelector('.btn-hamburger');

    if (!sidebar || !overlay || !btnHamburger) return;

    function open() {
      sidebar.classList.add('open');
      overlay.classList.add('show');
    }

    function close() {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    }

    btnHamburger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? close() : open();
    });

    overlay.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }
})();
