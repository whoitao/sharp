/** 卡片阴影只给浅色：深色下 elevation 会变成一圈黑边，层级改用边线表达 */
export const cardShadow = (isDark: boolean) =>
  isDark
    ? null
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
      };
