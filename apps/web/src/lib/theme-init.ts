// 在 hydration 之前执行，避免首屏主题闪烁（FOUC）。
// 读取顺序：localStorage > 系统偏好 > 浅色；展示效果默认 comfortable。
export const themeInitScript = `(function(){try{
  var stored=localStorage.getItem('theme');
  var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';
  var dark=theme==='dark'||(theme==='system'&&prefersDark);
  if(dark)document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  var density=localStorage.getItem('density');
  // 三档都要写入属性：comfortable 也有显式的根字号规则，缺省会让浏览器默认字号生效
  document.documentElement.dataset.density=(density==='compact'||density==='spacious')?density:'comfortable';
}catch(e){}})();`;
