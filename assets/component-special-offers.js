// Contador de oferta limitada (ejemplo: 1 hora)
function startOfferTimer(duration, display, warning) {
  var timer = duration,
    hours,
    minutes,
    seconds;
  setInterval(function () {
    var days = parseInt(timer / 86400, 10);
    hours = parseInt((timer % 86400) / 3600, 10);
    minutes = parseInt((timer % 3600) / 60, 10);
    seconds = parseInt(timer % 60, 10);
    days = days < 10 ? '0' + days : days;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    display.textContent = days + 'd : ' + hours + 'h : ' + minutes + 'm : ' + seconds + 's';

    if (timer <= 300 && timer > 0) {
      warning.textContent = '¡La oferta está por expirar!';
      warning.style.display = 'block';
    } else {
      warning.textContent = '';
      warning.style.display = 'none';
    }
    if (--timer < 0) {
      timer = 0;
      display.textContent = '00d : 00h : 00m : 00s';
      warning.textContent = 'La oferta ha expirado.';
      warning.style.display = 'block';
    }
  }, 1000);
}
document.addEventListener('DOMContentLoaded', function () {
  var offerTimers = document.querySelectorAll('.offer-timer');
  var offerWarnings = document.querySelectorAll('.offer-warning');

  offerTimers.forEach((display, index) => {
    var warning = offerWarnings[index];
    if (display && warning) {
      // Si está en productos populares, usar 2 días por defecto
      var duration = 2 * 24 * 60 * 60; // 2 días en segundos
      startOfferTimer(duration, display, warning);
    }
  });
});
