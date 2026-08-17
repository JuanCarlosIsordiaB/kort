export const THEME_STORAGE_KEY = "kort-theme";

export type Theme = "light" | "dark";

/**
 * Corre en <head>, antes del primer pintado, para evitar el destello de tema
 * equivocado. Solo escribe `data-theme` si el usuario ya eligió: sin atributo,
 * el CSS sigue la preferencia del sistema por su cuenta.
 *
 * El try/catch cubre navegadores con localStorage bloqueado (modo privado,
 * cookies de terceros deshabilitadas).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
