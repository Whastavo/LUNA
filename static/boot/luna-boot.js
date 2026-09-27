/* Arranque de Luna: se ejecuta como script externo síncrono desde <head>,
   antes del primer paint (mismas garantías que un script inline, sin ensuciar
   el HTML servido). Dos responsabilidades:

   1. Tema — aplica la clase `dark` antes de que exista el DOM: sin flash de
      color equivocado en el primer frame.
   2. Fondo de arranque — pinta la escena persistida (imagen/sólido/gradiente)
      como overlay fijo mientras la app hidrata; cuando el body existe, la
      misma escena pasa al fondo del body, debajo del chrome de la app, que
      funde encima: cero frames negros en toda la secuencia. */

(function () {
	var modo = localStorage.getItem('colorMode') || 'system';
	var oscuro =
		modo === 'system'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: modo === 'dark';
	if (oscuro) document.documentElement.classList.add('dark');
})();

(function () {
	try {
		// SOLO la app: el fondo persistido es el escenario del companion.
		// En la landing el overlay mostraba el fondo de la app y al hidratar
		// quedaba el flash (la landing es clara, el fondo oscuro) — el usuario
		// veía "un flash de /app" recargando desde la landing.
		var path = location.pathname;
		var enApp = path === '/app' || path.indexOf('/app/') === 0 || path.indexOf('/app?') === 0;
		if (!enApp) return;
		var fondo = JSON.parse(localStorage.getItem('luna-display') || '{}').sceneBackground;
		var css = null;
		if (fondo && typeof fondo.value === 'string') {
			if (fondo.type === 'image' && fondo.value.indexOf('/luna/scenes/') === 0) {
				css = 'url("' + fondo.value + '") center center / cover no-repeat';
				new Image().src = fondo.value;
			} else if (fondo.type === 'solid') {
				css = fondo.value;
			} else if (fondo.type === 'gradient') {
				var p = fondo.value.split(',');
				css =
					'linear-gradient(to bottom, ' +
					(p[0] || '#fff').trim() +
					', ' +
					(p[1] || p[0] || '#fff').trim() +
					')';
			}
		}
		if (css) {
			var boot = document.createElement('div');
			boot.id = 'luna-boot-bg';
			boot.style.cssText =
				'position:fixed;inset:0;z-index:0;pointer-events:none;background:' + css;
			(document.body || document.documentElement).appendChild(boot);
			var mover = function () {
				if (document.body) document.body.style.background = css;
				var el = document.getElementById('luna-boot-bg');
				if (el && el.parentNode) el.parentNode.removeChild(el);
			};
			if (document.body) mover();
			else document.addEventListener('DOMContentLoaded', mover);
		}
	} catch (e) {
		/* ajustes corruptos: ignorar */
	}
})();
