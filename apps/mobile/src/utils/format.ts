/** 题量等大数字加千分位：10777 → 10,777 */
export const formatCount = (num: number): string =>
  String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
