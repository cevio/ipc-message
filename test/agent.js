const IPCMessage = require('../index');

class Agent extends IPCMessage {
  constructor() {
    super(true);
    this.timer = setInterval(() => {
      console.log('agent alive');
    }, 1000);

    process.on('SIGINT', () => {
      clearInterval(this.timer);
      process.exit(0);
    });
  }

  onMessageReceive(msg) {
    console.log('[Agent] onMessageReceive:', msg);
    this.send([msg.from, 'master'], '/reply/agent', 'done');
  }
}

const agent = new Agent();

agent.send('master', '/agent/ready', { a: 1, b: 2 });