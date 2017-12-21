const IPCMessage = require('../index');
const ChildProcess = require('child_process');
const path = require('path');
const cluster = require('cluster');
const Koa = require('koa');
const os = require('os');

class Nodebase extends IPCMessage {
  constructor() {
    super();
    if (this.type === 'master') {
      const agentWorkerRuntimeFile = path.resolve(__dirname, 'agent.js');
      const agent = ChildProcess.fork(agentWorkerRuntimeFile, null, {
        cwd: process.cwd(),
        stdout: process.stdout,
        stderr: process.stderr,
        stdin: process.stdin,
        stdio: process.stdio
      });
      this.registAgent('agent', agent);

      let cpus = os.cpus().length;
      while (cpus--) {
        cluster.fork();
      }
    } else {
      const app = new Koa();
      app.use(async (ctx, next) => {
        if (ctx.req.url === '/favicon.ico') return;
        this.send('agent', '/test/agent', { a:1, c:3 });
        ctx.body = 'hello world';
      });
      app.listen(3000, () => {
        console.log('server start at 3000');
      });
    }
  }

  onMessageReceive(msg) {
    console.log(`[${this.type}] onMessageReceive:`, msg);
  }
}

const nodebase = new Nodebase();