// newsletter-signup.js
// Muestra mensajes de éxito/error tras el envío del formulario de suscripción
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.newsletter-form');
    if (!form) return;
    var message = form.querySelector('.newsletter-message');
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        message.textContent = 'Por favor ingresa un correo válido.';
        message.style.color = '#d7263d';
        e.preventDefault();
        return;
      }
      message.textContent = '¡Gracias por suscribirte!';
      message.style.color = '#007b5e';
      // El formulario se envía normalmente a Shopify
    });
  });
})();
