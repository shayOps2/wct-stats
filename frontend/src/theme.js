import { theme as antTheme } from 'antd';

export const getTheme = (isDark) => ({
  token: {
    colorPrimary: '#1890ff',
    colorBgBase: isDark ? '#141414' : '#ffffff',
    colorTextBase: isDark ? '#ffffff' : '#000000',
    colorTextSecondary: isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
    colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
    colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      bodyBg: isDark ? '#141414' : '#f0f2f5',
      headerBg: isDark ? '#1f1f1f' : '#001529',
      siderBg: isDark ? '#1f1f1f' : '#001529',
    },
    Card: {
      colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
      colorBorderSecondary: isDark ? '#303030' : '#f0f0f0',
    },
    Table: {
      colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
      colorTextHeading: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
    },
    Input: {
      colorBgContainer: isDark ? '#141414' : '#ffffff',
      colorBorder: isDark ? '#434343' : '#d9d9d9',
    },
    Select: {
      colorBgContainer: isDark ? '#141414' : '#ffffff',
      colorBorder: isDark ? '#434343' : '#d9d9d9',
      optionSelectedBg: isDark ? '#262626' : '#e6f7ff',
    },
  },
  algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
});
