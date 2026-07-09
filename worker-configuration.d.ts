interface Env {}

declare module '../build/server/index.js' {
  const serverBuild: unknown;
  export default serverBuild;
}
