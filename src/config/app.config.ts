export default () => ({
  app: {
    name: process.env.APP_NAME || 'OFNA Depannage API',
    port: parseInt(process.env.APP_PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',
    frontendMobileUrl: process.env.FRONTEND_MOBILE_URL || '',
    frontendWebUrl: process.env.FRONTEND_WEB_URL || '',
  },
});
