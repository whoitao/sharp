// 在 hydration 之前执行，避免首屏主题闪烁（FOUC）。
// 读取顺序：localStorage > 系统偏好 > 浅色。
export const themeInitScript = `(function(){try{
  var stored=localStorage.getItem('theme');
  var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme=stored||(prefersDark?'dark':'light');
  if(theme==='dark')document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}catch(e){}})();`;
