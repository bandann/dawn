// component-popular-products.js
// Animaciones de entrada para los items de "Productos Populares" y mejoras accesibles.
(function () {
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var items = document.querySelectorAll('.popular-products__item');
    if (!items || items.length === 0) return;

    // Añade la clase 'in-view' cuando el elemento entra en viewport
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });

    // Mejora de accesibilidad: al enfocar el enlace, asegurarse de mostrar la animación
    var links = document.querySelectorAll('.popular-products__item a');
    links.forEach(function (link) {
      link.addEventListener('focus', function (e) {
        var parent = e.target.closest('.popular-products__item');
        if (parent) parent.classList.add('in-view');
      });
    });
  });
})();
