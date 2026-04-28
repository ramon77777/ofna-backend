export default () => ({
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || '*',
  },
});